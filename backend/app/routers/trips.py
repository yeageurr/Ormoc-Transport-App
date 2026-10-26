from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.core.permissions import get_current_account, get_driver_profile, require_role
from app.database import get_db
from app.enums import AccountRole, TripStatus, VehicleActivityStatus, VehicleCondition
from app.models.account import Account
from app.models.dispatch_log import DispatchLog
from app.models.gps_log import GpsLog
from app.models.incident_log import Incident
from app.models.terminal import Terminal
from app.models.trip import Trip
from app.models.user import User
from app.models.route import Route
from app.models.vehicle import Vehicle
from app.schemas.trip import (
  AdminTripResponse,
  DriverDailySummary,
  DriverTripResponse,
  TripDriverSummary,
  TripResponse,
  TripStart,
)

router = APIRouter()
PH = ZoneInfo("Asia/Manila")


def _driver_for_trip(trip: Trip) -> User | None:
  if trip.dispatch_log is not None:
    return trip.dispatch_log.driver
  return trip.driver


def _vehicle_for_trip(trip: Trip) -> Vehicle | None:
  if trip.dispatch_log is not None:
    return trip.dispatch_log.vehicle
  return trip.vehicle


def _route_for_trip(trip: Trip) -> Route | None:
  return trip.route or (trip.dispatch_log.route if trip.dispatch_log else None)


def _route_label(trip: Trip, terminal_name: str) -> str | None:
  route = _route_for_trip(trip)
  if route is None:
    return terminal_name if trip.status == TripStatus.RETURNING else None
  origin = route.origin.terminal_name if route.origin else terminal_name
  destination = route.destination.name if route.destination else "Assigned route"
  return f"{origin} → {destination}"


@router.post("/start", response_model=TripResponse, status_code=status.HTTP_201_CREATED)
def start_trip(
  payload: TripStart,
  db: Session = Depends(get_db),
  current_driver: Account = Depends(require_role(AccountRole.DRIVER)),
):
  """Start a route-based trip leg without creating a dispatch record."""
  driver = get_driver_profile(db, current_driver)
  route = db.query(Route).filter(Route.route_id == payload.route_id, Route.is_active.is_(True)).first()
  if route is None:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Selected route not found or inactive")

  vehicle = driver.vehicle
  if vehicle is None:
    raise HTTPException(
      status_code=status.HTTP_409_CONFLICT,
      detail="No vehicle is linked to your driver account. Contact the ticketing officer.",
    )

  if vehicle.condition == VehicleCondition.UNDER_MAINTENANCE:
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This vehicle is under maintenance")

  active_trip = (
    db.query(Trip)
    .outerjoin(DispatchLog, Trip.dispatch_id == DispatchLog.dispatch_id)
    .filter(
      Trip.is_complete.is_(False),
      or_(Trip.vehicle_id == vehicle.vehicle_id, DispatchLog.vehicle_id == vehicle.vehicle_id),
    )
    .first()
  )
  if active_trip:
    raise HTTPException(
      status_code=status.HTTP_400_BAD_REQUEST,
      detail=f"Vehicle {vehicle.plate_number} already has unfinished trip #{active_trip.trip_id}.",
    )

  if payload.status == TripStatus.OUTGOING and vehicle.activity_status != VehicleActivityStatus.LOADING:
    raise HTTPException(
      status_code=status.HTTP_400_BAD_REQUEST,
      detail=(
        "Cannot start the outgoing trip yet: the assigned vehicle is not ready at the terminal. "
        "Remain inside the terminal geofence until its status changes to 'loading'."
      ),
    )

  trip = Trip(
    dispatch_id=None,
    driver_id=driver.user_id,
    vehicle_id=vehicle.vehicle_id,
    route_id=route.route_id,
    status=payload.status,
    time_departed=datetime.now(timezone.utc),
    is_complete=False,
  )
  db.add(trip)
  vehicle.activity_status = VehicleActivityStatus.ON_ROUTE
  db.commit()
  db.refresh(trip)
  return trip


@router.post("/{trip_id}/end", response_model=TripResponse)
def end_trip(
  trip_id: int,
  db: Session = Depends(get_db),
  current_driver: Account = Depends(require_role(AccountRole.DRIVER)),
):
  trip = db.query(Trip).filter(Trip.trip_id == trip_id).first()
  if trip is None:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip not found")

  driver = get_driver_profile(db, current_driver)
  trip_driver = _driver_for_trip(trip)
  if trip_driver is None or trip_driver.user_id != driver.user_id:
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This trip does not belong to you")
  if trip.is_complete:
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Trip is already complete")

  trip.time_arrived = datetime.now(timezone.utc)
  departed = trip.time_departed
  if departed.tzinfo is None:
    departed = departed.replace(tzinfo=timezone.utc)
  trip.trip_duration_minutes = round((trip.time_arrived - departed).total_seconds() / 60, 2)

  avg_speed = db.query(func.avg(GpsLog.speed_kmh)).filter(GpsLog.trip_id == trip_id).scalar()
  trip.average_speed_km = round(avg_speed, 2) if avg_speed is not None else None
  trip.is_complete = True

  vehicle = _vehicle_for_trip(trip)
  if vehicle is not None:
    vehicle.activity_status = VehicleActivityStatus.ACTIVE
  db.commit()
  db.refresh(trip)
  return trip


