from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from pydantic import BaseModel

from app.database import get_db
from app.models.account import Account
from app.models.user import User
from app.models.vehicle import Vehicle
from app.models.dispatch_log import DispatchLog
from app.models.gps_log import GpsLog
from app.models.trip import Trip
from app.models.driver_location import DriverLocation
from app.schemas.vehicle import VehicleCreate, VehicleUpdate, VehicleResponse
from app.schemas.user import UserResponse
from app.core.permissions import require_role
from app.enums import AccountRole, AccountStatus
from app.services.audit_service import log_action
from app.enums import AuditAction

router = APIRouter()


@router.get("/eligible-owners", response_model=list[UserResponse])
def list_eligible_owners(
  vehicle_id: int | None = None,
  db: Session = Depends(get_db),
  current_admin: Account = Depends(require_role(AccountRole.ADMIN)),
):
  """Active, unassigned drivers, plus the current owner while editing."""
  return (
    db.query(User)
    .outerjoin(Vehicle, Vehicle.owner_id == User.user_id)
    .join(Account, User.account_id == Account.account_id)
    .filter(
      and_(
        or_(
          Vehicle.vehicle_id == vehicle_id,
          and_(Vehicle.vehicle_id.is_(None), Account.status == AccountStatus.ACTIVE),
        ),
        Account.role == AccountRole.DRIVER,
      )
    )
    .all()
  )


class LiveVehicleSummary(BaseModel):
  vehicle_id: int
  plate_number: str
  activity_status: str
  body_color: str
  driver_name: str | None = None
  route_label: str | None = None
  current_speed_kmh: float | None = None
  current_latitude: float | None = None
  current_longitude: float | None = None


@router.get("/live", response_model=list[LiveVehicleSummary])
def get_live_vehicle_overview(
  db: Session = Depends(get_db),
  current_admin: Account = Depends(require_role(AccountRole.ADMIN)),
):
  """REST snapshot for the Live Map's initial page load, before any
  WebSocket pings have arrived yet. WS handles updates after this;
  this endpoint just establishes the starting state."""
  vehicles = db.query(Vehicle).all()

  results = []
  now = datetime.now(ZoneInfo("Asia/Manila"))
  day_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
  for vehicle in vehicles:
    driver_name = None
    route_label = None
    current_speed = None
    current_lat = None
    current_lng = None

    dispatch = (
      db.query(DispatchLog)
      .filter(
        DispatchLog.vehicle_id == vehicle.vehicle_id,
        DispatchLog.effective_on >= day_start,
        DispatchLog.effective_on < day_start + timedelta(days=1),
      )
      .order_by(DispatchLog.effective_on.desc())
      .first()
    )
    current_location = db.query(DriverLocation).filter(
      DriverLocation.vehicle_id == vehicle.vehicle_id
    ).first()

    if dispatch:
      driver_name = f"{dispatch.driver.first_name} {dispatch.driver.last_name}"
      route_label = dispatch.route.destination.name if dispatch.route and dispatch.route.destination else None

    if current_location:
      if driver_name is None:
        location_driver = db.query(User).filter(User.user_id == current_location.driver_id).first()
        driver_name = (
          f"{location_driver.first_name} {location_driver.last_name}"
          if location_driver else None
        )
      current_speed = float(current_location.speed_kmh)
      current_lat = float(current_location.latitude)
      current_lng = float(current_location.longitude)

    results.append(LiveVehicleSummary(
      vehicle_id=vehicle.vehicle_id,
      plate_number=vehicle.plate_number,
      activity_status=vehicle.activity_status.value,
      body_color=vehicle.body_color,
      driver_name=driver_name,
      route_label=route_label,
      current_speed_kmh=current_speed,
      current_latitude=current_lat,
      current_longitude=current_lng,
    ))

  return results


@router.post("", response_model=VehicleResponse, status_code=status.HTTP_201_CREATED)
def create_vehicle(
  payload: VehicleCreate,
  db: Session = Depends(get_db),
  current_admin: Account = Depends(require_role(AccountRole.ADMIN)),
):
  owner = db.query(User).filter(User.user_id == payload.owner_id).first()
  if owner is None:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Owner (driver) not found")

  if owner.account.status != AccountStatus.ACTIVE:
    raise HTTPException(
      status_code=status.HTTP_400_BAD_REQUEST,
      detail="Only an active driver account can be assigned a vehicle",
    )

  existing_vehicle_for_owner = db.query(Vehicle).filter(Vehicle.owner_id == payload.owner_id).first()
  if existing_vehicle_for_owner:
    raise HTTPException(
      status_code=status.HTTP_400_BAD_REQUEST,
      detail="This driver already owns a vehicle — ownership is strictly one vehicle per driver",
    )

  existing_plate = db.query(Vehicle).filter(Vehicle.plate_number == payload.plate_number).first()
  if existing_plate:
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Plate number already registered")

  existing_body_number = db.query(Vehicle).filter(Vehicle.body_number == payload.body_number).first()
  if existing_body_number:
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Body number already registered")

  vehicle = Vehicle(
    owner_id=payload.owner_id,
    body_color=payload.body_color,
    body_number=payload.body_number,
    plate_number=payload.plate_number,
    vehicle_type=payload.vehicle_type,
    registry_expiration=payload.registry_expiration,
    is_registered=True,
  )
  db.add(vehicle)
  db.commit()
  db.refresh(vehicle)


  log_action(
    db, current_admin.account_id, AuditAction.CREATE, "vehicles", vehicle.vehicle_id,
    f"Created vehicle {vehicle.plate_number} for {owner.first_name} {owner.last_name}",
  )

  return vehicle


