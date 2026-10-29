"""Create the initial admin account from SEED_ADMIN_* environment variables.

Run from the backend directory after applying migrations:
    python -m seed.seed_admin

This seed is safe to rerun: existing accounts are not reactivated and their
passwords are never reset.
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


def seed_admin() -> None:
  username = os.getenv("SEED_ADMIN_USERNAME")
  password = os.getenv("SEED_ADMIN_PASSWORD")
  email = os.getenv("SEED_ADMIN_EMAIL")
  display_name = os.getenv("SEED_ADMIN_NAME", "System Admin")
  if not username or not password or not email:
    raise RuntimeError("Set SEED_ADMIN_USERNAME, SEED_ADMIN_PASSWORD, and SEED_ADMIN_EMAIL first")

  db = SessionLocal()
  try:
    account = db.query(Account).filter(
      (Account.username == username) | (Account.email == email)
    ).first()
    if account:
      if account.role != AccountRole.ADMIN:
        raise RuntimeError("The supplied username or email already belongs to a non-admin account")
      print(f"Admin account already exists (account_id={account.account_id}); credentials and status left unchanged.")
      return

    account = Account(
      account_code=generate_account_code(db),
      username=username,
      display_name=display_name,
      email=email,
      password_hash=hash_password(password),
      role=AccountRole.ADMIN,
      status=AccountStatus.ACTIVE,
      must_change_password=True,
    )
    db.add(account)
    db.commit()
    db.refresh(account)
    print(f"Admin account created (account_id={account.account_id}, account_code={account.account_code}).")
  except Exception:
    db.rollback()
    raise
  finally:
    db.close()


if __name__ == "__main__":
  seed_admin()