@router.get("/driver/mine", response_model=list[DriverTripResponse])
def list_my_trips(
  db: Session = Depends(get_db),
  current_driver: Account = Depends(require_role(AccountRole.DRIVER)),
):
  driver = get_driver_profile(db, current_driver)
  trips = (
    db.query(Trip)
    .outerjoin(DispatchLog, Trip.dispatch_id == DispatchLog.dispatch_id)
    .filter(or_(Trip.driver_id == driver.user_id, DispatchLog.driver_id == driver.user_id))
    .order_by(Trip.time_departed.desc())
    .all()
  )
  terminal = db.query(Terminal).first()
  terminal_name = terminal.terminal_name if terminal else "Ormoc City Terminal"

  return [
    DriverTripResponse(
      trip_id=trip.trip_id,
      dispatch_id=trip.dispatch_id,
      route_id=trip.route_id or (trip.dispatch_log.route_id if trip.dispatch_log else None),
      driver_id=trip.driver_id,
      vehicle_id=trip.vehicle_id,
      dispatch_ticket_id=str(trip.dispatch_ticket_id) if trip.dispatch_ticket_id else None,
      status=trip.status,
      time_departed=trip.time_departed,
      time_arrived=trip.time_arrived,
      trip_duration_minutes=trip.trip_duration_minutes,
      average_speed_km=trip.average_speed_km,
      is_complete=trip.is_complete,
      vehicle_plate=_vehicle_for_trip(trip).plate_number if _vehicle_for_trip(trip) else None,
      route_label=_route_label(trip, terminal_name),
      route_distance_km=(
        float(_route_for_trip(trip).distance)
        if _route_for_trip(trip) and _route_for_trip(trip).distance is not None
        else None
      ),
    )
    for trip in trips
  ]


@router.get("/driver/summary", response_model=DriverDailySummary)
def get_my_daily_summary(
  db: Session = Depends(get_db),
  current_driver: Account = Depends(require_role(AccountRole.DRIVER)),
):
  now = datetime.now(PH)
  day_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
  day_end = day_start + timedelta(days=1)
  driver_id = get_driver_profile(db, current_driver).user_id

  trips_completed = (
    db.query(func.count(Trip.trip_id))
    .outerjoin(DispatchLog, Trip.dispatch_id == DispatchLog.dispatch_id)
    .filter(
      or_(Trip.driver_id == driver_id, DispatchLog.driver_id == driver_id),
      Trip.is_complete.is_(True),
      Trip.time_arrived >= day_start,
      Trip.time_arrived < day_end,
    )
    .scalar()
  )
  incidents_reported = (
    db.query(func.count(Incident.incident_id))
    .filter(
      Incident.reported_by == driver_id,
      Incident.reported_at >= day_start,
      Incident.reported_at < day_end,
    )
    .scalar()
  )
  return DriverDailySummary(trips_completed=trips_completed or 0, incidents_reported=incidents_reported or 0)


@router.get("/{trip_id}", response_model=TripResponse)
def get_trip(
  trip_id: int,
  db: Session = Depends(get_db),
  current_account: Account = Depends(get_current_account),
):
  trip = db.query(Trip).filter(Trip.trip_id == trip_id).first()
  if trip is None:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip not found")
  return trip


@router.get("", response_model=list[AdminTripResponse])
def list_all_trips(
  db: Session = Depends(get_db),
  ticketing_officer: Account = Depends(require_role(AccountRole.TICKETING_OFFICER)),
):
  trips = db.query(Trip).order_by(Trip.time_departed.desc()).all()
  terminal = db.query(Terminal).first()
  terminal_name = terminal.terminal_name if terminal else "Ormoc City Terminal"
  results = []
  for trip in trips:
    driver = _driver_for_trip(trip)
    results.append(AdminTripResponse(
      trip_id=trip.trip_id,
      dispatch_id=trip.dispatch_id,
      status=trip.status,
      route_id=trip.route_id or (trip.dispatch_log.route_id if trip.dispatch_log else None),
      time_departed=trip.time_departed,
      time_arrived=trip.time_arrived,
      trip_duration_minutes=trip.trip_duration_minutes,
      average_speed_km=trip.average_speed_km,
      is_complete=trip.is_complete,
      driver=TripDriverSummary(
        user_id=driver.user_id, first_name=driver.first_name, last_name=driver.last_name
      ) if driver else None,
      route_label=_route_label(trip, terminal_name),
    ))
  return results
