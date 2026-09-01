from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.database import get_db
from app.models.account import Account
from app.models.user import User
from app.models.vehicle import Vehicle
from app.schemas.vehicle import VehicleCreate, VehicleUpdate, VehicleResponse
from app.schemas.user import UserResponse
from app.core.permissions import require_role
from app.enums import AccountRole

router = APIRouter()


@router.get("/eligible-owners", response_model=list[UserResponse])
def list_eligible_owners(
  db: Session = Depends(get_db),
  current_admin: Account = Depends(require_role(AccountRole.ADMIN)),
):
  return (
    db.query(User)
    .outerjoin(Vehicle, Vehicle.owner_id == User.user_id)
    .join(Account, User.account_id == Account.account_id)
    .filter(and_(Vehicle.vehicle_id.is_(None), Account.role == AccountRole.DRIVER))
    .all()
  )


@router.post("", response_model=VehicleResponse, status_code=status.HTTP_201_CREATED)
def create_vehicle(
  payload: VehicleCreate,
  db: Session = Depends(get_db),
  current_admin: Account = Depends(require_role(AccountRole.ADMIN)),
):
  owner = db.query(User).filter(User.user_id == payload.owner_id).first()
  if owner is None:
    raise HTTPException(
      status_code=status.HTTP_404_NOT_FOUND, 
      detail="Owner (driver) not found"
    )

  existing_vehicle_for_owner = db.query(Vehicle).filter(Vehicle.owner_id == payload.owner_id).first()
  if existing_vehicle_for_owner:
    raise HTTPException(
      status_code=status.HTTP_400_BAD_REQUEST,
      detail="This driver already owns a vehicle — ownership is strictly one vehicle per driver",
    )

  existing_plate = db.query(Vehicle).filter(Vehicle.plate_number == payload.plate_number).first()
  if existing_plate:
    raise HTTPException(
      status_code=status.HTTP_400_BAD_REQUEST, 
      detail="Plate number already registered"
    )

  existing_body_number = db.query(Vehicle).filter(Vehicle.body_number == payload.body_number).first()
  if existing_body_number:
    raise HTTPException(
      status_code=status.HTTP_400_BAD_REQUEST, 
      detail="Body number already registered"
    )

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
    raise HTTPException(
      status_code=status.HTTP_404_NOT_FOUND, 
      detail="Vehicle not found"
    )
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
  for field, value in update_data.items():
    setattr(vehicle, field, value)

  db.commit()
  db.refresh(vehicle)

  return vehicle