

"""
Run once, during initial deployment, to create the first ticketing officer account.
Usage: python -m seed.seed_ticketing_officer
"""
import os
import sys

sys.path.insert(0, os.getcwd())

from dotenv import load_dotenv
from app.database import SessionLocal
from app.models.account import Account
from app.core.security import hash_password
from app.services.account_service import generate_account_code
from app.enums import AccountRole, AccountStatus

load_dotenv()

SEED_OFFICER_USERNAME = os.getenv("SEED_TICKETING_OFFICER_USERNAME", os.getenv("SEED_ADMIN_USERNAME", "ticketing"))
SEED_OFFICER_PASSWORD = os.getenv("SEED_TICKETING_OFFICER_PASSWORD", os.getenv("SEED_ADMIN_PASSWORD", "changeme123"))
SEED_OFFICER_EMAIL = os.getenv("SEED_TICKETING_OFFICER_EMAIL", os.getenv("SEED_ADMIN_EMAIL", ""))


def seed_ticketing_officer():
  db = SessionLocal()
  try:
    existing = db.query(Account).filter(Account.username == SEED_OFFICER_USERNAME).first()
    if existing:
      if not existing.email:
        existing.email = SEED_OFFICER_EMAIL or None
        db.commit()
        print(f"Added reset email for existing ticketing officer '{SEED_OFFICER_USERNAME}'.")
      else:
        print(f"Ticketing officer '{SEED_OFFICER_USERNAME}' already exists — skipping.")
      return

    officer = Account(
      account_code=generate_account_code(db),
      username=SEED_OFFICER_USERNAME,
      email=SEED_OFFICER_EMAIL or None,
      password_hash=hash_password(SEED_OFFICER_PASSWORD),
      role=AccountRole.TICKETING_OFFICER,
      status=AccountStatus.ACTIVE,
      must_change_password=True,
    )
    db.add(officer)
    db.commit()
    db.refresh(officer)

    print("Ticketing officer account created successfully.")
    print(f"  username: {SEED_OFFICER_USERNAME}")
    print(f"  reset email: {SEED_OFFICER_EMAIL or 'not configured'}")
    print(f"  account_id: {officer.account_id}")
    print(f"  account_code: {officer.account_code}")
    print(f"  ⚠ Default password is set — must_change_password=True, "
          f"the ticketing officer will be forced to change it on first login.")
  finally:
    db.close()


if __name__ == "__main__":
    seed_ticketing_officer()
