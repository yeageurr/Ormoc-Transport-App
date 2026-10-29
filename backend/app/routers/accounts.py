import secrets
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models.account import Account
from app.models.user import User
from app.models.trip import Trip
from app.models.vehicle import Vehicle
from app.schemas.user import DriverCreate, DriverAdminUpdate, UserResponse
from app.core.security import hash_password
from app.core.permissions import require_role
from app.services.account_service import generate_account_code, generate_driver_id
from app.enums import AccountRole, AccountStatus, VehicleActivityStatus
from app.services.account_activity_email import notify_admin_user_created

router = APIRouter()
PH_TIMEZONE = ZoneInfo("Asia/Manila")


def generate_temp_password(num: str) -> str:
  return num


@router.get("/portal-users")
def list_portal_users(
  db: Session = Depends(get_db),
  admin: Account = Depends(require_role(AccountRole.ADMIN)),
):
  """Return driver account and current route-trip details for the admin portal."""
  users = (
    db.query(User)
    .join(Account)
    .filter(Account.role == AccountRole.DRIVER)
    .options(joinedload(User.account), joinedload(User.vehicle), joinedload(User.borrowed_vehicle))
    .order_by(Account.created_on.desc())
    .all()
  )
  rows = []
  for user in users:
    trip = (
      db.query(Trip)
      .filter(Trip.driver_id == user.user_id, Trip.is_complete.is_(False))
      .order_by(Trip.time_departed.desc())
      .first()
    )
    route = trip.route if trip else None
    vehicle = trip.vehicle if trip else user.active_vehicle
    origin = route.origin.terminal_name if route and route.origin else "Terminal"
    destination = route.destination.name if route and route.destination else "Destination"
    rows.append({
      "account_id": user.account.account_id,
      "account_code": user.account.account_code,
      "username": user.account.username,
      "email": user.account.email,
      "role": user.account.role.value,
      "status": user.account.status.value,
      "created_on": user.account.created_on,
      "last_login": user.account.last_login,
      "personal": {
        "driver_id": user.driver_id,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "contact_number": user.contact_number,
        "email": user.email,
        "license_num": user.license_num,
        "license_expiry": user.license_expiry,
      },
      "vehicle": _vehicle_summary(user.active_vehicle),
      "current_assignment": None,
      "current_trip": {
        "trip_id": trip.trip_id,
        "direction": trip.status.value,
        "started_at": trip.time_departed,
        "route": {
          "route_id": route.route_id,
          "name": f"{origin} ↔ {destination}",
          "origin": origin,
          "destination": destination,
          "distance_km": float(route.distance) if route.distance is not None else None,
        } if route else None,
        "vehicle": _vehicle_summary(vehicle),
        "ticket": None,
      } if trip else None,
    })
  return rows


def _vehicle_summary(vehicle: Vehicle | None):
  if vehicle is None:
    return None
  return {
    "vehicle_id": vehicle.vehicle_id,
    "plate_number": vehicle.plate_number.upper(),
    "body_number": vehicle.body_number,
    "body_color": vehicle.body_color,
    "vehicle_type": vehicle.vehicle_type,
    "condition": vehicle.condition.value,
    "activity_status": vehicle.activity_status.value if vehicle.activity_status else None,
    "is_registered": vehicle.is_registered,
    "registry_expiration": vehicle.registry_expiration,
  }


