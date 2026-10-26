from datetime import datetime, timedelta, timezone
import hashlib
import hmac
import secrets

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import and_, or_
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.account import Account
from app.models.user import User
from app.models.vehicle import Vehicle
from app.schemas.user import EmailOtpVerify, UserResponse, UserUpdate, UserUpdateResponse
from app.core.permissions import get_current_account, require_role
from app.core.security import verify_password
from app.enums import AccountRole
from app.services.audit_service import log_action
from app.models.email_verification import EmailVerification
from app.services.email_service import EmailDeliveryError, send_email_verification_code
from app.services.account_activity_email import notify_driver_profile_updated

router = APIRouter()


@router.get("/me", response_model=UserResponse)
def get_my_profile(db: Session = Depends(get_db), current_account: Account = Depends(get_current_account), ):
  profile_row = (
    db.query(User, Vehicle.plate_number.label("vehicle_plate_number"))
    .outerjoin(Vehicle, or_(
      Vehicle.borrower_id == User.user_id,
      and_(Vehicle.owner_id == User.user_id, Vehicle.borrower_id.is_(None)),
    ))
    .filter(User.account_id == current_account.account_id)
    .order_by(Vehicle.vehicle_id.asc())
    .first()
  )
  if profile_row is None:
    raise HTTPException(
      status_code=status.HTTP_404_NOT_FOUND,
      detail="No profile linked to this account (ticketing officer accounts do not have a User row)"
    )
  user, vehicle_plate_number = profile_row
  profile = UserResponse.model_validate(user)
  return profile.model_copy(update={"vehicle_plate_number": vehicle_plate_number})


@router.patch("/me", response_model=UserUpdateResponse)
def update_my_profile(payload: UserUpdate, request: Request, db: Session = Depends(get_db), current_account: Account = Depends(get_current_account), ):
  user = db.query(User).filter(User.account_id == current_account.account_id).first()
  if user is None:
    raise HTTPException(
      status_code=status.HTTP_404_NOT_FOUND,
      detail="No profile linked to this account"
    )

  update_data = payload.model_dump(exclude_unset=True)
  new_contact_number = update_data.pop("contact_number", None)
  current_password = update_data.pop("current_password", None)
  phone_changed = new_contact_number is not None and new_contact_number != user.contact_number
  first_name_changed = "first_name" in update_data and update_data["first_name"] != user.first_name
  last_name_changed = "last_name" in update_data and update_data["last_name"] != user.last_name
  previous_emails = (current_account.email, user.email)
  email_was_provided = "email" in update_data
  email_changed = "email" in update_data and update_data["email"] != user.email
  new_email = update_data.pop("email", user.email)
  protected_profile_change = phone_changed or email_changed

  if protected_profile_change:
    if not current_password:
      raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Verify your current password to change your phone number or email",
      )
    if not verify_password(current_password, current_account.password_hash):
      raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Current password is incorrect",
      )

    if phone_changed:
      existing_account = (
        db.query(Account)
        .filter(
          Account.username == new_contact_number,
          Account.account_id != current_account.account_id,
        )
        .first()
      )
      existing_user = (
        db.query(User)
        .filter(User.contact_number == new_contact_number, User.user_id != user.user_id)
        .first()
      )
      if existing_account or existing_user:
        raise HTTPException(
          status_code=status.HTTP_409_CONFLICT,
          detail="That phone number is already in use",
        )

    if email_changed and new_email is not None:
      existing_account_email = (
        db.query(Account)
        .filter(Account.email == new_email, Account.account_id != current_account.account_id)
        .first()
      )
      existing_user_email = (
        db.query(User)
        .filter(User.email == new_email, User.user_id != user.user_id)
        .first()
      )
      if existing_account_email or existing_user_email:
        raise HTTPException(
          status_code=status.HTTP_409_CONFLICT,
          detail="That email address is already in use",
        )

  if phone_changed:
    user.contact_number = new_contact_number
    current_account.username = new_contact_number

  for field, value in update_data.items():
    setattr(user, field, value)

  pending_email = None
  if email_changed and new_email:
    code = f"{secrets.randbelow(900000) + 100000:06d}"
    salt = secrets.token_hex(16)
    verification = (
      db.query(EmailVerification)
      .filter(EmailVerification.account_id == current_account.account_id)
      .first()
    )
    if verification is None:
      verification = EmailVerification(account_id=current_account.account_id)
      db.add(verification)
    verification.pending_email = str(new_email)
    verification.code_salt = salt
    verification.code_hash = hashlib.sha256(f"{salt}:{code}".encode()).hexdigest()
    verification.expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)
    verification.attempts = 0
    verification.last_sent_at = datetime.now(timezone.utc)
    try:
      send_email_verification_code(str(new_email), code)
    except EmailDeliveryError as exc:
      db.rollback()
      raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    pending_email = str(new_email)
  elif email_changed:
    # Clearing an email address does not require mailbox verification.
    user.email = None
    current_account.email = None

  profile_changed_now = phone_changed or first_name_changed or last_name_changed or (email_changed and new_email is None)

  if email_was_provided and not pending_email:
    # An explicit save of the currently active address cancels any older OTP.
    db.query(EmailVerification).filter(
      EmailVerification.account_id == current_account.account_id
    ).delete(synchronize_session=False)

  db.commit()
  db.refresh(user)

  from app.enums import AuditAction
  changed_fields = []
  if phone_changed:
    changed_fields.append("login phone number")
  if email_changed:
    changed_fields.append("email verification requested" if pending_email else "email")
  details = f"Updated own profile, including {', '.join(changed_fields)}" if changed_fields else "Updated own profile"
  log_action(db, current_account.account_id, AuditAction.UPDATE, "users", user.user_id, details)
  if profile_changed_now:
    notify_driver_profile_updated((*previous_emails, user.email, current_account.email), request)
  response = UserUpdateResponse.model_validate(user)
  response.email_verification_pending = pending_email is not None
  response.pending_email = pending_email
  return response


