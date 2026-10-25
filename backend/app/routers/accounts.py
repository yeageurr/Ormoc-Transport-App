import secrets
import string
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models.account import Account
from app.models.user import User
from app.models.dispatch_log import DispatchLog
from app.models.dispatch_ticket import DispatchTicket
from app.models.dispatcher_assignment import DispatcherAssignment
from app.models.dispatcher_profile import DispatcherProfile
from app.models.route import Route
from app.models.trip import Trip
from app.models.vehicle import Vehicle
from app.models.queue_reservation import QueueReservation
from app.schemas.user import DriverCreate, DispatcherCreate, DriverAdminUpdate, UserResponse
from app.core.security import hash_password
from app.core.permissions import require_role
from app.services.account_service import generate_account_code, generate_driver_id
from app.enums import AccountRole, AccountStatus, TripStatus
from app.services.account_activity_email import notify_ticketing_officer_user_created, notify_driver_profile_updated

router = APIRouter()
PH_TIMEZONE = ZoneInfo("Asia/Manila")


def generate_temp_password(num: str) -> str:
  return num


@router.get("/dispatchers")
def list_dispatchers(
  db: Session = Depends(get_db),
  ticketing_officer: Account = Depends(require_role(AccountRole.TICKETING_OFFICER)),
):
  """Return active dispatcher accounts available for a daily route assignment."""
  dispatchers = (
    db.query(Account)
    .filter(Account.role == AccountRole.DISPATCHER, Account.status == AccountStatus.ACTIVE)
    .options(joinedload(Account.user))
    .order_by(Account.account_code.asc())
    .all()
  )
  profiles = {
    profile.account_id: profile
    for profile in db.query(DispatcherProfile).all()
  }
  return [
    {
      "account_id": item.account_id,
      "full_name": (
        f"{profiles[item.account_id].first_name} {profiles[item.account_id].last_name}"
        if item.account_id in profiles
        else f"{item.user.first_name} {item.user.last_name}" if item.user else None
      ),
    }
    for item in dispatchers
  ]


