"""
Run once, during initial deployment, to create the first admin account.
Usage: python -m seed.seed_admin
"""
import os
import sys

sys.path.insert(0, os.getcwd())

from dotenv import load_dotenv
from app.database import SessionLocal
from app.models.account import Account
from app.core.security import hash_password
from app.enums import AccountRole, AccountStatus

load_dotenv()

SEED_ADMIN_USERNAME = os.getenv("SEED_ADMIN_USERNAME", "admin")
SEED_ADMIN_PASSWORD = os.getenv("SEED_ADMIN_PASSWORD", "changeme123")


def seed_admin():
  db = SessionLocal()
  try:
    existing = db.query(Account).filter(Account.username == SEED_ADMIN_USERNAME).first()
    if existing:
      print(f"Admin account '{SEED_ADMIN_USERNAME}' already exists — skipping.")
      return

    admin = Account(
      username=SEED_ADMIN_USERNAME,
      password_hash=hash_password(SEED_ADMIN_PASSWORD),
      role=AccountRole.ADMIN,
      status=AccountStatus.ACTIVE,
      must_change_password=True,
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)

    print(f"Admin account created successfully.")
    print(f"  username: {SEED_ADMIN_USERNAME}")
    print(f"  account_id: {admin.account_id}")
    print(f"  ⚠ Default password is set — must_change_password=True, "
          f"admin will be forced to change it on first login.")
  finally:
    db.close()


if __name__ == "__main__":
  seed_admin()