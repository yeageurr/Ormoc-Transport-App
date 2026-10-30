"""Store optional commuter delay notice details on trip pause events.

Revision ID: 5a8d2c4f7b91
Revises: 4e9f2b7c1d63
Create Date: 2026-10-30
"""

from alembic import op
import sqlalchemy as sa


revision = "5a8d2c4f7b91"
down_revision = "4e9f2b7c1d63"
branch_labels = None
depends_on = None


def upgrade() -> None:
  op.add_column("trip_pause_events", sa.Column("delay_reason", sa.String(length=32), nullable=True))
  op.add_column("trip_pause_events", sa.Column("delay_details", sa.Text(), nullable=True))
  op.add_column(
    "trip_pause_events",
    sa.Column("broadcast_to_commuters", sa.Boolean(), server_default=sa.text("false"), nullable=False),
  )


def downgrade() -> None:
  op.drop_column("trip_pause_events", "broadcast_to_commuters")
  op.drop_column("trip_pause_events", "delay_details")
  op.drop_column("trip_pause_events", "delay_reason")