@router.get("/portal-users")
def list_portal_users(
  db: Session = Depends(get_db),
  ticketing_officer: Account = Depends(require_role(AccountRole.TICKETING_OFFICER)),
):
  """Return ticketing-portal user rows and the operational details used by the view modal."""
  now = datetime.now(PH_TIMEZONE)
  accounts = (
    db.query(Account)
    .filter(Account.role.in_((AccountRole.DRIVER, AccountRole.DISPATCHER)))
    .options(joinedload(Account.user).joinedload(User.vehicle))
    .order_by(Account.created_on.desc())
    .all()
  )
  today_assignments = (
    db.query(DispatcherAssignment)
    .filter(
      DispatcherAssignment.operating_date == now.date(),
      DispatcherAssignment.closed_at.is_(None),
    )
    .all()
  )
  assignments_by_dispatcher = {assignment.dispatcher_id: assignment for assignment in today_assignments}
  dispatcher_profiles = {
    profile.account_id: profile
    for profile in db.query(DispatcherProfile).all()
  }
  result = []

  for account in accounts:
    user = account.user
    row = {
      "account_id": account.account_id,
      "account_code": account.account_code,
      "username": account.username,
      "email": account.email,
      "role": account.role.value,
      "status": account.status.value,
      "created_on": account.created_on,
      "last_login": account.last_login,
      "personal": None,
      "vehicle": None,
      "current_assignment": None,
      "current_trip": None,
    }

    if account.role == AccountRole.DISPATCHER:
      profile = dispatcher_profiles.get(account.account_id)
      assignment = assignments_by_dispatcher.get(account.account_id)
      route = db.query(Route).filter(Route.route_id == assignment.route_id).first() if assignment else None
      row["personal"] = {
        "first_name": profile.first_name if profile else None,
        "last_name": profile.last_name if profile else None,
        "contact_number": profile.contact_number if profile else account.username,
        "email": account.email,
      }
      row["current_assignment"] = {
        "operating_date": assignment.operating_date,
        "opened_at": assignment.created_at,
        "route": _route_summary(route),
      } if assignment else None
    elif user is not None:
      row["personal"] = {
        "driver_id": user.driver_id,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "contact_number": user.contact_number,
        "email": user.email,
        "license_num": user.license_num,
        "license_expiry": user.license_expiry,
      }
      row["vehicle"] = _vehicle_summary(user.vehicle)
      active_trip = (
        db.query(Trip)
        .outerjoin(DispatchLog, Trip.dispatch_id == DispatchLog.dispatch_id)
        .filter(
          Trip.is_complete.is_(False),
          or_(Trip.driver_id == user.user_id, DispatchLog.driver_id == user.user_id),
        )
        .order_by(Trip.time_departed.desc())
        .first()
      )
      if active_trip is not None:
        dispatch = active_trip.dispatch_log
        ticket = active_trip.dispatch_ticket
        ticket_route = None
        if ticket is not None:
          ticket_route = db.query(Route).filter(Route.route_id == ticket.route_id).first()
        route = dispatch.route if dispatch is not None else ticket_route
        if route is None:
          today_dispatch = (
            db.query(DispatchLog)
            .filter(
              DispatchLog.driver_id == user.user_id,
              DispatchLog.effective_on >= now.replace(hour=0, minute=0, second=0, microsecond=0),
              DispatchLog.effective_on < now.replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=1),
            )
            .order_by(DispatchLog.effective_on.desc())
            .first()
          )
          route = today_dispatch.route if today_dispatch is not None else None
        if route is None:
          reservation = (
            db.query(QueueReservation)
            .filter(QueueReservation.driver_id == user.user_id)
            .order_by(QueueReservation.reserved_at.desc())
            .first()
          )
          route = reservation.route if reservation is not None else None
        # Older trip-start requests do not store dispatch_ticket_id. For an
        # outgoing trip, fall back to the driver's used ticket on the same
        # operating date and route so the officer can still inspect it.
        if ticket is None and active_trip.status == TripStatus.OUTGOING:
          departed = active_trip.time_departed
          trip_date = departed.astimezone(PH_TIMEZONE).date() if departed.tzinfo else departed.date()
          ticket_query = db.query(DispatchTicket).filter(
            DispatchTicket.driver_id == user.user_id,
            DispatchTicket.operating_date == trip_date,
            DispatchTicket.used_at.is_not(None),
          )
          if route is not None:
            ticket_query = ticket_query.filter(DispatchTicket.route_id == route.route_id)
          ticket = ticket_query.order_by(DispatchTicket.used_at.desc()).first()
          if ticket is not None and ticket_route is None:
            ticket_route = db.query(Route).filter(Route.route_id == ticket.route_id).first()
          if route is None:
            route = ticket_route
        vehicle = dispatch.vehicle if dispatch is not None else active_trip.vehicle
        row["current_trip"] = {
          "trip_id": active_trip.trip_id,
          "direction": active_trip.status.value,
          "started_at": active_trip.time_departed,
          "route": _route_summary(route),
          "vehicle": _vehicle_summary(vehicle),
          "ticket": _ticket_summary(ticket, route),
        }
    result.append(row)
  return result


def _route_summary(route: Route | None):
  if route is None:
    return None
  origin = route.origin.terminal_name if route.origin else "Terminal"
  destination = route.destination.name if route.destination else "Destination"
  return {
    "route_id": route.route_id,
    "queue_prefix": route.queue_prefix,
    "name": f"{origin} ↔ {destination}",
    "origin": origin,
    "destination": destination,
    "distance_km": float(route.distance) if route.distance is not None else None,
  }


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


