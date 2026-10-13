"""add OTP records for driver password resets

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-10-13
"""

from alembic import op
import sqlalchemy as sa


revision = "e5f6a7b8c9d0"
down_revision = "d4e5f6a7b8c9"
branch_labels = None
depends_on = None


def upgrade() -> None:
  op.create_table(
    "password_reset_otps",
    sa.Column("reset_id", sa.Integer(), autoincrement=True, nullable=False),
    sa.Column("account_id", sa.Integer(), nullable=False),
    sa.Column("target_email", sa.String(length=255), nullable=False),
    sa.Column("code_salt", sa.String(length=32), nullable=False),
    sa.Column("code_hash", sa.String(length=64), nullable=False),
    sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
    sa.Column("attempts", sa.Integer(), nullable=False),
    sa.Column("last_sent_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    sa.Column("reset_token_hash", sa.String(length=64), nullable=True),
    sa.Column("reset_token_expires_at", sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(["account_id"], ["accounts.account_id"], ondelete="CASCADE"),
    sa.PrimaryKeyConstraint("reset_id"),
    sa.UniqueConstraint("account_id"),
  )


def downgrade() -> None:
  op.drop_table("password_reset_otps")
