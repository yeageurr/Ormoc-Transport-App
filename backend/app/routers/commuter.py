import secrets
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy import func, or_
from sqlalchemy.orm import Session, joinedload

from app.core.permissions import get_driver_profile, require_role
from app.database import get_db
from app.enums import AccountRole, VehicleActivityStatus
from app.models.account import Account
from app.models.driver_location import DriverLocation
from app.models.route import Route
from app.models.terminal import Terminal
from app.models.trip import Trip
from app.models.vehicle import Vehicle
from app.models.passenger_queue_entry import PassengerQueueEntry
from app.models.trip_pause_event import TripPauseEvent
from app.models.user import User
from app.services.geofence_service import is_inside_geofence
from app.websocket.connection_manager import manager

router = APIRouter()
PH = ZoneInfo("Asia/Manila")


def _active_passenger_count(db: Session, route_id: int, now: datetime) -> int:
  cutoff = now - timedelta(minutes=2)
  return int(db.query(func.count(PassengerQueueEntry.passenger_queue_entry_id)).filter(
    PassengerQueueEntry.route_id == route_id,
    PassengerQueueEntry.is_active.is_(True),
    PassengerQueueEntry.last_seen_at >= cutoff,
  ).scalar() or 0)


async def _push_passenger_queue_count(db: Session, route_id: int) -> None:
  """Push the route's authoritative queue count to drivers who've driven it today."""
  now_ph = datetime.now(PH)
  day_start = now_ph.replace(hour=0, minute=0, second=0, microsecond=0)
  day_end = day_start + timedelta(days=1)
  trips = (
    db.query(Account.account_id, Trip.driver_id, Trip.route_id, Trip.time_departed)
    .join(User, User.account_id == Account.account_id)
    .join(Trip, Trip.driver_id == User.user_id)
    .filter(
      Account.role == AccountRole.DRIVER,
      Trip.time_departed >= day_start,
      Trip.time_departed < day_end,
    )
    .order_by(Trip.time_departed.desc())
    .all()
  )
  # The latest route trip today determines the route whose count the driver sees.
  latest_route_by_driver: dict[int, tuple[int, int]] = {}
  for account_id, driver_id, assigned_route_id, _ in trips:
    latest_route_by_driver.setdefault(driver_id, (account_id, assigned_route_id))
  recipients = [
    account_id for account_id, assigned_route_id in latest_route_by_driver.values()
    if assigned_route_id == route_id
  ]
  if recipients:
    await manager.broadcast_to(recipients, {
      "type": "passenger_queue_count",
      "data": {
        "route_id": route_id,
        "count": _active_passenger_count(db, route_id, datetime.now(timezone.utc)),
      },
    })


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


class PublicDelayNotice(BaseModel):
  trip_id: int
  route_id: int
  route_name: str
  direction: str
  paused_at: datetime
  resumed_at: datetime | None = None
  reason: str
  details: str | None = None


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
    active_trip = (
      db.query(Trip)
      .filter(
        Trip.vehicle_id == vehicle.vehicle_id,
        Trip.is_complete.is_(False),
      )
      .order_by(Trip.time_departed.desc())
      .first()
    )
    route = active_trip.route if active_trip else None
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


@router.get("/delay-notices", response_model=list[PublicDelayNotice])
def list_active_delay_notices(db: Session = Depends(get_db)):
  """Return open notices and recently resumed ones so commuter polling can receive them."""
  recently_resumed_after = datetime.now(timezone.utc) - timedelta(minutes=5)
  rows = (
    db.query(TripPauseEvent, Trip, Route)
    .join(Trip, Trip.trip_id == TripPauseEvent.trip_id)
    .join(Route, Route.route_id == Trip.route_id)
    .filter(
      TripPauseEvent.broadcast_to_commuters.is_(True),
      or_(TripPauseEvent.resumed_at.is_(None), TripPauseEvent.resumed_at >= recently_resumed_after),
    )
    .order_by(TripPauseEvent.paused_at.desc())
    .all()
  )
  return [
    PublicDelayNotice(
      trip_id=trip.trip_id,
      route_id=route.route_id,
      route_name=route.destination.name if route.destination else "Selected route",
      direction=trip.status.value,
      paused_at=event.paused_at,
      resumed_at=event.resumed_at,
      reason=event.delay_reason or "other",
      details=event.delay_details,
    )
    for event, trip, route in rows
  ]


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
async def join_passenger_queue(payload: PassengerQueueJoinRequest, db: Session = Depends(get_db)):
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

  previous_route_id = entry.route_id if entry is not None else None
  previously_counted_active = bool(
    entry is not None and entry.is_active and entry.last_seen_at >= now - timedelta(minutes=2)
  )
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

  affected_route_ids = set()
  if not previously_counted_active:
    affected_route_ids.add(route.route_id)
  if previously_counted_active and previous_route_id is not None and previous_route_id != route.route_id:
    affected_route_ids.add(previous_route_id)
  db.commit()
  db.refresh(entry)
  for affected_route_id in affected_route_ids:
    await _push_passenger_queue_count(db, affected_route_id)
  return PassengerQueueResponse(session_token=entry.session_token, route_id=entry.route_id, active=True)


@router.post("/passenger-queue/{session_token}/heartbeat", response_model=PassengerQueueResponse)
async def passenger_queue_heartbeat(
  session_token: str,
  payload: PassengerQueueHeartbeatRequest,
  db: Session = Depends(get_db),
):
  entry = db.query(PassengerQueueEntry).filter(PassengerQueueEntry.session_token == session_token).first()
  if entry is None:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Passenger queue entry was not found")
  now = datetime.now(timezone.utc)
  was_counted_active = entry.is_active and entry.last_seen_at >= now - timedelta(minutes=2)
  terminal = db.query(Terminal).filter(Terminal.terminal_id == entry.terminal_id).first()
  if terminal is None or not is_inside_geofence(payload.latitude, payload.longitude, terminal):
    entry.is_active = False
    entry.left_at = now
  else:
    entry.is_active = True
    entry.last_seen_at = now
    entry.left_at = None
  db.commit()
  is_counted_active = entry.is_active and entry.last_seen_at >= now - timedelta(minutes=2)
  if was_counted_active != is_counted_active:
    await _push_passenger_queue_count(db, entry.route_id)
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
  trip = (
    db.query(Trip)
    .filter(Trip.driver_id == driver.user_id, Trip.time_departed >= start, Trip.time_departed < end)
    .order_by(Trip.time_departed.desc())
    .first()
  )
  if trip is None:
    return PassengerQueueCountResponse(route_id=None, count=0)
  count = _active_passenger_count(db, trip.route_id, datetime.now(timezone.utc))
  return PassengerQueueCountResponse(route_id=trip.route_id, count=count)
