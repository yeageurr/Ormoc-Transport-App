import hashlib
import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.account import Account
from app.models.user import User
from app.models.password_reset_otp import PasswordResetOtp
from app.schemas.auth import (
  ChangePasswordRequest,
  ForgotPasswordRequest,
  LoginRequest,
  PasswordResetCodeRequest,
  PasswordResetCodeVerify,
  PasswordResetComplete,
  ResetPasswordRequest,
  VerifyPasswordRequest,
)
from app.core.security import verify_password, hash_password, create_access_token
from app.core.permissions import get_account_for_password_setup, require_role
from app.enums import AccountRole, AccountStatus, AuditAction
from app.services.audit_service import log_action
from app.services.email_service import EmailDeliveryError, send_password_reset_code, send_password_reset_email
from app.services.account_activity_email import notify_password_changed

router = APIRouter()
PASSWORD_RECOVERY_ROLES = (AccountRole.DRIVER, AccountRole.TICKETING_OFFICER)


@router.post("/verify-password")
def verify_current_password(
  payload: VerifyPasswordRequest,
  current_account: Account = Depends(require_role(AccountRole.TICKETING_OFFICER)),
):
  if not verify_password(payload.password, current_account.password_hash):
    # A bad password supplied for this action does not mean the login session
    # is invalid. 401 is handled globally by the web clients as session expiry.
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password verification failed")
  return {"verified": True}


@router.post("/login")
def login(credentials: LoginRequest, response: Response, db: Session = Depends(get_db), ):
  identity = credentials.username.strip()
  matches = (
    db.query(Account)
    .outerjoin(User, User.account_id == Account.account_id)
    .filter(
      or_(
        Account.username == identity,
        func.lower(Account.email) == identity.lower(),
        func.lower(User.email) == identity.lower(),
      )
    )
    .distinct()
    .all()
  )

  invalid_credentials = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Account doesn't exist",
  )

  if len(matches) != 1:
    raise invalid_credentials

  account = matches[0]

  password_matches = verify_password(credentials.password, account.password_hash)
  expected_role = AccountRole(credentials.portal)
  if not password_matches or account.role != expected_role:
    raise invalid_credentials

  if account.status != AccountStatus.ACTIVE:
    raise invalid_credentials

  account.last_login = datetime.now(timezone.utc)
  db.commit()

  token = create_access_token(account_id=account.account_id, role=account.role)

  response.set_cookie(
    key="access_token",
    value=f"Bearer {token}",
    httponly=True,
    samesite="none",
    secure=True,
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
      "display_name": account.display_name,
      "first_name": account.user.first_name if account.user else None,
      "last_name": account.user.last_name if account.user else None,
      "must_change_password": account.must_change_password,
    },
    "must_change_password": account.must_change_password,
  }



@router.get("/me")
def get_me(
  portal: Literal["ticketing_officer", "driver", "dispatcher"],
  current_account: Account = Depends(get_account_for_password_setup),
):
  if current_account.role != AccountRole(portal):
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Account doesn't exist")
  return {
    "account_id": current_account.account_id,
    "role": current_account.role,
    "username": current_account.username,
    "display_name": current_account.display_name,
    "first_name": current_account.user.first_name if current_account.user else None,
    "last_name": current_account.user.last_name if current_account.user else None,
    "must_change_password": current_account.must_change_password,
  }


@router.post("/logout")
def logout(response: Response):
  response.delete_cookie(key="access_token", path="/")
  return {"detail": "Logged out successfully"}


@router.post("/password-reset/request-code")
def request_password_reset_code(payload: PasswordResetCodeRequest, db: Session = Depends(get_db)):
  email = str(payload.email).strip().lower()
  accounts = (
    db.query(Account)
    .outerjoin(User, User.account_id == Account.account_id)
    .filter(
      Account.role.in_(PASSWORD_RECOVERY_ROLES),
      or_(func.lower(Account.email) == email, func.lower(User.email) == email),
    )
    .distinct()
    .all()
  )
  if not accounts:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No account is registered with this email address")
  if len(accounts) > 1:
    raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This email is linked to multiple accounts. Contact the system operator.")

  account = accounts[0]
  verification = db.query(PasswordResetOtp).filter(PasswordResetOtp.account_id == account.account_id).first()
  now = datetime.now(timezone.utc)
  if verification is not None:
    last_sent = verification.last_sent_at
    if last_sent.tzinfo is None:
      last_sent = last_sent.replace(tzinfo=timezone.utc)
    if now - last_sent < timedelta(seconds=60):
      raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Please wait before requesting another code")

  code = f"{secrets.randbelow(900000) + 100000:06d}"
  salt = secrets.token_hex(16)
  if verification is None:
    verification = PasswordResetOtp(account_id=account.account_id, target_email=email)
    db.add(verification)
  verification.target_email = email
  verification.code_salt = salt
  verification.code_hash = hashlib.sha256(f"{salt}:{code}".encode()).hexdigest()
  verification.expires_at = now + timedelta(minutes=10)
  verification.attempts = 0
  verification.last_sent_at = now
  verification.reset_token_hash = None
  verification.reset_token_expires_at = None
  try:
    send_password_reset_code(verification.target_email, code)
  except EmailDeliveryError as exc:
    db.rollback()
    raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Password reset email is temporarily unavailable") from exc
  db.commit()
  return {"detail": "A 6-digit password reset code was sent to your email address"}


