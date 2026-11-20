from datetime import datetime, timezone
from math import asin, cos, radians, sin, sqrt

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.enums import AuditAction, VehicleActivityStatus
from app.models.audit_log import AuditLog
from app.models.gps_log import GpsLog
from app.models.trip import Trip
from app.models.trip_pause_event import TripPauseEvent


def gps_distance_km(points: list[GpsLog]) -> float:
  """Sum plausible GPS segments, ignoring stationary drift and impossible jumps."""
  distance_km = 0.0
  ordered = sorted(points, key=lambda point: point.recorded_at)
  for previous, current in zip(ordered, ordered[1:]):
    lat1, lon1 = radians(float(previous.latitude)), radians(float(previous.longitude))
    lat2, lon2 = radians(float(current.latitude)), radians(float(current.longitude))
    dlat, dlon = lat2 - lat1, lon2 - lon1
    haversine = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlon / 2) ** 2
    segment_km = 6371.0088 * 2 * asin(sqrt(min(1.0, haversine)))
    elapsed_seconds = max(1.0, (current.recorded_at - previous.recorded_at).total_seconds())
    if segment_km >= 0.01 and segment_km / elapsed_seconds * 3600 <= 150:
      distance_km += segment_km
  return round(distance_km, 3)


def complete_trip(db: Session, trip: Trip, completed_at: datetime) -> None:
  """Finalize a trip and its derived metrics without committing the transaction."""
  if trip.is_complete:
    return

  if completed_at.tzinfo is None:
    completed_at = completed_at.replace(tzinfo=timezone.utc)
  departed = trip.time_departed
  if departed.tzinfo is None:
    departed = departed.replace(tzinfo=timezone.utc)

  trip.time_arrived = completed_at
  trip.trip_duration_minutes = round(max(0, (completed_at - departed).total_seconds()) / 60, 2)
  average_speed = (
    db.query(func.avg(GpsLog.speed_kmh))
    .filter(GpsLog.trip_id == trip.trip_id, GpsLog.speed_kmh >= 0, GpsLog.speed_kmh <= 150)
    .scalar()
  )
  trip.average_speed_km = round(average_speed, 2) if average_speed is not None else None
  points = db.query(GpsLog).filter(GpsLog.trip_id == trip.trip_id).order_by(GpsLog.recorded_at.asc()).all()
  trip.distance_traveled_km = gps_distance_km(points)
  trip.is_complete = True

  open_pauses = db.query(TripPauseEvent).filter(
    TripPauseEvent.trip_id == trip.trip_id,
    TripPauseEvent.resumed_at.is_(None),
  ).all()
  for pause in open_pauses:
    paused_at = pause.paused_at
    if paused_at.tzinfo is None:
      paused_at = paused_at.replace(tzinfo=timezone.utc)
    pause.resumed_at = max(completed_at, paused_at)

  if trip.vehicle is not None:
    trip.vehicle.activity_status = VehicleActivityStatus.ACTIVE


def record_automatic_completion(db: Session, trip: Trip, completed_at: datetime) -> None:
  db.add(AuditLog(
    actor_id=None,
    actor_type="system",
    action=AuditAction.UPDATE,
    target_table="trips",
    target_id=trip.trip_id,
    details="Trip automatically completed after reaching the 24-hour limit",
    outcome="success",
    context={"completed_at": completed_at.isoformat(), "reason": "24_hour_limit"},
  ))
