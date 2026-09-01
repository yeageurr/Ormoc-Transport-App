import secrets
import string

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models.account import Account
from app.models.user import User
from app.schemas.user import DriverCreate, UserResponse
from app.core.security import hash_password
from app.core.permissions import require_role
from app.enums import AccountRole, AccountStatus

router = APIRouter()


def generate_temp_password(length: int = 10) -> str:
  alphabet = string.ascii_letters + string.digits
  return "".join(secrets.choice(alphabet) for _ in range(length))


@router.post("/drivers", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_driver(payload: DriverCreate, db: Session = Depends(get_db), current_admin: Account = Depends(require_role(AccountRole.ADMIN))):
  existing_account = db.query(Account).filter(Account.username == payload.contact_number).first()
  if existing_account:
    raise HTTPException(
      status_code=status.HTTP_400_BAD_REQUEST,
      detail="An account with this contact number already exists.",
    )

  existing_license = db.query(User).filter(User.license_num == payload.license_num).first()
  if existing_license:
    raise HTTPException(
      status_code=status.HTTP_400_BAD_REQUEST,
      detail="A driver with this license number already exists.",
    )

  temp_password = payload.password or generate_temp_password()

  account = Account(
    username = payload.contact_number,
    password_hash = hash_password(temp_password),
    role = AccountRole.DRIVER,
    status = AccountStatus.ACTIVE,
    must_change_password = True,
  )
  db.add(account)
  db.flush()

  driver = User(
    account_id = account.account_id,
    first_name = payload.first_name,
    last_name = payload.last_name,
    contact_number = payload.contact_number,
    email = payload.email,
    license_num = payload.license_num,
    license_expiry = payload.license_expiry,
  )
  db.add(driver)
  db.commit()
  db.refresh(driver)

  print(f"[seed] Temp password for {payload.contact_number}: {temp_password}")

  return driver


@router.get("/drivers", response_model=list[UserResponse])
def list_drivers(db: Session = Depends(get_db), current_admin: Account = Depends(require_role(AccountRole.ADMIN)), ):
  return (
    db.query(User)
    .join(Account)
    .filter(Account.role == AccountRole.DRIVER)
    .options(joinedload(User.account))
    .all()
  )


@router.patch("/drivers/{user_id}/suspend")
def suspend_driver(user_id: int, db: Session = Depends(get_db), current_admin: Account = Depends(require_role(AccountRole.ADMIN))):
  driver = db.query(User).filter(User.user_id == user_id).first()
  if driver is None:
    raise HTTPException(
      status_code=status.HTTP_404_NOT_FOUND,
      detail="Driver not found"
    )

  driver.account.status = AccountStatus.SUSPENDED
  db.commit()