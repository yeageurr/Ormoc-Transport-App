"""Record driver pause and resume markers during active trips.

Revision ID: f2b7c9d1e3a5
Revises: e6a3b8d2f5c1
Create Date: 2026-10-27
"""

from alembic import op
import sqlalchemy as sa


revision = "f2b7c9d1e3a5"
down_revision = "e6a3b8d2f5c1"
branch_labels = None
depends_on = None


def upgrade() -> None:
  op.create_table(
    "trip_pause_events",
    sa.Column("pause_event_id", sa.Integer(), autoincrement=True, nullable=False),
    sa.Column("trip_id", sa.Integer(), nullable=False),
    sa.Column("paused_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    sa.Column("resumed_at", sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(["trip_id"], ["trips.trip_id"], ondelete="CASCADE"),
    sa.PrimaryKeyConstraint("pause_event_id"),
  )
  op.create_index("ix_trip_pause_events_trip_id", "trip_pause_events", ["trip_id"], unique=False)


def downgrade() -> None:
  op.drop_index("ix_trip_pause_events_trip_id", table_name="trip_pause_events")
  op.drop_table("trip_pause_events")
