from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.account import Account
from app.schemas.auth import LoginRequest, TokenResponse, ChangePasswordRequest
from app.core.security import verify_password, hash_password, create_access_token
from app.core.permissions import get_current_account
from app.enums import AccountStatus

router = APIRouter()


@router.post("/login", response_model=TokenResponse)
def login(credentials: LoginRequest, db: Session = Depends(get_db)):
  account = db.query(Account).filter(Account.username == credentials.username).first()

  # Generic error message deliberately — don't reveal whether the
  # username exists or the password was wrong (prevents enumeration).
  invalid_credentials = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Invalid username or password",
  )

  if account is None:
    raise invalid_credentials

  if not verify_password(credentials.password, account.password_hash):
    raise invalid_credentials

  if account.status != AccountStatus.ACTIVE:
    raise HTTPException(
      status_code=status.HTTP_403_FORBIDDEN,
      detail=f"Account is {account.status.value}",
    )

  account.last_login = datetime.now(timezone.utc)
  db.commit()

  token = create_access_token(account_id=account.account_id, role=account.role)

  return TokenResponse(
    access_token=token,
    must_change_password=account.must_change_password,
  )


@router.post("/change-password")
def change_password(
  payload: ChangePasswordRequest,
  db: Session = Depends(get_db),
  current_account: Account = Depends(get_current_account),
):
  if not verify_password(payload.current_password, current_account.password_hash):
    raise HTTPException(
      status_code=status.HTTP_400_BAD_REQUEST,
      detail="Current password is incorrect",
    )

  if payload.new_password != payload.confirm_password:
    raise HTTPException(
      status_code=status.HTTP_400_BAD_REQUEST,
      detail="New password and confirmation do not match",
    )

  current_account.password_hash = hash_password(payload.new_password)
  current_account.must_change_password = False
  db.commit()

  return {"detail": "Password updated successfully"}