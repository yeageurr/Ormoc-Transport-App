from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.enums import VehicleActivityStatus
from app.models.dispatch_log import DispatchLog
from app.models.driver_location import DriverLocation
from app.models.route import Route
from app.models.vehicle import Vehicle

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
    route = dispatch.route if dispatch else None
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
