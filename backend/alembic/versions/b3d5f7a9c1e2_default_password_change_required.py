"""Default new accounts to requiring an initial password change.

Revision ID: b3d5f7a9c1e2
Revises: a2c4e6f8b0d1
Create Date: 2026-10-25
"""

from alembic import op
import sqlalchemy as sa


revision = "b3d5f7a9c1e2"
down_revision = "a2c4e6f8b0d1"
branch_labels = None
depends_on = None


def upgrade() -> None:
  op.alter_column(
    "accounts",
    "must_change_password",
    existing_type=sa.Boolean(),
    existing_nullable=False,
    server_default=sa.true(),
  )


def downgrade() -> None:
  op.alter_column(
    "accounts",
    "must_change_password",
    existing_type=sa.Boolean(),
    existing_nullable=False,
    server_default=None,
  )
