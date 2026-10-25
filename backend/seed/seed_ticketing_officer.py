"""Seed the initial named ticketing officer account.

Run from the backend directory after applying migrations:
    python -m seed.seed_ticketing_officer

This seed is safe to rerun: an existing account is not reactivated and its
password is never reset. New accounts must change the temporary password.
"""
import os
import sys

sys.path.insert(0, os.getcwd())

from dotenv import load_dotenv

from app.core.security import hash_password
from app.database import SessionLocal
from app.enums import AccountRole, AccountStatus
from app.models.account import Account
from app.services.account_service import generate_account_code

load_dotenv()

OFFICER_NAME = "Anthony Development"
OFFICER_EMAIL = "domasiganthony139@gmail.com"
OFFICER_PHONE = "09653257882"
OFFICER_ROLE = AccountRole.TICKETING_OFFICER


def seed_ticketing_officer():
  db = SessionLocal()
  try:
    existing = db.query(Account).filter(
      (Account.username == OFFICER_PHONE) | (Account.email == OFFICER_EMAIL)
    ).first()
    if existing:
      if existing.role != OFFICER_ROLE:
        raise RuntimeError(
          "The supplied phone or email already belongs to a non-ticketing-officer account; "
          "no account was changed."
        )
      changed = False
      if existing.display_name != OFFICER_NAME:
        existing.display_name = OFFICER_NAME
        changed = True
      if existing.email != OFFICER_EMAIL:
        existing.email = OFFICER_EMAIL
        changed = True
      if changed:
        db.commit()
        print("Updated the existing ticketing officer's display name and email.")
      else:
        print("The ticketing officer account already exists; credentials and status were left unchanged.")
      print(f"  username: {OFFICER_PHONE}")
      print(f"  account_id: {existing.account_id}")
      print(f"  status: {existing.status.value}")
      return

    officer = Account(
      account_code=generate_account_code(db),
      username=OFFICER_PHONE,
      display_name=OFFICER_NAME,
      email=OFFICER_EMAIL,
      password_hash=hash_password(OFFICER_PHONE),
      role=OFFICER_ROLE,
      status=AccountStatus.ACTIVE,
      must_change_password=True,
    )
    db.add(officer)
    db.commit()
    db.refresh(officer)

    print("Ticketing officer account created successfully.")
    print(f"  name: {OFFICER_NAME}")
    print(f"  email: {OFFICER_EMAIL}")
    print(f"  username: {OFFICER_PHONE}")
    print(f"  account_id: {officer.account_id}")
    print(f"  account_code: {officer.account_code}")
    print("  temporary password: same as username; change required at first login")
  except Exception:
    db.rollback()
    raise
  finally:
    db.close()


if __name__ == "__main__":
  seed_ticketing_officer()