@router.get("", response_model=list[VehicleResponse])
def list_vehicles(
  db: Session = Depends(get_db),
  current_admin: Account = Depends(require_role(AccountRole.ADMIN)),
):
  return db.query(Vehicle).all()


@router.get("/{vehicle_id}", response_model=VehicleResponse)
def get_vehicle(
  vehicle_id: int,
  db: Session = Depends(get_db),
  current_admin: Account = Depends(require_role(AccountRole.ADMIN)),
):
  vehicle = db.query(Vehicle).filter(Vehicle.vehicle_id == vehicle_id).first()
  if vehicle is None:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found")
  return vehicle


@router.patch("/{vehicle_id}", response_model=VehicleResponse)
def update_vehicle(
  vehicle_id: int,
  payload: VehicleUpdate,
  db: Session = Depends(get_db),
  current_admin: Account = Depends(require_role(AccountRole.ADMIN)),
):
  vehicle = db.query(Vehicle).filter(Vehicle.vehicle_id == vehicle_id).first()
  if vehicle is None:
    raise HTTPException(
      status_code=status.HTTP_404_NOT_FOUND,
      detail="Vehicle not found"
    )

  update_data = payload.model_dump(exclude_unset=True)
  changes: list[str] = []

  if "plate_number" in update_data and update_data["plate_number"] != vehicle.plate_number:
    duplicate_plate = db.query(Vehicle).filter(
      Vehicle.plate_number == update_data["plate_number"],
      Vehicle.vehicle_id != vehicle_id,
    ).first()
    if duplicate_plate:
      raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Plate number already registered")
    changes.append(f"plate number {vehicle.plate_number} → {update_data['plate_number']}")

  if "owner_id" in update_data and update_data["owner_id"] != vehicle.owner_id:
    new_owner = db.query(User).filter(User.user_id == update_data["owner_id"]).first()
    if new_owner is None or new_owner.account.role != AccountRole.DRIVER:
      raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Owner (driver) not found")
    if new_owner.account.status != AccountStatus.ACTIVE:
      raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only an active driver can own a vehicle")
    owner_vehicle = db.query(Vehicle).filter(
      Vehicle.owner_id == new_owner.user_id,
      Vehicle.vehicle_id != vehicle_id,
    ).first()
    if owner_vehicle:
      raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This driver already owns a vehicle")
    changes.append(
      f"owner {vehicle.owner.first_name} {vehicle.owner.last_name} → {new_owner.first_name} {new_owner.last_name}"
    )

  for field, value in update_data.items():
    if field == "plate_number" and value != vehicle.plate_number:
      continue
    if field == "owner_id" and value != vehicle.owner_id:
      continue
    if field == "body_color" and value != vehicle.body_color:
      changes.append(f"body color {vehicle.body_color} → {value}")
    elif field == "condition" and value != vehicle.condition:
      changes.append(f"condition {vehicle.condition.value} → {value.value}")
    elif field == "registry_expiration" and value != vehicle.registry_expiration:
      changes.append("registry expiration")

  for field, value in update_data.items():
    setattr(vehicle, field, value)

  db.commit()
  db.refresh(vehicle)

  log_action(
    db, current_admin.account_id, AuditAction.UPDATE, "vehicles", vehicle_id,
    f"Updated vehicle {vehicle.plate_number}: {', '.join(changes) or 'no field changes'}",
  )

  return vehicle


@router.delete("/{vehicle_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_vehicle(
  vehicle_id: int,
  db: Session = Depends(get_db),
  current_admin: Account = Depends(require_role(AccountRole.ADMIN)),
):
  """Permanently remove an unused vehicle.

  A vehicle with dispatch history is retained so the dispatch, trip, and
  incident records that refer to it remain valid. Those vehicles must not be
  deleted from the admin UI.
  """
  vehicle = db.query(Vehicle).filter(Vehicle.vehicle_id == vehicle_id).first()
  if vehicle is None:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found")

  has_dispatch_history = db.query(DispatchLog.dispatch_id).filter(
    DispatchLog.vehicle_id == vehicle_id
  ).first()
  if has_dispatch_history:
    raise HTTPException(
      status_code=status.HTTP_409_CONFLICT,
      detail="This vehicle has dispatch history and cannot be deleted",
    )

  plate_number = vehicle.plate_number
  db.delete(vehicle)
  db.commit()

  log_action(
    db, current_admin.account_id, AuditAction.DELETE, "vehicles", vehicle_id,
    f"Deleted unused vehicle {plate_number}",
  )
