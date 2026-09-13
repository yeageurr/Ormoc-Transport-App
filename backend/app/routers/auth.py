from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.account import Account
from app.schemas.auth import LoginRequest, ChangePasswordRequest
from app.core.security import verify_password, hash_password, create_access_token
from app.core.permissions import get_current_account
from app.enums import AccountStatus

router = APIRouter()


@router.post("/login")
def login(credentials: LoginRequest, response: Response, db: Session = Depends(get_db), ):
  account = db.query(Account).filter(Account.username == credentials.username).first()

  print(f"[debug] login attempt username={credentials.username!r}")
  if account:
    print(f"[debug] stored hash={account.password_hash!r}")
  else:
    print("[debug] no account found for that username")

  invalid_credentials = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Invalid username or password",
  )

  if account is None:
    raise invalid_credentials

  print(f"[debug] verify_password result: {verify_password(credentials.password, account.password_hash)}")

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

  response.set_cookie(
    key="access_token",
    value=f"Bearer {token}",
    httponly=True,
    samesite="lax",
    secure=False,   # Set to True in production with HTTPS!
    path="/"
  )

  # 2. Return account payload needed by AuthContext state
  return {
    "access_token": token,
    "token_type": "bearer",
    "user": {
      "account_id": account.account_id,
      "role": account.role,
      "username": account.username,
      "first_name": account.user.first_name if account.user else None,
    },
    "must_change_password": account.must_change_password,
  }



@router.get("/me")
def get_me(current_account: Account = Depends(get_current_account)):
  return {
    "account_id": current_account.account_id,
    "role": current_account.role,
    "username": current_account.username,
    "first_name": current_account.user.first_name if current_account.user else None,
  }


@router.post("/logout")
def logout(response: Response):
  response.delete_cookie(key="access_token", path="/")
  return {"detail": "Logged out successfully"}


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
