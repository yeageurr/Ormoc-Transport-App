import hashlib
import os
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.account import Account
from app.schemas.auth import ChangePasswordRequest, ForgotPasswordRequest, LoginRequest, ResetPasswordRequest
from app.core.security import verify_password, hash_password, create_access_token
from app.core.permissions import get_current_account
from app.enums import AccountStatus, AuditAction
from app.services.audit_service import log_action
from app.services.email_service import EmailDeliveryError, send_password_reset_email

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
    "must_change_password": current_account.must_change_password,
  }


@router.post("/logout")
def logout(response: Response):
  response.delete_cookie(key="access_token", path="/")
  return {"detail": "Logged out successfully"}


@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
  """Send a reset link without revealing whether the email is registered."""
  generic_response = {"detail": "If an account matches that email, a password reset link has been sent."}
  account = db.query(Account).filter(Account.email == payload.email).first()
  if account is None:
    return generic_response

  raw_token = secrets.token_urlsafe(32)
  account.password_reset_token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
  account.password_reset_expires_at = datetime.now(timezone.utc) + timedelta(minutes=30)
  db.commit()

  app_url = os.getenv("WEB_APP_URL", "http://localhost:5173").rstrip("/")
  reset_url = f"{app_url}/reset-password?token={raw_token}"
  try:
    send_password_reset_email(str(account.email), reset_url)
  except EmailDeliveryError:
    account.password_reset_token_hash = None
    account.password_reset_expires_at = None
    db.commit()
    raise HTTPException(
      status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
      detail="Password reset email is temporarily unavailable. Please try again later.",
    )

  return generic_response


@router.post("/reset-password")
def reset_password(payload: ResetPasswordRequest, response: Response, db: Session = Depends(get_db)):
  if payload.new_password != payload.confirm_password:
    raise HTTPException(
      status_code=status.HTTP_400_BAD_REQUEST,
      detail="New password and confirmation do not match",
    )

  token_hash = hashlib.sha256(payload.token.encode()).hexdigest()
  account = db.query(Account).filter(Account.password_reset_token_hash == token_hash).first()
  now = datetime.now(timezone.utc)
  if account is None or account.password_reset_expires_at is None or account.password_reset_expires_at < now:
    raise HTTPException(
      status_code=status.HTTP_400_BAD_REQUEST,
      detail="This password reset link is invalid or has expired",
    )

  account.password_hash = hash_password(payload.new_password)
  account.must_change_password = False
  account.password_reset_token_hash = None
  account.password_reset_expires_at = None
  db.commit()

  log_action(
    db,
    account.account_id,
    AuditAction.UPDATE,
    "accounts",
    account.account_id,
    "Reset account password by email verification",
  )
  response.delete_cookie(key="access_token", path="/")
  return {"detail": "Password reset successfully. Please sign in with your new password."}


@router.post("/change-password")
def change_password(
  payload: ChangePasswordRequest,
  response: Response,
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

  log_action(
    db,
    current_account.account_id,
    AuditAction.UPDATE,
    "accounts",
    current_account.account_id,
    "Changed account password",
  )

  # End the current browser session. The UI then explicitly directs the user
  # to sign in again, which issues a fresh authentication cookie/JWT.
  response.delete_cookie(key="access_token", path="/")

  return {"detail": "Password updated successfully. Please sign in again."}
