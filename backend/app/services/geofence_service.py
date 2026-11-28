from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.terminal import Terminal
from app.models.vehicle import Vehicle
from app.models.geofence_event import GeofenceEvent
from app.enums import GeofenceEventType, VehicleActivityStatus


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
  trip. Updates the idle vehicle's loading status immediately from its
  current terminal-geofence position. Trip start independently validates a
  fresh GPS fix so a previous loading status cannot authorize departure."""

  now = datetime.now(timezone.utc)
  currently_inside = is_inside_geofence(latitude, longitude, terminal)
  last_event = _get_last_event(db, vehicle.vehicle_id, terminal.terminal_id)
  was_inside = last_event is not None and last_event.event_type == GeofenceEventType.ENTER

  result = {
    "currently_inside": currently_inside,
    "status_changed": False,
  }

  if currently_inside:
    if not was_inside:
      db.add(GeofenceEvent(
        vehicle_id=vehicle.vehicle_id,
        terminal_id=terminal.terminal_id,
        event_type=GeofenceEventType.ENTER,
        event_time=now,
      ))
      result["event"] = "entered"
    if vehicle.activity_status == VehicleActivityStatus.ACTIVE:
      vehicle.activity_status = VehicleActivityStatus.LOADING
      result["status_changed"] = True
      result["event"] = result.get("event", "loading")
    if db.new or db.dirty:
      db.commit()
    return result

  if was_inside:
    event = GeofenceEvent(
      vehicle_id=vehicle.vehicle_id,
      terminal_id=terminal.terminal_id,
      event_type=GeofenceEventType.EXIT,
      event_time=now,
    )
    db.add(event)
    if vehicle.activity_status == VehicleActivityStatus.LOADING:
      vehicle.activity_status = VehicleActivityStatus.ACTIVE
    db.commit()
    result["event"] = "exited"
    return result

  return result
