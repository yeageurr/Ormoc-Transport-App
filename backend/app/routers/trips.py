from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models.account import Account
from app.models.dispatch_log import DispatchLog
from app.models.trip import Trip
from app.models.vehicle import Vehicle
from app.models.gps_log import GpsLog
from app.schemas.trip import TripStart, TripResponse, AdminTripResponse, TripDriverSummary
from app.core.permissions import require_role, get_current_account
from app.enums import AccountRole, TripStatus, VehicleActivityStatus

router = APIRouter()


@router.post("/start", response_model=TripResponse, status_code=status.HTTP_201_CREATED)
def start_trip(
  payload: TripStart,
  db: Session = Depends(get_db),
  current_driver: Account = Depends(require_role(AccountRole.DRIVER)),
):
  """Driver taps 'Start Trip'. Requires the vehicle's activity_status to
  already be 'loading' — geofence dwell detection sets that, this button
  press is the explicit driver confirmation that actually moves it on-route."""

  dispatch = db.query(DispatchLog).filter(DispatchLog.dispatch_id == payload.dispatch_id).first()
  if dispatch is None:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dispatch entry not found")

  if dispatch.driver.account_id != current_driver.account_id:
    raise HTTPException(
      status_code=status.HTTP_403_FORBIDDEN,
      detail="This dispatch is not assigned to you",
    )

  vehicle = dispatch.vehicle
  if vehicle.activity_status != VehicleActivityStatus.LOADING:
    raise HTTPException(
      status_code=status.HTTP_400_BAD_REQUEST,
      detail=f"Vehicle must be 'loading' to start a trip (currently '{vehicle.activity_status.value}')",
    )

  # Determine leg: first trip on this dispatch is outgoing, next is returning
  existing_trips = db.query(Trip).filter(Trip.dispatch_id == payload.dispatch_id).count()
  trip_status = TripStatus.OUTGOING if existing_trips == 0 else TripStatus.RETURNING

  trip = Trip(
    dispatch_id=payload.dispatch_id,
    status=trip_status,
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
  """Driver taps 'End Trip'. Computes average_speed_km from gps_logs
  (once, here — this is a cached calculation, not recomputed on every read),
  sets is_complete, and returns the vehicle to 'loading' for the next leg."""

  trip = db.query(Trip).filter(Trip.trip_id == trip_id).first()
  if trip is None:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip not found")

  if trip.dispatch_log.driver.account_id != current_driver.account_id:
    raise HTTPException(
      status_code=status.HTTP_403_FORBIDDEN,
      detail="This trip does not belong to you",
    )

  if trip.is_complete:
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Trip is already complete")

  trip.time_arrived = datetime.now(timezone.utc)

  # Defensive: some DB backends (notably SQLite, used for local testing)
  # return timestamps without timezone info even when stored as TIMESTAMPTZ.
  # Postgres handles this correctly natively, but this guards against it either way.
  departed = trip.time_departed
  if departed.tzinfo is None:
    departed = departed.replace(tzinfo=timezone.utc)

  trip.trip_duration_minutes = round(
    (trip.time_arrived - departed).total_seconds() / 60, 2
  )

  avg_speed = db.query(func.avg(GpsLog.speed_kmh)).filter(GpsLog.trip_id == trip_id).scalar()
  trip.average_speed_km = round(avg_speed, 2) if avg_speed is not None else None

  trip.is_complete = True

  vehicle = trip.dispatch_log.vehicle
  vehicle.activity_status = VehicleActivityStatus.LOADING

  db.commit()
  db.refresh(trip)

  return trip


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


@router.get("/driver/mine", response_model=list[TripResponse])
def list_my_trips(
  db: Session = Depends(get_db),
  current_driver: Account = Depends(require_role(AccountRole.DRIVER)),
):
  """Driver's own Trip Logs screen."""
  return (
    db.query(Trip)
    .join(DispatchLog)
    .filter(DispatchLog.driver_id == current_driver.user.user_id)
    .order_by(Trip.time_departed.desc())
    .all()
  )


@router.get("", response_model=list[AdminTripResponse])
def list_all_trips(
  db: Session = Depends(get_db),
  current_admin: Account = Depends(require_role(AccountRole.ADMIN)),
):
  """Admin-wide Trip Logs table — embeds driver name and route directly,
  since the admin view needs to show 'who' and 'where' at a glance."""
  trips = db.query(Trip).order_by(Trip.time_departed.desc()).all()

  results = []
  for trip in trips:
    dispatch = trip.dispatch_log
    driver = dispatch.driver if dispatch else None
    route = dispatch.route if dispatch else None

    results.append(AdminTripResponse(
      trip_id=trip.trip_id,
      dispatch_id=trip.dispatch_id,
      status=trip.status,
      time_departed=trip.time_departed,
      time_arrived=trip.time_arrived,
      trip_duration_minutes=trip.trip_duration_minutes,
      average_speed_km=trip.average_speed_km,
      is_complete=trip.is_complete,
      driver=TripDriverSummary(
        user_id=driver.user_id, first_name=driver.first_name, last_name=driver.last_name
      ) if driver else None,
      route_label=route.destination.name if route and route.destination else None,
    ))

  return results