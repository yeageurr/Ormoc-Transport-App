from datetime import datetime, timezone
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload

from app.core.permissions import get_driver_profile, require_role
from app.database import get_db
from app.enums import AccountRole, TripStatus
from app.models.account import Account
from app.models.dispatch_log import DispatchLog
from app.models.gps_log import GpsLog
from app.models.trip import Trip
from app.models.user import User
from app.services.eta_prediction import predict_eta
from app.services.route_progress import remaining_route_distance_km

router = APIRouter()
PH = ZoneInfo("Asia/Manila")
MAX_FIX_AGE_SECONDS = 60


class EtaResponse(BaseModel):
  trip_id: int
  eta_minutes: float | None
  source: str
  remaining_distance_km: float | None
  location_recorded_at: datetime | None


@router.get("/trip/{trip_id}", response_model=EtaResponse)
def get_trip_eta(
  trip_id: int,
  db: Session = Depends(get_db),
  current_account: Account = Depends(require_role(AccountRole.DRIVER)),
):
  """Return a transparent distance/speed estimate for the Driver's active trip.

  This endpoint deliberately labels its estimate as a fallback. A trained
  model is not served until enough reviewed real trip data is available.
  """
  driver = get_driver_profile(db, current_account)
  trip = (
    db.query(Trip)
    .options(
      joinedload(Trip.route),
      joinedload(Trip.dispatch_log).joinedload(DispatchLog.route),
      joinedload(Trip.dispatch_log).joinedload(DispatchLog.driver),
    )
    .filter(Trip.trip_id == trip_id)
    .first()
  )
  if trip is None:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip not found")

  trip_driver: User | None = trip.dispatch_log.driver if trip.dispatch_log else trip.driver
  if trip_driver is None or trip_driver.user_id != driver.user_id:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip not found")
  if trip.is_complete:
    raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="ETA is only available for an active trip")

  route = trip.route or (trip.dispatch_log.route if trip.dispatch_log else None)
  if route is None or not route.route_geometry:
    return EtaResponse(
      trip_id=trip.trip_id,
      eta_minutes=None,
      source="unavailable",
      remaining_distance_km=None,
      location_recorded_at=None,
    )

  fix = (
    db.query(GpsLog)
    .filter(GpsLog.trip_id == trip.trip_id)
    .order_by(GpsLog.recorded_at.desc(), GpsLog.gps_log_id.desc())
    .first()
  )
  now = datetime.now(timezone.utc)
  if fix is None:
    return EtaResponse(trip.trip_id, None, "unavailable", None, None)
  recorded_at = fix.recorded_at
  if recorded_at.tzinfo is None:
    recorded_at = recorded_at.replace(tzinfo=timezone.utc)
  if (now - recorded_at.astimezone(timezone.utc)).total_seconds() > MAX_FIX_AGE_SECONDS:
    return EtaResponse(trip.trip_id, None, "unavailable", None, recorded_at)

  route_distance = float(route.distance or 0)
  progress = remaining_route_distance_km(
    route.route_geometry,
    float(fix.latitude),
    float(fix.longitude),
    route_distance,
    returning=trip.status == TripStatus.RETURNING,
  )
  if progress is None:
    return EtaResponse(trip.trip_id, None, "unavailable", None, recorded_at)

  remaining_km, _snap_distance_m = progress
  average_duration_minutes = float(route.average_travel_duration or 0)
  route_average_speed = (
    route_distance * 60 / average_duration_minutes
    if average_duration_minutes > 0 else 0
  )
  departed_at = trip.time_departed
  if departed_at.tzinfo is None:
    departed_at = departed_at.replace(tzinfo=timezone.utc)
  local_now = now.astimezone(PH)
  estimate = predict_eta({
    "remaining_distance_km": remaining_km,
    "route_distance_km": route_distance,
    "current_speed_kmh": max(0.0, float(fix.speed_kmh or 0)),
    "route_average_speed_kmh": route_average_speed,
    "trip_elapsed_minutes": max(0.0, (now - departed_at.astimezone(timezone.utc)).total_seconds() / 60),
    "local_hour": local_now.hour,
    "day_of_week": local_now.weekday(),
    "is_returning": int(trip.status == TripStatus.RETURNING),
  })

  return EtaResponse(
    trip_id=trip.trip_id,
    eta_minutes=estimate.eta_minutes if estimate else None,
    source=estimate.source if estimate else "unavailable",
    remaining_distance_km=round(remaining_km, 3),
    location_recorded_at=recorded_at,
  )
