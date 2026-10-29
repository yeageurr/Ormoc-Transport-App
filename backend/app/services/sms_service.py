"""PhilSMS delivery for driver OTP messages."""

from __future__ import annotations

import os

import requests


class SmsDeliveryError(Exception):
  """Raised when PhilSMS is unavailable or rejects an SMS request."""


PHILSMS_SEND_URL = "https://app.philsms.com/api/v3/sms/send"


def normalize_ph_phone(phone: str) -> str:
  """Return a Philippine mobile number in PhilSMS's 63XXXXXXXXXX format."""
  digits = "".join(character for character in phone if character.isdigit())
  if digits.startswith("63") and len(digits) == 12:
    return digits
  if digits.startswith("0") and len(digits) == 11:
    return f"63{digits[1:]}"
  if len(digits) == 10 and digits.startswith("9"):
    return f"63{digits}"
  raise ValueError("Phone number must be a valid Philippine mobile number")


def send_sms(recipient: str, message: str) -> None:
  token = os.getenv("PHILSMS_API_TOKEN", "").strip()
  sender = os.getenv("PHILSMS_SENDER", "").strip()
  if not token or not sender:
    raise SmsDeliveryError("SMS provider is not configured")

  try:
    response = requests.post(
      PHILSMS_SEND_URL,
      headers={
        "Authorization": f"Bearer {token}",
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
      json={
        "recipient": normalize_ph_phone(recipient),
        "sender_id": sender,
        "type": "plain",
        "message": message,
      },
      timeout=15,
    )
    response.raise_for_status()
    result = response.json()
    if not isinstance(result, dict) or result.get("status") != "success":
      raise SmsDeliveryError("PhilSMS rejected the SMS request")
  except (requests.RequestException, ValueError) as exc:
    if isinstance(exc, SmsDeliveryError):
      raise
    raise SmsDeliveryError("Unable to send SMS through PhilSMS") from exc


def send_password_reset_sms(recipient: str, code: str) -> None:
  send_sms(
    recipient,
    f"Your Ormoc Transport App password reset code is {code}. It expires in 10 minutes. "
    "If you did not request this, ignore this message.",
  )