@router.post("/password-reset/resend-code")
def resend_password_reset_code(payload: PasswordResetCodeRequest, db: Session = Depends(get_db)):
  email = str(payload.email).strip().lower()
  verification = (
    db.query(PasswordResetOtp)
    .join(Account, Account.account_id == PasswordResetOtp.account_id)
    .filter(
      Account.role.in_(PASSWORD_RECOVERY_ROLES),
      func.lower(PasswordResetOtp.target_email) == email,
    )
    .first()
  )
  if verification is None:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No active password reset request for this email")

  now = datetime.now(timezone.utc)
  last_sent = verification.last_sent_at
  if last_sent.tzinfo is None:
    last_sent = last_sent.replace(tzinfo=timezone.utc)
  if now - last_sent < timedelta(seconds=60):
    raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Please wait before requesting another code")

  code = f"{secrets.randbelow(900000) + 100000:06d}"
  salt = secrets.token_hex(16)
  verification.code_salt = salt
  verification.code_hash = hashlib.sha256(f"{salt}:{code}".encode()).hexdigest()
  verification.expires_at = now + timedelta(minutes=10)
  verification.attempts = 0
  verification.last_sent_at = now
  verification.reset_token_hash = None
  verification.reset_token_expires_at = None
  try:
    send_password_reset_code(verification.target_email, code)
  except EmailDeliveryError as exc:
    db.rollback()
    raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Password reset email is temporarily unavailable") from exc
  db.commit()
  return {"detail": "A new password reset code was sent"}


@router.post("/password-reset/verify-code")
def verify_password_reset_code(payload: PasswordResetCodeVerify, db: Session = Depends(get_db)):
  email = str(payload.email).strip().lower()
  verification = (
    db.query(PasswordResetOtp)
    .join(Account, Account.account_id == PasswordResetOtp.account_id)
    .filter(
      Account.role.in_(PASSWORD_RECOVERY_ROLES),
      func.lower(PasswordResetOtp.target_email) == email,
    )
    .first()
  )
  if verification is None:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No active password reset request for this email")

  now = datetime.now(timezone.utc)
  expires_at = verification.expires_at
  if expires_at.tzinfo is None:
    expires_at = expires_at.replace(tzinfo=timezone.utc)
  if expires_at <= now:
    db.delete(verification)
    db.commit()
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="That code has expired. Request a new code.")
  submitted_hash = hashlib.sha256(f"{verification.code_salt}:{payload.code}".encode()).hexdigest()
  if not secrets.compare_digest(submitted_hash, verification.code_hash):
    verification.attempts += 1
    db.commit()
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="That code is incorrect")

  reset_token = secrets.token_urlsafe(32)
  verification.reset_token_hash = hashlib.sha256(reset_token.encode()).hexdigest()
  verification.reset_token_expires_at = now + timedelta(minutes=10)
  db.commit()
  return {"reset_token": reset_token}


@router.post("/password-reset/complete")
def complete_password_reset(payload: PasswordResetComplete, request: Request, response: Response, db: Session = Depends(get_db)):
  if payload.new_password != payload.confirm_password:
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="New password and confirmation do not match")

  token_hash = hashlib.sha256(payload.reset_token.encode()).hexdigest()
  verification = db.query(PasswordResetOtp).filter(PasswordResetOtp.reset_token_hash == token_hash).first()
  expires_at = verification.reset_token_expires_at if verification else None
  if expires_at is not None and expires_at.tzinfo is None:
    expires_at = expires_at.replace(tzinfo=timezone.utc)
  if verification is None or expires_at is None or expires_at <= datetime.now(timezone.utc):
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password reset verification expired. Request a new code.")

  account = db.query(Account).filter(
    Account.account_id == verification.account_id,
    Account.role.in_(PASSWORD_RECOVERY_ROLES),
  ).first()
  if account is None:
    db.delete(verification)
    db.commit()
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Driver account not found")

  recipient = verification.target_email
  account.password_hash = hash_password(payload.new_password)
  account.must_change_password = False
  account.password_reset_token_hash = None
  account.password_reset_expires_at = None
  db.delete(verification)
  db.commit()
  log_action(db, account.account_id, AuditAction.UPDATE, "accounts", account.account_id, "Reset driver password with email OTP")
  notify_password_changed(account, request, recipient)
  response.delete_cookie(key="access_token", path="/")
  return {"detail": "Password reset successfully. Please sign in with your new password."}


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
def reset_password(payload: ResetPasswordRequest, request: Request, response: Response, db: Session = Depends(get_db)):
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
  notify_password_changed(account, request)
  response.delete_cookie(key="access_token", path="/")
  return {"detail": "Password reset successfully. Please sign in with your new password."}


@router.post("/change-password")
def change_password(
  payload: ChangePasswordRequest,
  request: Request,
  db: Session = Depends(get_db),
  current_account: Account = Depends(get_account_for_password_setup),
):
  if not current_account.must_change_password:
    raise HTTPException(
      status_code=status.HTTP_403_FORBIDDEN,
      detail="The initial password has already been set. Password changes are unavailable.",
    )

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

  if verify_password(payload.new_password, current_account.password_hash):
    raise HTTPException(
      status_code=status.HTTP_400_BAD_REQUEST,
      detail="Choose a password different from the temporary password.",
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
  notify_password_changed(current_account, request)

  return {"detail": "Password updated successfully.", "must_change_password": False}
