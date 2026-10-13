"""expand driver email column to support valid email addresses

Revision ID: c3d4e5f6a7b8
Revises: b8d2f6a9c4e7
Create Date: 2026-10-13
"""

from alembic import op
import sqlalchemy as sa


revision = "c3d4e5f6a7b8"
down_revision = "b8d2f6a9c4e7"
branch_labels = None
depends_on = None


def upgrade() -> None:
  op.alter_column(
    "users",
    "email",
    existing_type=sa.String(length=25),
    type_=sa.String(length=255),
    existing_nullable=True,
  )


def downgrade() -> None:
  op.alter_column(
    "users",
    "email",
    existing_type=sa.String(length=255),
    type_=sa.String(length=25),
    existing_nullable=True,
  )