def _ticket_summary(ticket: DispatchTicket | None, route: Route | None):
  if ticket is None:
    return None
  status_text = "Used" if ticket.used_at else "Cancelled" if ticket.cancelled_at else "Expired" if ticket.expired_at else "Valid"
  return {
    "ticket_id": str(ticket.id),
    "reference": ticket.public_reference,
    "queue_number": f"{route.queue_prefix}-{ticket.queue_number:04d}" if route else str(ticket.queue_number),
    "generated_at": ticket.created_at,
    "status": status_text,
  }


@router.post("/drivers", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_driver(
  payload: DriverCreate,
  db: Session = Depends(get_db),
  ticketing_officer: Account = Depends(require_role(AccountRole.TICKETING_OFFICER)),
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
  db.commit()
  db.refresh(driver)

  from app.services.audit_service import log_action
  from app.enums import AuditAction
  log_action(
    db, ticketing_officer.account_id, AuditAction.CREATE, "users", driver.user_id,
    f"Created driver account for {payload.first_name} {payload.last_name} ({payload.contact_number})",
    context={"account_id": account.account_id, "user_id": driver.user_id, "role": "driver"},
  )
  if created_vehicle is not None:
    log_action(
      db, ticketing_officer.account_id, AuditAction.CREATE, "vehicles", created_vehicle.vehicle_id,
      f"Created vehicle {created_vehicle.plate_number} for {payload.first_name} {payload.last_name}",
      context={"account_id": account.account_id, "user_id": driver.user_id, "vehicle_id": created_vehicle.vehicle_id},
    )
  notify_ticketing_officer_user_created(ticketing_officer)

  # In a real deployment this would be relayed to the ticketing officer creating the
  # account (e.g. displayed once in the UI), not returned in the API response.
  print(f"[seed] Temp password for {payload.contact_number}: {temp_password}")

  return driver


@router.post("/dispatchers", status_code=status.HTTP_201_CREATED)
def create_dispatcher(
  payload: DispatcherCreate,
  db: Session = Depends(get_db),
  ticketing_officer: Account = Depends(require_role(AccountRole.TICKETING_OFFICER)),
):
  if db.query(Account).filter(Account.username == payload.contact_number).first() or db.query(User).filter(User.contact_number == payload.contact_number).first():
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="An account with this contact number already exists")
  if payload.email and db.query(Account).filter(Account.email == payload.email).first():
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="An account with this email already exists")
  if payload.email and db.query(User).filter(User.email == payload.email).first():
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A user with this email already exists")

  account = Account(
    account_code=generate_account_code(db),
    username=payload.contact_number,
    email=payload.email,
    password_hash=hash_password(payload.contact_number),
    role=AccountRole.DISPATCHER,
    status=AccountStatus.ACTIVE,
    must_change_password=True,
  )
  db.add(account)
  db.flush()
  profile = DispatcherProfile(
    account_id=account.account_id,
    first_name=payload.first_name.strip(),
    last_name=payload.last_name.strip(),
    contact_number=payload.contact_number,
  )
  db.add(profile)
  db.commit()
  db.refresh(account)

  from app.services.audit_service import log_action
  from app.enums import AuditAction
  log_action(
    db, ticketing_officer.account_id, AuditAction.CREATE, "accounts", account.account_id,
    f"Created dispatcher account for {payload.first_name} {payload.last_name} ({payload.contact_number})",
    context={"account_id": account.account_id, "role": "dispatcher"},
  )
  notify_ticketing_officer_user_created(ticketing_officer)
  return {
    "account_id": account.account_id,
    "account_code": account.account_code,
    "username": account.username,
    "email": account.email,
    "role": account.role.value,
    "status": account.status.value,
    "created_on": account.created_on,
    "last_login": account.last_login,
    "must_change_password": account.must_change_password,
    "personal": {
      "first_name": profile.first_name,
      "last_name": profile.last_name,
      "contact_number": profile.contact_number,
    },
  }


@router.get("/drivers", response_model=list[UserResponse])
def list_drivers(
  db: Session = Depends(get_db),
  ticketing_officer: Account = Depends(require_role(AccountRole.TICKETING_OFFICER)),
):
  return (
    db.query(User)
    .join(Account)
    .filter(Account.role == AccountRole.DRIVER)
    .options(joinedload(User.account))
    .all()
  )


