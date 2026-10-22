import logging
from datetime import datetime
from typing import Iterable
from zoneinfo import ZoneInfo

from fastapi import Request

from app.enums import AccountRole
from app.models.account import Account
from app.services.email_service import send_account_activity_email

logger = logging.getLogger(__name__)
LOCAL_TIMEZONE = ZoneInfo("Asia/Manila")


def _performer_details(request: Request) -> tuple[str, str, str]:
  action_time = datetime.now(LOCAL_TIMEZONE)
  forwarded_for = request.headers.get("x-forwarded-for", "").split(",", 1)[0].strip()
  performer_ip = (
    forwarded_for
    or request.headers.get("cf-connecting-ip")
    or request.headers.get("x-real-ip")
    or (request.client.host if request.client else None)
    or "Unavailable"
  )
  return action_time.strftime("%B %d, %Y"), action_time.strftime("%I:%M %p PHT"), performer_ip


def _send(recipient: str | None, subject: str, notice: str) -> None:
  if not recipient:
    logger.warning("Skipping account activity email because the recipient has no email address")
    return
  try:
    send_account_activity_email(recipient, subject, notice)
  except Exception:
    # The database action has already succeeded; mail delivery must not undo it.
    logger.exception("Could not send account activity email")


def _send_to_unique_recipients(recipients: Iterable[str | None], subject: str, notice: str) -> None:
  sent: set[str] = set()
  for recipient in recipients:
    if recipient and recipient.lower() not in sent:
      sent.add(recipient.lower())
      _send(recipient, subject, notice)


def notify_ticketing_officer_user_created(officer: Account) -> None:
  _send(
    officer.email,
    "New user account created",
    "A new user account has been created, review these changes if it wasn't you who performed the action. "
    "If it wasn't you, immediately change your password to avoid any further changes.",
  )


def notify_password_changed(account: Account, request: Request, recipient: str | None = None) -> None:
  action_date, action_time, performer_ip = _performer_details(request)
  if account.role == AccountRole.TICKETING_OFFICER:
    notice = (
      f"Notice: Your password was changed on: {action_date} at {action_time} ({performer_ip}). "
      "If this wasn't you, kindly update your password using your email via forgot password. "
      "Disregard if it was you."
    )
    subject = "Ticketing officer account password changed"
  else:
    notice = (
      f"Notice: Your password was updated on: {action_date}, at: {action_time} - {performer_ip}. "
      "If this wasn't you, kindly update your password to avoid any further actions. "
      "Disregard this message if it was you."
    )
    subject = "Driver account password updated"
  _send(recipient or account.email or (account.user.email if account.user else None), subject, notice)


def notify_driver_profile_updated(recipients: Iterable[str | None], request: Request) -> None:
  action_date, action_time, performer_ip = _performer_details(request)
  notice = (
    f"Notice: Your profile was updated on: {action_date}, at: {action_time} - {performer_ip}. "
    "If this wasn't you, kindly update your password to avoid any further actions. "
    "Disregard this message if it was you."
  )
  _send_to_unique_recipients(recipients, "Driver profile updated", notice)
