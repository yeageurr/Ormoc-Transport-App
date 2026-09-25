from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.account import Account
from app.models.user import User
from app.models.vehicle import Vehicle
from app.models.route import Route
from app.models.dispatch_log import DispatchLog
from app.schemas.dispatch import CurrentDriverDispatch, DispatchBatchCreate, DispatchCreate, DispatchResponse, DispatchUpdate
from app.core.permissions import get_driver_profile, require_role
from app.enums import AccountRole, AccountStatus, AuditAction, VehicleCondition
from app.services.audit_service import log_action


router = APIRouter()
PH = ZoneInfo("Asia/Manila")


def day_bounds(value: datetime):
  value = value.astimezone(PH) if value.tzinfo else value.replace(tzinfo=PH)
  start = value.replace(hour=0, minute=0, second=0, microsecond=0)
  return start, start + timedelta(days=1)


def validate_dispatch(db: Session, item: DispatchCreate, ignore_id: int | None = None):
  today, _ = day_bounds(datetime.now(PH))
  start, end = day_bounds(item.effective_on)

  if start < today: 
    raise HTTPException(
      status_code = status.HTTP_400_BAD_REQUEST, 
      detail = "Dispatch effective date cannot be in the past"
    )
  
  driver = db.query(User).join(Account).filter(User.user_id == item.driver_id, Account.role == AccountRole.DRIVER).first()

  if not driver: 
    raise HTTPException(
      status_code = status.HTTP_404_NOT_FOUND, 
      detail = "Driver not found"
    )
  
  if driver.account.status != AccountStatus.ACTIVE:
    raise HTTPException(
      status_code = status.HTTP_400_BAD_REQUEST,
      detail = f"Driver's account is {driver.account.status.value} and cannot be dispatched"
    )

  
  vehicle = db.query(Vehicle).filter(Vehicle.vehicle_id == item.vehicle_id).first()

  if not vehicle: 
    raise HTTPException(
      status_code = status.HTTP_404_NOT_FOUND,
      detail = "Vehicle not found"
    )
  
  if vehicle.condition == VehicleCondition.UNDER_MAINTENANCE: 
    raise HTTPException(
      status_code = status.HTTP_400_BAD_REQUEST, 
      detail = "Vehicle is under maintenance and cannot be dispatched"
    )
  
  if not db.query(Route).filter(Route.route_id == item.route_id).first(): 
    raise HTTPException(
      status_code = status.HTTP_404_NOT_FOUND, 
      detail = "Route not found"
    )

  
  query = db.query(DispatchLog).filter(DispatchLog.effective_on >= start, DispatchLog.effective_on < end)

  if ignore_id is not None: 
    query = query.filter(DispatchLog.dispatch_id != ignore_id)

  if query.filter(DispatchLog.driver_id == item.driver_id).first(): 
    raise HTTPException(
      status_code = status.HTTP_400_BAD_REQUEST, 
      detail = "This driver already has a dispatch for that date"
    )
  
  if query.filter(DispatchLog.vehicle_id == item.vehicle_id).first(): 
    raise HTTPException(
      status_code = status.HTTP_400_BAD_REQUEST, 
      detail = "This vehicle already has a dispatch for that date"
    )


@router.get("/driver/current", response_model=CurrentDriverDispatch)
def current_driver_dispatch(db: Session = Depends(get_db), current_driver: Account = Depends(require_role(AccountRole.DRIVER))):
  start, end = day_bounds(datetime.now(PH))
  driver = get_driver_profile(db, current_driver)
  dispatch = db.query(DispatchLog).filter(DispatchLog.driver_id == driver.user_id, DispatchLog.effective_on >= start, DispatchLog.effective_on < end).order_by(DispatchLog.effective_on.desc()).first()
  
  if not dispatch: 
    raise HTTPException(
      status_code = status.HTTP_404_NOT_FOUND, 
      detail = "No dispatch is assigned for today"
    )

  
  route_label = f"{dispatch.route.origin.terminal_name} ↔ {dispatch.route.destination.name}" if dispatch.route and dispatch.route.origin and dispatch.route.destination else "—"
  return CurrentDriverDispatch(
    dispatch_id=dispatch.dispatch_id,
    route_id=dispatch.route_id,
    vehicle_plate=dispatch.vehicle.plate_number if dispatch.vehicle else "—",
    vehicle_activity_status=dispatch.vehicle.activity_status.value if dispatch.vehicle else "unknown",
    route_label=route_label,
    route_geometry=dispatch.route.route_geometry if dispatch.route else None,
  )


@router.post("", response_model=DispatchResponse, status_code=status.HTTP_201_CREATED)
def create_dispatch(item: DispatchCreate, db: Session = Depends(get_db), current_admin: Account = Depends(require_role(AccountRole.ADMIN))):
  validate_dispatch(db, item)


  dispatch = DispatchLog(admin_id=current_admin.account_id, **item.model_dump())
  db.add(dispatch)
  db.commit()
  db.refresh(dispatch)

  log_action(
    db, current_admin.account_id, 
    AuditAction.CREATE, 
    "dispatch_logs", 
    dispatch.dispatch_id,
    f"Created dispatch for driver #{dispatch.driver_id}, vehicle #{dispatch.vehicle_id}, route #{dispatch.route_id} effective {dispatch.effective_on.date()}"
  )

  return dispatch


