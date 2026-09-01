import os
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.terminal import Terminal
from app.models.vehicle import Vehicle
from app.models.geofence_event import GeofenceEvent
from app.enums import GeofenceEventType, VehicleActivityStatus

DWELL_THRESHOLD_SECONDS = int(os.getenv("GEOFENCE_DWELL_THRESHOLD_SECONDS", 45))


def is_inside_geofence(latitude: float, longitude: float, terminal: Terminal) -> bool:
  """Simple rectangular bounding-box containment check — matches the
  min/max lat-lng geofence shape, no PostGIS/Shapely needed."""
  return (
    terminal.min_latitude <= latitude <= terminal.max_latitude
    and terminal.min_longitude <= longitude <= terminal.max_longitude
  )


def _get_last_event(db: Session, vehicle_id: int, terminal_id: int) -> GeofenceEvent | None:
  return (
    db.query(GeofenceEvent)
    .filter(GeofenceEvent.vehicle_id == vehicle_id, GeofenceEvent.terminal_id == terminal_id)
    .order_by(GeofenceEvent.event_time.desc())
    .first()
  )


def process_vehicle_position(
  db: Session, vehicle: Vehicle, latitude: float, longitude: float, terminal: Terminal
) -> dict:
  """Called on every position report while a vehicle is NOT on an active
  trip. Detects geofence crossings and evaluates dwell time for the
  active -> loading transition. Does not touch trips/GPS logs at all —
  that's a separate concern handled once a trip actually starts."""

  now = datetime.now(timezone.utc)
  currently_inside = is_inside_geofence(latitude, longitude, terminal)
  last_event = _get_last_event(db, vehicle.vehicle_id, terminal.terminal_id)
  was_inside = last_event is not None and last_event.event_type == GeofenceEventType.ENTER

  result = {"currently_inside": currently_inside, "status_changed": False}

  if currently_inside and not was_inside:
    # Just crossed into the geofence — record the entry, don't act yet.
    # The dwell threshold decides whether this becomes a real "loading"
    # transition or just a pass-through/turnaround.
    event = GeofenceEvent(
      vehicle_id=vehicle.vehicle_id,
      terminal_id=terminal.terminal_id,
      event_type=GeofenceEventType.ENTER,
      event_time=now,
    )
    db.add(event)
    db.commit()
    result["event"] = "entered"
    return result

  if not currently_inside and was_inside:
    # Left the geofence before or after loading — either way, record exit.
    event = GeofenceEvent(
      vehicle_id=vehicle.vehicle_id,
      terminal_id=terminal.terminal_id,
      event_type=GeofenceEventType.EXIT,
      event_time=now,
    )
    db.add(event)
    db.commit()
    result["event"] = "exited"
    return result

  if currently_inside and was_inside:
    # Still inside since the last recorded entry — check dwell duration.
    entered_at = last_event.event_time
    if entered_at.tzinfo is None:
      entered_at = entered_at.replace(tzinfo=timezone.utc)

    elapsed_seconds = (now - entered_at).total_seconds()
    result["elapsed_seconds"] = elapsed_seconds

    if elapsed_seconds >= DWELL_THRESHOLD_SECONDS and vehicle.activity_status == VehicleActivityStatus.ACTIVE:
      vehicle.activity_status = VehicleActivityStatus.LOADING
      db.commit()
      result["status_changed"] = True
      result["event"] = "dwell_threshold_reached"

  return result