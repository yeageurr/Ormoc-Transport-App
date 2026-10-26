"""Add a driver borrower assignment while retaining vehicle ownership.

Revision ID: d2e4f6a8b0c2
Revises: c7d9e1f3a5b7
Create Date: 2026-10-26
"""

from alembic import op
import sqlalchemy as sa


revision = "d2e4f6a8b0c2"
down_revision = "c7d9e1f3a5b7"
branch_labels = None
depends_on = None


def upgrade() -> None:
  op.add_column("vehicles", sa.Column("borrower_id", sa.Integer(), nullable=True))
  op.create_foreign_key(
    "fk_vehicles_borrower_id_users", "vehicles", "users", ["borrower_id"], ["user_id"]
  )
  op.create_unique_constraint("uq_vehicles_borrower_id", "vehicles", ["borrower_id"])


def downgrade() -> None:
  op.drop_constraint("uq_vehicles_borrower_id", "vehicles", type_="unique")
  op.drop_constraint("fk_vehicles_borrower_id_users", "vehicles", type_="foreignkey")
  op.drop_column("vehicles", "borrower_id")
