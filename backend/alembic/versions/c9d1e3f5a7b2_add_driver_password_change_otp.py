"""Add SMS verification for authenticated driver password changes.

Revision ID: c9d1e3f5a7b2
Revises: b7e2c9a4d1f6
Create Date: 2026-11-27
"""

from alembic import op
import sqlalchemy as sa


revision = "c9d1e3f5a7b2"
down_revision = "b7e2c9a4d1f6"
branch_labels = None
depends_on = None


def upgrade() -> None:
  op.create_table(
    "password_change_otps",
    sa.Column("change_id", sa.Integer(), autoincrement=True, nullable=False),
    sa.Column("account_id", sa.Integer(), nullable=False),
    sa.Column("code_salt", sa.String(length=32), nullable=False),
    sa.Column("code_hash", sa.String(length=64), nullable=False),
    sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
    sa.Column("attempts", sa.Integer(), server_default="0", nullable=False),
    sa.Column("send_count", sa.Integer(), server_default="0", nullable=False),
    sa.Column("last_sent_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    sa.Column("cooldown_until", sa.DateTime(timezone=True), nullable=True),
    sa.Column("verification_token_hash", sa.String(length=64), nullable=True),
    sa.Column("verification_token_expires_at", sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(["account_id"], ["accounts.account_id"], ondelete="CASCADE"),
    sa.PrimaryKeyConstraint("change_id"),
    sa.UniqueConstraint("account_id"),
  )


def downgrade() -> None:
  op.drop_table("password_change_otps")
