import secrets
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.core.permissions import get_driver_profile, require_role
from app.database import get_db
from app.enums import AccountRole, VehicleActivityStatus
from app.models.account import Account
from app.models.dispatch_log import DispatchLog
from app.models.driver_location import DriverLocation
from app.models.route import Route
from app.models.terminal import Terminal
from app.models.trip import Trip
from app.models.vehicle import Vehicle
from app.models.passenger_queue_entry import PassengerQueueEntry
from app.services.geofence_service import is_inside_geofence

router = APIRouter()
PH = ZoneInfo("Asia/Manila")


class CommuterRouteResponse(BaseModel):
  model_config = ConfigDict(from_attributes=True)

  route_id: int
  origin_name: str
  destination_name: str
  distance_km: float
  average_travel_duration_minutes: float | None
  route_geometry: dict | None


class CommuterVehicleResponse(BaseModel):
  vehicle_id: int
  plate_number: str
  body_number: str
  body_color: str
  vehicle_type: str
  route_id: int | None
  route_label: str | None
  latitude: float
  longitude: float
  speed_kmh: float
  recorded_at: datetime


class TerminalGeofenceResponse(BaseModel):
  terminal_name: str
  min_latitude: float
  min_longitude: float
  max_latitude: float
  max_longitude: float


class PassengerQueueJoinRequest(BaseModel):
  route_id: int
  latitude: float
  longitude: float
  session_token: str | None = None


class PassengerQueueHeartbeatRequest(BaseModel):
  latitude: float
  longitude: float


class PassengerQueueResponse(BaseModel):
  session_token: str
  route_id: int
  active: bool


class PassengerQueueCountResponse(BaseModel):
  route_id: int | None
  count: int


@router.get("/routes", response_model=list[CommuterRouteResponse])
def list_public_routes(db: Session = Depends(get_db)):
  routes = (
    db.query(Route)
    .options(joinedload(Route.origin), joinedload(Route.destination))
    .filter(Route.is_active.is_(True))
    .order_by(Route.route_id)
    .all()
  )
  return [
    CommuterRouteResponse(
      route_id=route.route_id,
      origin_name=route.origin.terminal_name if route.origin else "Ormoc City Public Terminal",
      destination_name=route.destination.name if route.destination else "Destination",
      distance_km=float(route.distance),
      average_travel_duration_minutes=(float(route.average_travel_duration) if route.average_travel_duration is not None else None),
      route_geometry=route.route_geometry,
    )
    for route in routes
  ]


@router.get("/vehicles/live", response_model=list[CommuterVehicleResponse])
def list_public_live_vehicles(db: Session = Depends(get_db)):
  """Return only on-route vehicle positions and public vehicle details.

  Driver identity and contact information are deliberately excluded. The
  recorded timestamp lets the client show when a position was last updated.
  """
  today = datetime.now(PH).date()
  locations = (
    db.query(DriverLocation, Vehicle)
    .join(Vehicle, Vehicle.vehicle_id == DriverLocation.vehicle_id)
    .filter(Vehicle.activity_status == VehicleActivityStatus.ON_ROUTE)
    .order_by(DriverLocation.recorded_at.desc())
    .all()
  )
  results = []
  for location, vehicle in locations:
    dispatch = (
      db.query(DispatchLog)
      .options(joinedload(DispatchLog.route).joinedload(Route.destination))
      .filter(
        DispatchLog.vehicle_id == vehicle.vehicle_id,
        DispatchLog.effective_on >= datetime.combine(today, datetime.min.time(), tzinfo=PH),
        DispatchLog.effective_on < datetime.combine(today + timedelta(days=1), datetime.min.time(), tzinfo=PH),
      )
      .order_by(DispatchLog.effective_on.desc())
      .first()
    )
    active_trip = (
      db.query(Trip)
      .filter(
        Trip.vehicle_id == vehicle.vehicle_id,
        Trip.is_complete.is_(False),
      )
      .order_by(Trip.time_departed.desc())
      .first()
    )
    route = active_trip.route if active_trip and active_trip.route else (dispatch.route if dispatch else None)
    results.append(CommuterVehicleResponse(
      vehicle_id=vehicle.vehicle_id,
      plate_number=vehicle.plate_number,
      body_number=vehicle.body_number,
      body_color=vehicle.body_color,
      vehicle_type=vehicle.vehicle_type,
      route_id=route.route_id if route else None,
      route_label=route.destination.name if route and route.destination else None,
      latitude=float(location.latitude),
      longitude=float(location.longitude),
      speed_kmh=float(location.speed_kmh),
      recorded_at=location.recorded_at,
    ))
  return results


