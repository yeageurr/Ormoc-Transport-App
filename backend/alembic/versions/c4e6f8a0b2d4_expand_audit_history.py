"""Expand audit records for history, failed actions, and system events.

Revision ID: c4e6f8a0b2d4
Revises: b3d5f7a9c1e2
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c4e6f8a0b2d4"
down_revision: Union[str, None] = "b3d5f7a9c1e2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
  op.alter_column("audit_logs", "actor_id", existing_type=sa.Integer(), nullable=True)
  op.add_column("audit_logs", sa.Column("actor_type", sa.String(length=20), server_default="account", nullable=False))
  op.add_column("audit_logs", sa.Column("outcome", sa.String(length=20), server_default="success", nullable=False))
  op.add_column("audit_logs", sa.Column("context", sa.JSON(), nullable=True))
  op.execute(sa.text("""
    INSERT INTO audit_logs (actor_id, actor_type, action, target_table, target_id, details, outcome, context, created_at)
    SELECT NULL, 'system', 'update', 'dispatcher_assignments', id,
      'Automatically closed dispatch ticketing for route ' || route_id || ' on ' || operating_date,
      'success', json_build_object('route_id', route_id, 'dispatcher_id', dispatcher_id, 'assignment_id', id, 'auto_closed', true), closed_at
    FROM dispatcher_assignments
    WHERE auto_closed = true
  """))


def downgrade() -> None:
  op.execute("DELETE FROM audit_logs WHERE actor_type = 'system'")
  op.drop_column("audit_logs", "context")
  op.drop_column("audit_logs", "outcome")
  op.drop_column("audit_logs", "actor_type")
  op.alter_column("audit_logs", "actor_id", existing_type=sa.Integer(), nullable=False)
