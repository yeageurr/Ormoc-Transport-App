

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
from app.services.account_service import generate_account_code
from app.enums import AccountRole, AccountStatus

load_dotenv()

SEED_ADMIN_USERNAME = os.getenv("SEED_ADMIN_USERNAME", "admin")
SEED_ADMIN_PASSWORD = os.getenv("SEED_ADMIN_PASSWORD", "changeme123")
SEED_ADMIN_EMAIL = os.getenv("SEED_ADMIN_EMAIL", "kadez00.111@gmail.com")


def seed_admin():
  db = SessionLocal()
  try:
    existing = db.query(Account).filter(Account.username == SEED_ADMIN_USERNAME).first()
    if existing:
      if not existing.email:
        existing.email = SEED_ADMIN_EMAIL
        db.commit()
        print(f"Added reset email for existing admin account '{SEED_ADMIN_USERNAME}'.")
      else:
        print(f"Admin account '{SEED_ADMIN_USERNAME}' already exists — skipping.")
      return

    admin = Account(
      account_code=generate_account_code(db),
      username=SEED_ADMIN_USERNAME,
      email=SEED_ADMIN_EMAIL,
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
    print(f"  reset email: {SEED_ADMIN_EMAIL}")
    print(f"  account_id: {admin.account_id}")
    print(f"  account_code: {admin.account_code}")
    print(f"  ⚠ Default password is set — must_change_password=True, "
          f"admin will be forced to change it on first login.")
  finally:
    db.close()


if __name__ == "__main__":
  seed_admin()
