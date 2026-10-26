"""Add live commuter passenger queue entries.

Revision ID: e6a3b8d2f5c1
Revises: d2e4f6a8b0c2
Create Date: 2026-10-27
"""

from alembic import op
import sqlalchemy as sa


revision = "e6a3b8d2f5c1"
down_revision = "d2e4f6a8b0c2"
branch_labels = None
depends_on = None


def upgrade() -> None:
  op.create_table(
    "passenger_queue_entries",
    sa.Column("passenger_queue_entry_id", sa.Integer(), autoincrement=True, nullable=False),
    sa.Column("session_token", sa.String(length=64), nullable=False),
    sa.Column("route_id", sa.Integer(), nullable=False),
    sa.Column("terminal_id", sa.Integer(), nullable=False),
    sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
    sa.Column("joined_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    sa.Column("last_seen_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    sa.Column("left_at", sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(["route_id"], ["routes.route_id"], ondelete="CASCADE"),
    sa.ForeignKeyConstraint(["terminal_id"], ["terminals.terminal_id"], ondelete="CASCADE"),
    sa.PrimaryKeyConstraint("passenger_queue_entry_id"),
    sa.UniqueConstraint("session_token"),
  )
  op.create_index(
    "ix_passenger_queue_route_active_seen",
    "passenger_queue_entries",
    ["route_id", "is_active", "last_seen_at"],
    unique=False,
  )


def downgrade() -> None:
  op.drop_index("ix_passenger_queue_route_active_seen", table_name="passenger_queue_entries")
  op.drop_table("passenger_queue_entries")
