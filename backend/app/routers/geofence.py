from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, status
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
  """Driver app calls this periodically while NOT on an active trip
  (separate from /gps, which only logs during on-route trips). This is
  what actually detects terminal entry and drives the active -> loading
  transition, before Start Trip becomes relevant."""

  now = datetime.now(ZoneInfo("Asia/Manila"))
  day_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
  driver = get_driver_profile(db, current_driver)
  dispatch = (
    db.query(DispatchLog)
    .filter(
      DispatchLog.driver_id == driver.user_id,
      DispatchLog.effective_on >= day_start,
      DispatchLog.effective_on < day_start + timedelta(days=1),
    )
    .order_by(DispatchLog.effective_on.desc())
    .first()
  )
  if dispatch is None or dispatch.vehicle is None:
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

  active_trip = db.query(Trip).filter(
    Trip.dispatch_id == dispatch.dispatch_id,
    Trip.is_complete.is_(False),
  ).first()
  if active_trip:
    return {"currently_inside": False, "status_changed": False, "event": "trip_in_progress"}

  result = process_vehicle_position(db, dispatch.vehicle, payload.latitude, payload.longitude, terminal)
  return result
