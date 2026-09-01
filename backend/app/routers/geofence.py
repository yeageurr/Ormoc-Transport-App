from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.models.account import Account
from app.models.terminal import Terminal
from app.models.vehicle import Vehicle
from app.core.permissions import require_role
from app.enums import AccountRole
from app.services.geofence_service import process_vehicle_position

router = APIRouter()


class GeofencePing(BaseModel):
  vehicle_id: int
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

  vehicle = db.query(Vehicle).filter(Vehicle.vehicle_id == payload.vehicle_id).first()
  if vehicle is None:
    raise HTTPException(
      status_code=status.HTTP_404_NOT_FOUND, 
      detail="Vehicle not found"
    )

  # Single-terminal scope — no terminal_id needed in the request.
  terminal = db.query(Terminal).first()
  if terminal is None:
    raise HTTPException(
      status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
      detail="No terminal configured"
    )

  result = process_vehicle_position(db, vehicle, payload.latitude, payload.longitude, terminal)
  return result