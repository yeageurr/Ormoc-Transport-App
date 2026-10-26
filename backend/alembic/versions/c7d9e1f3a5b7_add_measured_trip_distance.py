"""Persist measured GPS distance for each trip.

Revision ID: c7d9e1f3a5b7
Revises: b6c8d0e2f4a6
Create Date: 2026-10-26
"""

from alembic import op
import sqlalchemy as sa


revision = "c7d9e1f3a5b7"
down_revision = "b6c8d0e2f4a6"
branch_labels = None
depends_on = None


def upgrade() -> None:
  op.add_column("trips", sa.Column("distance_traveled_km", sa.Numeric(8, 3), nullable=True))


def downgrade() -> None:
  op.drop_column("trips", "distance_traveled_km")
