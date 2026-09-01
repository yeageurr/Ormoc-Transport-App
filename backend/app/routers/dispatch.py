from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.account import Account
from app.models.user import User
from app.models.vehicle import Vehicle
from app.models.route import Route
from app.models.dispatch_log import DispatchLog
from app.schemas.dispatch import DispatchCreate, DispatchResponse
from app.core.permissions import require_role
from app.enums import AccountRole, AccountStatus, VehicleCondition

router = APIRouter()


@router.post("", response_model=DispatchResponse, status_code=status.HTTP_201_CREATED)
def create_dispatch(
  payload: DispatchCreate,
  db: Session = Depends(get_db),
  current_admin: Account = Depends(require_role(AccountRole.ADMIN)),
):
  driver = (
    db.query(User)
    .join(Account)
    .filter(User.user_id == payload.driver_id, Account.role == AccountRole.DRIVER)
    .first()
  )
  if driver is None:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Driver not found")

  if driver.account.status != AccountStatus.ACTIVE:
    raise HTTPException(
      status_code=status.HTTP_400_BAD_REQUEST,
      detail=f"Driver's account is {driver.account.status.value} and cannot be dispatched",
    )

  vehicle = db.query(Vehicle).filter(Vehicle.vehicle_id == payload.vehicle_id).first()
  if vehicle is None:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found")

  if vehicle.condition == VehicleCondition.UNDER_MAINTENANCE:
    raise HTTPException(
      status_code=status.HTTP_400_BAD_REQUEST,
      detail="Vehicle is under maintenance and cannot be dispatched",
    )

  route = db.query(Route).filter(Route.route_id == payload.route_id).first()
  if route is None:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Route not found")

  dispatch = DispatchLog(
    admin_id=current_admin.account_id,
    driver_id=payload.driver_id,
    vehicle_id=payload.vehicle_id,
    route_id=payload.route_id,
    effective_on=payload.effective_on,
  )
  db.add(dispatch)
  db.commit()
  db.refresh(dispatch)

  return dispatch


@router.get("", response_model=list[DispatchResponse])
def list_dispatches(
  db: Session = Depends(get_db),
  current_admin: Account = Depends(require_role(AccountRole.ADMIN)),
):
  """Displayed grouped by effective_on date in the UI — the query itself
  just returns all rows, ordered most recent first."""
  return db.query(DispatchLog).order_by(DispatchLog.effective_on.desc()).all()


@router.get("/{dispatch_id}", response_model=DispatchResponse)
def get_dispatch(
  dispatch_id: int,
  db: Session = Depends(get_db),
  current_admin: Account = Depends(require_role(AccountRole.ADMIN)),
):
  dispatch = db.query(DispatchLog).filter(DispatchLog.dispatch_id == dispatch_id).first()
  if dispatch is None:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dispatch entry not found")
  return dispatch