@router.post("/drivers", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_driver(
  payload: DriverCreate,
  db: Session = Depends(get_db),
  admin: Account = Depends(require_role(AccountRole.ADMIN)),
):

  existing_account = db.query(Account).filter(Account.username == payload.contact_number).first()
  existing_driver_phone = db.query(User).filter(User.contact_number == payload.contact_number).first()
  if existing_account or existing_driver_phone:
    raise HTTPException(
      status_code=status.HTTP_400_BAD_REQUEST,
      detail="An account with this contact number already exists",
    )

  existing_license = db.query(User).filter(User.license_num == payload.license_num).first()
  if existing_license:
    raise HTTPException(
      status_code=status.HTTP_400_BAD_REQUEST,
      detail="A driver with this license number already exists",
    )

  if payload.email and db.query(Account).filter(Account.email == payload.email).first():
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="An account with this email already exists")
  if payload.email and db.query(User).filter(User.email == payload.email).first():
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A user with this email already exists")

  if payload.vehicle:
    if db.query(Vehicle).filter(func.upper(Vehicle.plate_number) == payload.vehicle.plate_number.upper()).first():
      raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Plate number already registered")
    if db.query(Vehicle).filter(Vehicle.body_number == payload.vehicle.body_number).first():
      raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Body number already registered")

  borrowed_vehicle = None
  if payload.vehicle_id is not None:
    borrowed_vehicle = db.query(Vehicle).filter(Vehicle.vehicle_id == payload.vehicle_id).with_for_update().first()
    if borrowed_vehicle is None:
      raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Selected vehicle not found")
    if borrowed_vehicle.borrower_id is not None:
      raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Selected vehicle is already borrowed")
    if borrowed_vehicle.owner.account.status != AccountStatus.ACTIVE:
      raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Vehicle owner account is not active")
    if borrowed_vehicle.activity_status != VehicleActivityStatus.ACTIVE:
      raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Selected vehicle is not currently available")

  temp_password = payload.password or generate_temp_password(payload.contact_number)

  account = Account(
    account_code=generate_account_code(db),
    username=payload.contact_number,
    email=payload.email,
    password_hash=hash_password(temp_password),
    role=AccountRole.DRIVER,
    status=AccountStatus.ACTIVE,
    must_change_password=True,
  )
  db.add(account)
  db.flush()  # get account.account_id before creating the linked User row

  driver = User(
    driver_id=generate_driver_id(db),
    account_id=account.account_id,
    first_name=payload.first_name,
    last_name=payload.last_name,
    contact_number=payload.contact_number,
    email=payload.email,
    license_num=payload.license_num,
    license_expiry=payload.license_expiry,
  )
  db.add(driver)
  db.flush()
  created_vehicle = None
  if payload.vehicle:
    created_vehicle = Vehicle(
      owner_id=driver.user_id,
      body_color=payload.vehicle.body_color,
      body_number=payload.vehicle.body_number,
      plate_number=payload.vehicle.plate_number.upper(),
      vehicle_type=payload.vehicle.vehicle_type,
      registry_expiration=payload.vehicle.registry_expiration,
      is_registered=True,
    )
    db.add(created_vehicle)
  elif borrowed_vehicle is not None:
    borrowed_vehicle.borrower_id = driver.user_id
  db.commit()
  db.refresh(driver)

  from app.services.audit_service import log_action
  from app.enums import AuditAction
  log_action(
    db, admin.account_id, AuditAction.CREATE, "users", driver.user_id,
    f"Created driver account for {payload.first_name} {payload.last_name} ({payload.contact_number})",
    context={"account_id": account.account_id, "user_id": driver.user_id, "role": "driver"},
  )
  if created_vehicle is not None:
    log_action(
      db, admin.account_id, AuditAction.CREATE, "vehicles", created_vehicle.vehicle_id,
      f"Created vehicle {created_vehicle.plate_number} for {payload.first_name} {payload.last_name}",
      context={"account_id": account.account_id, "user_id": driver.user_id, "vehicle_id": created_vehicle.vehicle_id},
    )
  elif borrowed_vehicle is not None:
    log_action(
      db, admin.account_id, AuditAction.UPDATE, "vehicles", borrowed_vehicle.vehicle_id,
      f"Assigned borrowed vehicle {borrowed_vehicle.plate_number} to {payload.first_name} {payload.last_name}",
      context={"account_id": account.account_id, "user_id": driver.user_id, "vehicle_id": borrowed_vehicle.vehicle_id, "owner_id": borrowed_vehicle.owner_id},
    )
  notify_admin_user_created(admin)

  # In a real deployment this would be relayed to the admin creating the
  # account (e.g. displayed once in the UI), not returned in the API response.
  print(f"[seed] Temp password for {payload.contact_number}: {temp_password}")

  return driver


@router.get("/drivers", response_model=list[UserResponse])
def list_drivers(
  db: Session = Depends(get_db),
  admin: Account = Depends(require_role(AccountRole.ADMIN)),
):
  drivers = (
    db.query(User)
    .join(Account)
    .filter(Account.role == AccountRole.DRIVER)
    .options(joinedload(User.account), joinedload(User.vehicle), joinedload(User.borrowed_vehicle))
    .all()
  )
  return [
    {
      **UserResponse.model_validate(driver).model_dump(),
      "vehicle_plate_number": driver.active_vehicle.plate_number.upper() if driver.active_vehicle else None,
    }
    for driver in drivers
  ]


@router.patch("/drivers/{user_id}/suspend")
async def suspend_driver(
  user_id: int,
  db: Session = Depends(get_db),
  admin: Account = Depends(require_role(AccountRole.ADMIN)),
):
  driver = db.query(User).filter(User.user_id == user_id).first()
  if driver is None:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Driver not found")

  driver.account.status = AccountStatus.SUSPENDED
  db.commit()

  from app.services.audit_service import log_action
  from app.enums import AuditAction
  log_action(
    db, admin.account_id, AuditAction.SUSPEND, "accounts", driver.account_id,
    f"Suspended driver account for {driver.first_name} {driver.last_name}",
  )

  from app.routers.notifications import send_targeted_notification
  from app.enums import NotificationType
  await send_targeted_notification(
    db, driver.account_id, NotificationType.SUSPENSION,
    "Your account has been suspended. Contact an administrator for details.",
  )

  return {"detail": f"Driver {driver.first_name} {driver.last_name} has been suspended"}


