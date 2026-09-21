import random
import secrets
from datetime import datetime

from sqlalchemy.orm import Session

from app.models.account import Account
from app.models.user import User


def generate_account_code(db: Session) -> str:
  """Format: <4-digit year account was created><3-digit random suffix>,
  e.g. "2026123". Retries on collision — with only a few accounts per
  year this is effectively instant, but guards against the (small but
  real) chance two accounts created the same year roll the same suffix."""
  year = datetime.now().year

  for _ in range(20):  # sane retry cap, not an infinite loop
    suffix = f"{random.randint(0, 999):03d}"
    code = f"{year}{suffix}"

    exists = db.query(Account).filter(Account.account_code == code).first()
    if not exists:
      return code

  raise RuntimeError("Could not generate a unique account_code after 20 attempts")


def generate_driver_id(db: Session) -> str:
  """Create a unique public driver ID, e.g. ``22342-2026``.

  The random five-digit portion avoids exposing the internal sequential
  ``users.user_id`` value.  The database unique constraint remains the final
  collision safeguard.
  """
  year = datetime.now().year

  for _ in range(20):
    code = f"{secrets.randbelow(100_000):05d}-{year}"
    exists = db.query(User.user_id).filter(User.driver_id == code).first()
    if not exists:
      return code

  raise RuntimeError("Could not generate a unique driver_id after 20 attempts")