@router.post("/batch", response_model=list[DispatchResponse], status_code=status.HTTP_201_CREATED)
def create_dispatch_batch(payload: DispatchBatchCreate, db: Session = Depends(get_db), current_admin: Account = Depends(require_role(AccountRole.ADMIN))):
  batch_day, _ = day_bounds(payload.dispatches[0].effective_on)
  drivers, vehicles = set(), set()

  for item in payload.dispatches:
    item_day, _ = day_bounds(item.effective_on)
    if item_day != batch_day: raise HTTPException(400, "A dispatch batch must have one effective date")
    if item.driver_id in drivers or item.vehicle_id in vehicles: 
      raise HTTPException(
        status_code = status.HTTP_400_BAD_REQUEST, 
        detail = "A driver and vehicle can only appear once in a batch"
      )

    drivers.add(item.driver_id); vehicles.add(item.vehicle_id); validate_dispatch(db, item)

  dispatches = [DispatchLog(admin_id=current_admin.account_id, **item.model_dump()) for item in payload.dispatches]

  db.add_all(dispatches)
  db.commit()

  for dispatch in dispatches:
    db.refresh(dispatch)
    log_action(
      db, 
      current_admin.account_id, 
      AuditAction.CREATE, 
      "dispatch_logs", 
      dispatch.dispatch_id,
      f"Created dispatch for driver #{dispatch.driver_id}, vehicle #{dispatch.vehicle_id}, route #{dispatch.route_id} effective {dispatch.effective_on.date()}"
    )

  return dispatches


@router.get("", response_model=list[DispatchResponse])
def list_dispatches(db: Session = Depends(get_db), current_admin: Account = Depends(require_role(AccountRole.ADMIN))):
  return db.query(DispatchLog).order_by(DispatchLog.effective_on.desc()).all()


@router.delete("/group")
def delete_dispatch_group(route_id: int, effective_on: datetime, db: Session = Depends(get_db), current_admin: Account = Depends(require_role(AccountRole.ADMIN))):
  start, end = day_bounds(effective_on)
  today, _ = day_bounds(datetime.now(PH))

  if start <= today: 
    raise HTTPException(
      status_code = status.HTTP_400_BAD_REQUEST, 
      detail = "Current and past dispatches cannot be deleted"
    )

  
  dispatches = db.query(DispatchLog).filter(DispatchLog.route_id == route_id, DispatchLog.effective_on >= start, DispatchLog.effective_on < end).all()

  if not dispatches: 
    raise HTTPException(
      status_code = status.HTTP_404_NOT_FOUND, 
      detail = "Dispatch group not found"
    )
  
  if any(dispatch.trips for dispatch in dispatches): 
    raise HTTPException(
      status_code = status.HTTP_409_CONFLICT, 
      detail = "Dispatches with trip history cannot be deleted"
    )

  
  deleted = [(dispatch.dispatch_id, dispatch.driver_id, dispatch.vehicle_id) for dispatch in dispatches]

  for dispatch in dispatches: db.delete(dispatch)
  db.commit()

  for dispatch_id, driver_id, vehicle_id in deleted:
    log_action(
      db, 
      current_admin.account_id, 
      AuditAction.DELETE, 
      "dispatch_logs", 
      dispatch_id,
      f"Deleted dispatch for driver #{driver_id}, vehicle #{vehicle_id}, route #{route_id} effective {start.date()}"
    )

  return {"detail": f"Deleted {len(deleted)} dispatch assignment(s)"}


@router.get("/{dispatch_id}", response_model=DispatchResponse)
def get_dispatch(dispatch_id: int, db: Session = Depends(get_db), current_admin: Account = Depends(require_role(AccountRole.ADMIN))):
  dispatch = db.query(DispatchLog).filter(DispatchLog.dispatch_id == dispatch_id).first()

  if not dispatch: 
    raise HTTPException(
      status_code = status.HTTP_404_NOT_FOUND, 
      detail = "Dispatch entry not found"
    )
  
  return dispatch


@router.patch("/{dispatch_id}", response_model=DispatchResponse)
def update_dispatch(dispatch_id: int, item: DispatchUpdate, db: Session = Depends(get_db), current_admin: Account = Depends(require_role(AccountRole.ADMIN))):
  dispatch = db.query(DispatchLog).filter(DispatchLog.dispatch_id == dispatch_id).first()

  if not dispatch: 
    raise HTTPException(
      status_code = status.HTTP_404_NOT_FOUND, 
      detail = "Dispatch entry not found"
    )

  
  today, _ = day_bounds(datetime.now(PH))
  old_day, _ = day_bounds(dispatch.effective_on)

  if old_day <= today: 
    raise HTTPException(
      status_code = status.HTTP_400_BAD_REQUEST, 
      detail = "Current and past dispatches cannot be edited"
    )

  
  validate_dispatch(db, item, dispatch_id)
  previous = {field: getattr(dispatch, field) for field in item.model_dump()}

  for field, value in item.model_dump().items(): 
    setattr(dispatch, field, value)


  db.commit()
  db.refresh(dispatch)

  changed = [f"{field}: {previous[field]} → {getattr(dispatch, field)}" for field in previous if previous[field] != getattr(dispatch, field)]

  log_action(
    db, 
    current_admin.account_id, 
    AuditAction.UPDATE, 
    "dispatch_logs", 
    dispatch.dispatch_id,
    f"Updated dispatch ({'; '.join(changed) or 'no field changes'})"
  )

  return dispatch
