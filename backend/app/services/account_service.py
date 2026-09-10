import random
from datetime import datetime

from sqlalchemy.orm import Session

from app.models.account import Account


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
