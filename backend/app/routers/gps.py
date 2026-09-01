from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.account import Account
from app.models.trip import Trip
from app.models.gps_log import GpsLog
from app.schemas.gps_log import GpsPing, GpsLogResponse
from app.core.permissions import require_role
from app.enums import AccountRole
from app.websocket.connection_manager import manager

router = APIRouter()


@router.post("", response_model=GpsLogResponse, status_code=status.HTTP_201_CREATED)
async def log_gps_ping(payload: GpsPing, db: Session = Depends(get_db), current_driver: Account = Depends(require_role(AccountRole.DRIVER)),):

  trip = db.query(Trip).filter(Trip.trip_id == payload.trip_id).first()
  if trip is None:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip not found")

  if trip.dispatch_log.driver.account_id != current_driver.account_id:
    raise HTTPException(
      status_code=status.HTTP_403_FORBIDDEN,
      detail="This trip does not belong to you",
    )

  if trip.is_complete:
    raise HTTPException(
      status_code=status.HTTP_400_BAD_REQUEST,
      detail="Cannot log GPS pings for a completed trip",
    )

  gps_log = GpsLog(
    trip_id=payload.trip_id,
    latitude=payload.latitude,
    longitude=payload.longitude,
    speed_kmh=payload.speed_kmh,
  )
  db.add(gps_log)
  db.commit()
  db.refresh(gps_log)


  admin_ids = [
    acc.account_id
    for acc in db.query(Account).filter(Account.role == AccountRole.ADMIN).all()
  ]
  await manager.broadcast_to(admin_ids, {
    "type": "gps_update",
    "data": {
      "trip_id": gps_log.trip_id,
      "latitude": float(gps_log.latitude),
      "longitude": float(gps_log.longitude),
      "speed_kmh": float(gps_log.speed_kmh),
      "recorded_at": gps_log.recorded_at.isoformat(),
    },
  })

  return gps_log


@router.get("/trip/{trip_id}", response_model=list[GpsLogResponse])
def get_trip_path(
  trip_id: int,
  db: Session = Depends(get_db),
  current_account: Account = Depends(require_role(AccountRole.ADMIN, AccountRole.DRIVER)),
):
  """Full GPS trail for a trip — used to draw the route path after the fact."""
  trip = db.query(Trip).filter(Trip.trip_id == trip_id).first()
  if trip is None:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip not found")

  return (
    db.query(GpsLog)
    .filter(GpsLog.trip_id == trip_id)
    .order_by(GpsLog.recorded_at.asc())
    .all()
  )