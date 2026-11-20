"""Allow trip durations longer than one week.

Revision ID: b7e2c9a4d1f6
Revises: 9c2d4f6a8b10
Create Date: 2026-11-20
"""

from alembic import op
import sqlalchemy as sa


revision = "b7e2c9a4d1f6"
down_revision = "9c2d4f6a8b10"
branch_labels = None
depends_on = None


def upgrade() -> None:
  op.alter_column(
    "trips",
    "trip_duration_minutes",
    existing_type=sa.Numeric(6, 2),
    type_=sa.Numeric(10, 2),
    existing_nullable=True,
  )


def downgrade() -> None:
  op.alter_column(
    "trips",
    "trip_duration_minutes",
    existing_type=sa.Numeric(10, 2),
    type_=sa.Numeric(6, 2),
    existing_nullable=True,
  )
