"""UniSMS delivery for driver password-reset OTP messages."""

from __future__ import annotations

import os

import requests


class SmsDeliveryError(Exception):
  """Raised when UniSMS is unavailable or rejects an SMS request."""


UNISMS_SEND_URL = "https://unismsapi.com/api/sms"
ACCEPTED_STATUSES = {"pending", "retrying", "sent"}


def normalize_ph_phone(phone: str) -> str:
  """Return a Philippine mobile number in +639XXXXXXXXX format for UniSMS."""
  digits = "".join(character for character in phone if character.isdigit())
  if digits.startswith("63") and len(digits) == 12:
    return f"+{digits}"
  if digits.startswith("0") and len(digits) == 11:
    return f"+63{digits[1:]}"
  if len(digits) == 10 and digits.startswith("9"):
    return f"+63{digits}"
  raise ValueError("Phone number must be a valid Philippine mobile number")


def send_sms(recipient: str, message: str) -> None:
  api_key = os.getenv("UNISMS_SECRET_KEY", "").strip()
  sender_id = os.getenv("UNISMS_SENDER_ID", "").strip()
  if not api_key or not sender_id:
    raise SmsDeliveryError("SMS provider is not configured")

  try:
    response = requests.post(
      UNISMS_SEND_URL,
      auth=(api_key, ""),
      headers={"Accept": "application/json"},
      json={
        "recipient": normalize_ph_phone(recipient),
        "content": message,
        "sender_id": sender_id,
        "metadata": {"template": "driver_password_reset_otp"},
      },
      timeout=15,
    )
    response.raise_for_status()
    result = response.json()
    message_result = result.get("message") if isinstance(result, dict) else None
    delivery_status = message_result.get("status") if isinstance(message_result, dict) else None
    if delivery_status not in ACCEPTED_STATUSES:
      raise SmsDeliveryError("UniSMS rejected the SMS request")
  except (requests.RequestException, ValueError) as exc:
    if isinstance(exc, SmsDeliveryError):
      raise
    raise SmsDeliveryError("Unable to send SMS through UniSMS") from exc


def send_password_reset_sms(recipient: str, code: str) -> None:
  send_sms(
    recipient,
    f"Your Ormoc Transport App password reset code is {code}. It expires in 10 minutes. "
    "If you did not request this, ignore this message.",
  )
