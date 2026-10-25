"""Add optional display names to accounts.

Revision ID: d6f0a2b4c8e1
Revises: c4e6f8a0b2d4
Create Date: 2026-10-25
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d6f0a2b4c8e1"
down_revision: Union[str, None] = "c4e6f8a0b2d4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
  op.add_column("accounts", sa.Column("display_name", sa.String(length=100), nullable=True))


def downgrade() -> None:
  op.drop_column("accounts", "display_name")
