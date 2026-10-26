from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.models.account import Account
from app.models.terminal import Terminal
from app.models.dispatch_log import DispatchLog
from app.models.trip import Trip
from app.core.permissions import get_driver_profile, require_role
from app.enums import AccountRole
from app.services.geofence_service import process_vehicle_position

router = APIRouter()


class GeofencePing(BaseModel):
  latitude: float
  longitude: float


@router.post("/ping")
def geofence_ping(
  payload: GeofencePing,
  db: Session = Depends(get_db),
  current_driver: Account = Depends(require_role(AccountRole.DRIVER)),
):
  """Detect terminal entry for the driver's linked vehicle before a trip.

  The app calls this periodically while the driver is not on an active trip.
  The geofence controls the vehicle's active -> loading transition, which is
  still required before an outgoing trip can start.
  """

  driver = get_driver_profile(db, current_driver)
  active_trip = (
    db.query(Trip)
    .outerjoin(DispatchLog, Trip.dispatch_id == DispatchLog.dispatch_id)
    .filter(
      Trip.is_complete.is_(False),
      or_(Trip.driver_id == driver.user_id, DispatchLog.driver_id == driver.user_id),
    )
    .first()
  )
  if active_trip:
    return {"currently_inside": False, "status_changed": False, "event": "trip_in_progress"}

  vehicle = driver.vehicle
  if vehicle is None:
    raise HTTPException(
      status_code = status.HTTP_404_NOT_FOUND, 
      detail = "No vehicle is assigned to this driver today"
    )

  # Single-terminal scope — no terminal_id needed in the request.
  terminal = db.query(Terminal).first()
  if terminal is None:
    raise HTTPException(
      status_code = status.HTTP_500_INTERNAL_SERVER_ERROR, 
      detail = "No terminal configured"
    )

  result = process_vehicle_position(db, vehicle, payload.latitude, payload.longitude, terminal)
  return result
