"""add driver locations

Revision ID: c1a09cf95672
Revises: 97309e234450
Create Date: 2026-09-12
"""

from alembic import op
import sqlalchemy as sa

revision = "c1a09cf95672"
down_revision = "97309e234450"
branch_labels = None
depends_on = None


def upgrade() -> None:
  op.create_table(
    "driver_locations",
    sa.Column("driver_id", sa.Integer(), nullable=False),
    sa.Column("vehicle_id", sa.Integer(), nullable=False),
    sa.Column("dispatch_id", sa.Integer(), nullable=True),
    sa.Column("latitude", sa.Numeric(9, 6), nullable=False),
    sa.Column("longitude", sa.Numeric(9, 6), nullable=False),
    sa.Column("speed_kmh", sa.Numeric(6, 2), nullable=False, server_default="0"),
    sa.Column("recorded_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    sa.ForeignKeyConstraint(["dispatch_id"], ["dispatch_logs.dispatch_id"]),
    sa.ForeignKeyConstraint(["driver_id"], ["users.user_id"]),
    sa.ForeignKeyConstraint(["vehicle_id"], ["vehicles.vehicle_id"]),
    sa.PrimaryKeyConstraint("driver_id"),
  )


def downgrade() -> None:
  op.drop_table("driver_locations")