@router.patch("/drivers/{user_id}/suspend")
async def suspend_driver(
  user_id: int,
  db: Session = Depends(get_db),
  ticketing_officer: Account = Depends(require_role(AccountRole.TICKETING_OFFICER)),
):
  driver = db.query(User).filter(User.user_id == user_id).first()
  if driver is None:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Driver not found")

  driver.account.status = AccountStatus.SUSPENDED
  db.commit()

  from app.services.audit_service import log_action
  from app.enums import AuditAction
  log_action(
    db, ticketing_officer.account_id, AuditAction.SUSPEND, "accounts", driver.account_id,
    f"Suspended driver account for {driver.first_name} {driver.last_name}",
  )

  from app.routers.notifications import send_targeted_notification
  from app.enums import NotificationType
  await send_targeted_notification(
    db, driver.account_id, NotificationType.SUSPENSION,
    "Your account has been suspended. Contact the ticketing officer for details.",
  )

  return {"detail": f"Driver {driver.first_name} {driver.last_name} has been suspended"}


@router.patch("/drivers/{user_id}/reactivate")
async def reactivate_driver(
  user_id: int,
  db: Session = Depends(get_db),
  ticketing_officer: Account = Depends(require_role(AccountRole.TICKETING_OFFICER)),
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
    db, ticketing_officer.account_id, AuditAction.UPDATE, "accounts", driver.account_id,
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
def ticketing_officer_update_driver(
  user_id: int,
  payload: DriverAdminUpdate,
  request: Request,
  db: Session = Depends(get_db),
  ticketing_officer: Account = Depends(require_role(AccountRole.TICKETING_OFFICER)),
):
  """Admin-facing edit — unlike PATCH /users/me, this CAN touch
  contact_number (which also means updating the linked account's
  username, since drivers log in with their phone number)."""
  driver = db.query(User).filter(User.user_id == user_id).first()
  if driver is None:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Driver not found")

  update_data = payload.model_dump(exclude_unset=True)
  old_emails = (driver.email, driver.account.email)
  profile_changed = any(getattr(driver, field) != value for field, value in update_data.items())

  if "contact_number" in update_data and update_data["contact_number"] != driver.contact_number:
    existing = db.query(Account).filter(Account.username == update_data["contact_number"]).first()
    if existing:
      raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Contact number already in use")
    driver.account.username = update_data["contact_number"]

  if "license_num" in update_data and update_data["license_num"] != driver.license_num:
    existing = db.query(User).filter(User.license_num == update_data["license_num"]).first()
    if existing:
      raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="License number already in use")

  for field, value in update_data.items():
    setattr(driver, field, value)
  if "email" in update_data:
    driver.account.email = update_data["email"]

  db.commit()
  db.refresh(driver)

  from app.services.audit_service import log_action
  from app.enums import AuditAction
  log_action(
    db, ticketing_officer.account_id, AuditAction.UPDATE, "users", driver.user_id,
    f"Updated driver profile for {driver.first_name} {driver.last_name}",
  )
  if profile_changed:
    notify_driver_profile_updated((*old_emails, driver.email, driver.account.email), request)

  return driver


@router.delete("/drivers/{user_id}")
def delete_driver(
  user_id: int,
  db: Session = Depends(get_db),
  ticketing_officer: Account = Depends(require_role(AccountRole.TICKETING_OFFICER)),
):
  """Soft-delete only — flips status to DISABLED rather than actually
  removing the row, preserving historical dispatch/trip/incident records
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
    db, ticketing_officer.account_id, AuditAction.DELETE, "accounts", driver.account_id,
    f"Disabled (soft-deleted) driver account for {driver.first_name} {driver.last_name}",
  )

  return {"detail": f"Driver {driver.first_name} {driver.last_name} has been disabled"}
