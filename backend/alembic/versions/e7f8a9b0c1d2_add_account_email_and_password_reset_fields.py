"""add account email and password reset fields

Revision ID: e7f8a9b0c1d2
Revises: c1a09cf95672
Create Date: 2026-09-14
"""

from alembic import op
import sqlalchemy as sa


revision = "e7f8a9b0c1d2"
down_revision = "c1a09cf95672"
branch_labels = None
depends_on = None


def upgrade() -> None:
  op.add_column("accounts", sa.Column("email", sa.String(length=255), nullable=True))
  op.create_unique_constraint("uq_accounts_email", "accounts", ["email"])
  op.add_column("accounts", sa.Column("password_reset_token_hash", sa.String(length=64), nullable=True))
  op.add_column("accounts", sa.Column("password_reset_expires_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
  op.drop_column("accounts", "password_reset_expires_at")
  op.drop_column("accounts", "password_reset_token_hash")
  op.drop_constraint("uq_accounts_email", "accounts", type_="unique")
  op.drop_column("accounts", "email")