@router.patch("/drivers/{user_id}/reactivate")
async def reactivate_driver(
  user_id: int,
  db: Session = Depends(get_db),
  admin: Account = Depends(require_role(AccountRole.ADMIN)),
):
  """Reactivate a suspended or disabled driver account."""
  driver = db.query(User).filter(User.user_id == user_id).first()
  if driver is None:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Driver not found")

  if driver.account.status not in (AccountStatus.SUSPENDED, AccountStatus.DISABLED):
    raise HTTPException(
      status_code=status.HTTP_400_BAD_REQUEST,
      detail=f"Driver is currently '{driver.account.status.value}', not suspended or disabled — nothing to reactivate",
    )

  previous_status = driver.account.status.value
  driver.account.status = AccountStatus.ACTIVE
  db.commit()

  from app.services.audit_service import log_action
  from app.enums import AuditAction
  log_action(
    db, admin.account_id, AuditAction.UPDATE, "accounts", driver.account_id,
    f"Reactivated driver account for {driver.first_name} {driver.last_name} (was {previous_status})",
  )

  from app.routers.notifications import send_targeted_notification
  from app.enums import NotificationType
  await send_targeted_notification(
    db, driver.account_id, NotificationType.SUSPENSION,
    "Your account has been reactivated. You may now log in normally.",
  )

  return {"detail": f"Driver {driver.first_name} {driver.last_name} has been reactivated"}


@router.patch("/drivers/{user_id}", response_model=UserResponse)
def admin_update_driver(
  user_id: int,
  payload: DriverAdminUpdate,
  db: Session = Depends(get_db),
  admin: Account = Depends(require_role(AccountRole.ADMIN)),
):
  """Update regulatory driver details and the plate of their active vehicle.

  Personal/contact details remain editable only by the driver through
  PATCH /users/me.
  """
  driver = db.query(User).filter(User.user_id == user_id).first()
  if driver is None:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Driver not found")

  update_data = payload.model_dump(exclude_unset=True)
  if not update_data:
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Provide at least one field to update")

  changed_fields = []

  if "license_num" in update_data and update_data["license_num"] != driver.license_num:
    existing = db.query(User).filter(User.license_num == update_data["license_num"]).first()
    if existing:
      raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="License number already in use")
    driver.license_num = update_data["license_num"]
    changed_fields.append("driver license number")

  if "license_expiry" in update_data and update_data["license_expiry"] != driver.license_expiry:
    driver.license_expiry = update_data["license_expiry"]
    changed_fields.append("driver license expiry")

  if "vehicle_plate_number" in update_data:
    vehicle = driver.active_vehicle
    if vehicle is None:
      raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This driver has no active vehicle assigned")

    plate_number = update_data["vehicle_plate_number"]
    if plate_number != vehicle.plate_number:
      existing_vehicle = db.query(Vehicle).filter(
        func.upper(Vehicle.plate_number) == plate_number,
        Vehicle.vehicle_id != vehicle.vehicle_id,
      ).first()
      if existing_vehicle:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Plate number already registered")
      vehicle.plate_number = plate_number
      changed_fields.append("vehicle plate number")

  if changed_fields:
    db.commit()
    db.refresh(driver)

  from app.services.audit_service import log_action
  from app.enums import AuditAction
  log_action(
    db, admin.account_id, AuditAction.UPDATE, "users", driver.user_id,
    (
      f"Updated {', '.join(changed_fields)} for {driver.first_name} {driver.last_name}"
      if changed_fields else f"No changes to regulatory details for {driver.first_name} {driver.last_name}"
    ),
  )

  response = UserResponse.model_validate(driver).model_dump()
  response["vehicle_plate_number"] = driver.active_vehicle.plate_number.upper() if driver.active_vehicle else None
  return response


@router.delete("/drivers/{user_id}")
def delete_driver(
  user_id: int,
  db: Session = Depends(get_db),
  admin: Account = Depends(require_role(AccountRole.ADMIN)),
):
  """Soft-delete only — flips status to DISABLED rather than actually
  removing the row, preserving historical trip records
  tied to this driver via FK. Matches the disabled/suspended distinction
  established earlier: disabled = permanent, not expected to come back."""
  driver = db.query(User).filter(User.user_id == user_id).first()
  if driver is None:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Driver not found")

  driver.account.status = AccountStatus.DISABLED
  db.commit()

  from app.services.audit_service import log_action
  from app.enums import AuditAction
  log_action(
    db, admin.account_id, AuditAction.DELETE, "accounts", driver.account_id,
    f"Disabled (soft-deleted) driver account for {driver.first_name} {driver.last_name}",
  )

  return {"detail": f"Driver {driver.first_name} {driver.last_name} has been disabled"}
