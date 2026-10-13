"""add pending email verification codes

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2026-10-13
"""

from alembic import op
import sqlalchemy as sa


revision = "d4e5f6a7b8c9"
down_revision = "c3d4e5f6a7b8"
branch_labels = None
depends_on = None


def upgrade() -> None:
  op.create_table(
    "email_verifications",
    sa.Column("verification_id", sa.Integer(), autoincrement=True, nullable=False),
    sa.Column("account_id", sa.Integer(), nullable=False),
    sa.Column("pending_email", sa.String(length=255), nullable=False),
    sa.Column("code_salt", sa.String(length=32), nullable=False),
    sa.Column("code_hash", sa.String(length=64), nullable=False),
    sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
    sa.Column("attempts", sa.Integer(), nullable=False),
    sa.Column("last_sent_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    sa.ForeignKeyConstraint(["account_id"], ["accounts.account_id"], ondelete="CASCADE"),
    sa.PrimaryKeyConstraint("verification_id"),
    sa.UniqueConstraint("account_id"),
  )


def downgrade() -> None:
  op.drop_table("email_verifications")
