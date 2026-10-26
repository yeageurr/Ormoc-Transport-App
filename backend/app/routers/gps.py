from datetime import datetime
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.account import Account
from app.models.trip import Trip
from app.models.gps_log import GpsLog
from app.models.driver_location import DriverLocation
from app.models.dispatch_log import DispatchLog
from app.schemas.gps_log import CurrentLocationPing, GpsPing, GpsLogResponse
from app.core.permissions import get_driver_profile, require_role
from app.enums import AccountRole
from app.websocket.connection_manager import manager

router = APIRouter()


@router.post("/current")
async def update_current_location( payload: CurrentLocationPing, db: Session = Depends(get_db), current_driver: Account = Depends(require_role(AccountRole.DRIVER)), ):
  """Store and broadcast the latest foreground fix for the driver's vehicle."""
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
  vehicle = (
    (active_trip.vehicle if active_trip.dispatch_id is None else active_trip.dispatch_log.vehicle)
    if active_trip
    else driver.active_vehicle
  )

  if vehicle is None:
    raise HTTPException(
      status_code = status.HTTP_404_NOT_FOUND, 
      detail = "No vehicle is assigned to this driver"
    )

  location = db.query(DriverLocation).filter(
    DriverLocation.driver_id == driver.user_id
  ).first()

  if location is None:
    location = DriverLocation(driver_id=driver.user_id)
    db.add(location)

  location.vehicle_id = vehicle.vehicle_id
  location.dispatch_id = active_trip.dispatch_id if active_trip else None
  location.latitude = payload.latitude
  location.longitude = payload.longitude
  location.speed_kmh = payload.speed_kmh
  location.recorded_at = datetime.now(ZoneInfo("UTC"))
  db.commit()
  db.refresh(location)

  ticketing_officer_ids = [
    account_id for (account_id,) in db.query(Account.account_id)
    .filter(Account.role == AccountRole.TICKETING_OFFICER).all()
  ]

  await manager.broadcast_to(ticketing_officer_ids, {
  "type": "gps_update",
    "data": {
      "vehicle_id": location.vehicle_id,
      "dispatch_id": location.dispatch_id,
      "latitude": float(location.latitude),
      "longitude": float(location.longitude),
      "speed_kmh": float(location.speed_kmh),
      "recorded_at": location.recorded_at.isoformat(),
    },
  })
  return {"detail": "Current location updated"}


@router.post("", response_model=GpsLogResponse, status_code=status.HTTP_201_CREATED)
async def log_gps_ping(payload: GpsPing, db: Session = Depends(get_db), current_driver: Account = Depends(require_role(AccountRole.DRIVER)),):

  trip = db.query(Trip).filter(Trip.trip_id == payload.trip_id).first()
  if trip is None:
    raise HTTPException(
      status_code = status.HTTP_404_NOT_FOUND,
      detail="Trip not found"
    )

  trip_driver_id = trip.driver_id if trip.dispatch_id is None else trip.dispatch_log.driver_id
  if trip_driver_id != get_driver_profile(db, current_driver).user_id:
    raise HTTPException(
      status_code = status.HTTP_403_FORBIDDEN,
      detail = "This trip does not belong to you",
    )

  if trip.is_complete:
    raise HTTPException(
      status_code = status.HTTP_400_BAD_REQUEST,
      detail = "Cannot log GPS pings for a completed trip",
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


  ticketing_officer_ids = [
    acc.account_id
    for acc in db.query(Account).filter(Account.role == AccountRole.TICKETING_OFFICER).all()
  ]

  await manager.broadcast_to(ticketing_officer_ids, {
    "type": "gps_update",
    "data": {
      # vehicle_id added so the Live Map can update the right marker
      # directly — the frontend has no trip_id -> vehicle_id mapping of
      # its own (LiveVehicleSummary doesn't expose trip_id).
      "vehicle_id": trip.vehicle_id if trip.dispatch_id is None else trip.dispatch_log.vehicle_id,
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
  current_account: Account = Depends(require_role(AccountRole.TICKETING_OFFICER, AccountRole.DRIVER)),
):
  """Full GPS trail for a trip — used to draw the route path after the fact."""
  trip = db.query(Trip).filter(Trip.trip_id == trip_id).first()
  if trip is None:
    raise HTTPException(
      status_code = status.HTTP_404_NOT_FOUND, 
      detail = "Trip not found"
    )

  if current_account.role == AccountRole.DRIVER:
    driver = get_driver_profile(db, current_account)
    trip_driver_id = trip.driver_id if trip.dispatch_id is None else trip.dispatch_log.driver_id
    if trip_driver_id != driver.user_id:
      raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip not found")

  return (
    db.query(GpsLog)
    .filter(GpsLog.trip_id == trip_id)
    .order_by(GpsLog.recorded_at.asc())
    .all()
  )
