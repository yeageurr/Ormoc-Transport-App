"""add public driver ID to user profiles

Revision ID: f4b7c2d9e1a3
Revises: e7f8a9b0c1d2
Create Date: 2026-09-21
"""

import secrets
from datetime import datetime

from alembic import op
import sqlalchemy as sa


revision = "f4b7c2d9e1a3"
down_revision = "e7f8a9b0c1d2"
branch_labels = None
depends_on = None


def _new_driver_id(year: int, used_ids: set[str]) -> str:
  for _ in range(20):
    driver_id = f"{secrets.randbelow(100_000):05d}-{year}"
    if driver_id not in used_ids:
      used_ids.add(driver_id)
      return driver_id
  raise RuntimeError("Could not generate a unique driver_id while migrating users")


def upgrade() -> None:
  op.add_column("users", sa.Column("driver_id", sa.String(length=10), nullable=True))

  bind = op.get_bind()
  existing_ids = {
    row.driver_id
    for row in bind.execute(sa.text("SELECT driver_id FROM users WHERE driver_id IS NOT NULL"))
  }
  user_ids = [row.user_id for row in bind.execute(sa.text("SELECT user_id FROM users"))]
  year = datetime.now().year
  for user_id in user_ids:
    bind.execute(
      sa.text("UPDATE users SET driver_id = :driver_id WHERE user_id = :user_id"),
      {"driver_id": _new_driver_id(year, existing_ids), "user_id": user_id},
    )

  op.alter_column("users", "driver_id", nullable=False)
  op.create_unique_constraint("uq_users_driver_id", "users", ["driver_id"])


def downgrade() -> None:
  op.drop_constraint("uq_users_driver_id", "users", type_="unique")
  op.drop_column("users", "driver_id")