@router.post("/me/verify-email", response_model=UserResponse)
def verify_my_email(payload: EmailOtpVerify, request: Request, db: Session = Depends(get_db), current_account: Account = Depends(get_current_account)):
  user = db.query(User).filter(User.account_id == current_account.account_id).first()
  verification = db.query(EmailVerification).filter(
    EmailVerification.account_id == current_account.account_id
  ).first()
  if user is None or verification is None:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No pending email verification")

  now = datetime.now(timezone.utc)
  expires_at = verification.expires_at
  if expires_at.tzinfo is None:
    expires_at = expires_at.replace(tzinfo=timezone.utc)
  if expires_at <= now:
    db.delete(verification)
    db.commit()
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Verification code expired. Request a new code.")
  if verification.attempts >= 5:
    raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Too many incorrect codes. Request a new code.")

  submitted_hash = hashlib.sha256(f"{verification.code_salt}:{payload.code}".encode()).hexdigest()
  if not hmac.compare_digest(submitted_hash, verification.code_hash):
    verification.attempts += 1
    db.commit()
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="That verification code is incorrect.")

  pending_email = verification.pending_email
  conflicting_account = db.query(Account).filter(
    Account.email == pending_email,
    Account.account_id != current_account.account_id,
  ).first()
  conflicting_user = db.query(User).filter(
    User.email == pending_email,
    User.user_id != user.user_id,
  ).first()
  if conflicting_account or conflicting_user:
    db.delete(verification)
    db.commit()
    raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="That email address is already in use")

  previous_emails = (user.email, current_account.email)
  user.email = pending_email
  current_account.email = pending_email
  db.delete(verification)
  db.commit()
  db.refresh(user)
  from app.enums import AuditAction
  log_action(db, current_account.account_id, AuditAction.UPDATE, "users", user.user_id, "Verified and updated own email")
  notify_driver_profile_updated((*previous_emails, user.email, current_account.email), request)
  return user


@router.post("/me/verify-email/resend")
def resend_my_email_code(db: Session = Depends(get_db), current_account: Account = Depends(get_current_account)):
  verification = db.query(EmailVerification).filter(
    EmailVerification.account_id == current_account.account_id
  ).first()
  if verification is None:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No pending email verification")

  now = datetime.now(timezone.utc)
  last_sent_at = verification.last_sent_at
  if last_sent_at.tzinfo is None:
    last_sent_at = last_sent_at.replace(tzinfo=timezone.utc)
  if now - last_sent_at < timedelta(seconds=60):
    raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Please wait before requesting another code")

  code = f"{secrets.randbelow(900000) + 100000:06d}"
  salt = secrets.token_hex(16)
  verification.code_salt = salt
  verification.code_hash = hashlib.sha256(f"{salt}:{code}".encode()).hexdigest()
  verification.expires_at = now + timedelta(minutes=10)
  verification.attempts = 0
  verification.last_sent_at = now
  try:
    send_email_verification_code(verification.pending_email, code)
  except EmailDeliveryError as exc:
    db.rollback()
    raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
  db.commit()
  return {"detail": "A new verification code was sent"}


# Endpoint for a ticketing officer checking a user profile
@router.get("/{user_id}", response_model=UserResponse)
def get_user(user_id: int, db: Session = Depends(get_db), ticketing_officer: Account = Depends(require_role(AccountRole.TICKETING_OFFICER)), ):
  user = db.query(User).filter(User.user_id == user_id).first()
  if user is None:
    raise HTTPException(
      status_code=status.HTTP_404_NOT_FOUND,
      detail="User not found"
    )
  return user