@router.get("/terminal-geofence", response_model=TerminalGeofenceResponse)
def get_public_terminal_geofence(db: Session = Depends(get_db)):
  terminal = db.query(Terminal).order_by(Terminal.terminal_id).first()
  if terminal is None:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Terminal geofence is not configured")
  return TerminalGeofenceResponse(
    terminal_name=terminal.terminal_name,
    min_latitude=float(terminal.min_latitude),
    min_longitude=float(terminal.min_longitude),
    max_latitude=float(terminal.max_latitude),
    max_longitude=float(terminal.max_longitude),
  )


@router.get("/passenger-queue/current", response_model=PassengerQueueResponse)
def get_current_passenger_queue(
  session_token: str = Query(min_length=32, max_length=64),
  db: Session = Depends(get_db),
):
  entry = db.query(PassengerQueueEntry).filter(PassengerQueueEntry.session_token == session_token).first()
  if entry is None:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No passenger queue entry found")
  active = entry.is_active and entry.last_seen_at >= datetime.now(timezone.utc) - timedelta(minutes=2)
  return PassengerQueueResponse(session_token=entry.session_token, route_id=entry.route_id, active=active)


@router.post("/passenger-queue", response_model=PassengerQueueResponse, status_code=status.HTTP_201_CREATED)
def join_passenger_queue(payload: PassengerQueueJoinRequest, db: Session = Depends(get_db)):
  route = db.query(Route).filter(Route.route_id == payload.route_id, Route.is_active.is_(True)).first()
  if route is None or route.origin is None:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Selected route is unavailable")
  if not is_inside_geofence(payload.latitude, payload.longitude, route.origin):
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You must be inside the terminal area to join the queue")

  now = datetime.now(timezone.utc)
  entry = None
  if payload.session_token:
    entry = db.query(PassengerQueueEntry).filter(PassengerQueueEntry.session_token == payload.session_token).first()
    if entry and entry.is_active and entry.last_seen_at >= now - timedelta(minutes=2) and entry.route_id != route.route_id:
      raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Leave your current passenger queue before selecting another route")

  if entry is None:
    entry = PassengerQueueEntry(
      session_token=secrets.token_urlsafe(32),
      route_id=route.route_id,
      terminal_id=route.origin.terminal_id,
      is_active=True,
      joined_at=now,
      last_seen_at=now,
    )
    db.add(entry)
  else:
    entry.route_id = route.route_id
    entry.terminal_id = route.origin.terminal_id
    entry.is_active = True
    entry.joined_at = now
    entry.last_seen_at = now
    entry.left_at = None

  db.commit()
  db.refresh(entry)
  return PassengerQueueResponse(session_token=entry.session_token, route_id=entry.route_id, active=True)


@router.post("/passenger-queue/{session_token}/heartbeat", response_model=PassengerQueueResponse)
def passenger_queue_heartbeat(
  session_token: str,
  payload: PassengerQueueHeartbeatRequest,
  db: Session = Depends(get_db),
):
  entry = db.query(PassengerQueueEntry).filter(PassengerQueueEntry.session_token == session_token).first()
  if entry is None:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Passenger queue entry was not found")
  now = datetime.now(timezone.utc)
  terminal = db.query(Terminal).filter(Terminal.terminal_id == entry.terminal_id).first()
  if terminal is None or not is_inside_geofence(payload.latitude, payload.longitude, terminal):
    entry.is_active = False
    entry.left_at = now
  else:
    entry.is_active = True
    entry.last_seen_at = now
    entry.left_at = None
  db.commit()
  return PassengerQueueResponse(session_token=entry.session_token, route_id=entry.route_id, active=entry.is_active)


@router.get("/passenger-queue/driver/count", response_model=PassengerQueueCountResponse)
def get_driver_passenger_queue_count(
  db: Session = Depends(get_db),
  current_driver: Account = Depends(require_role(AccountRole.DRIVER)),
):
  driver = get_driver_profile(db, current_driver)
  now_ph = datetime.now(PH)
  start = now_ph.replace(hour=0, minute=0, second=0, microsecond=0)
  end = start + timedelta(days=1)
  dispatch = (
    db.query(DispatchLog)
    .filter(DispatchLog.driver_id == driver.user_id, DispatchLog.effective_on >= start, DispatchLog.effective_on < end)
    .order_by(DispatchLog.effective_on.desc())
    .first()
  )
  if dispatch is None:
    return PassengerQueueCountResponse(route_id=None, count=0)
  cutoff = datetime.now(timezone.utc) - timedelta(minutes=2)
  count = (
    db.query(func.count(PassengerQueueEntry.passenger_queue_entry_id))
    .filter(
      PassengerQueueEntry.route_id == dispatch.route_id,
      PassengerQueueEntry.is_active.is_(True),
      PassengerQueueEntry.last_seen_at >= cutoff,
    )
    .scalar()
  ) or 0
  return PassengerQueueCountResponse(route_id=dispatch.route_id, count=int(count))
