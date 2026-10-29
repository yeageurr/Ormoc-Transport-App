"""allow SMS delivery for driver password reset OTPs

Revision ID: 3c8f1a6d9b42
Revises: f2b7c9d1e3a5
Create Date: 2026-10-29
"""

from alembic import op
import sqlalchemy as sa


revision = "3c8f1a6d9b42"
down_revision = "f2b7c9d1e3a5"
branch_labels = None
depends_on = None


def upgrade() -> None:
  op.alter_column("password_reset_otps", "target_email", existing_type=sa.String(length=255), nullable=True)
  op.add_column("password_reset_otps", sa.Column("target_phone", sa.String(length=11), nullable=True))
  op.add_column("password_reset_otps", sa.Column("send_count", sa.Integer(), server_default="0", nullable=False))
  op.add_column("password_reset_otps", sa.Column("cooldown_until", sa.DateTime(timezone=True), nullable=True))
  op.create_check_constraint(
    "ck_password_reset_otp_single_destination",
    "password_reset_otps",
    "(target_email IS NOT NULL AND target_phone IS NULL) OR "
    "(target_email IS NULL AND target_phone IS NOT NULL)",
  )


def downgrade() -> None:
  op.drop_constraint("ck_password_reset_otp_single_destination", "password_reset_otps", type_="check")
  op.drop_column("password_reset_otps", "cooldown_until")
  op.drop_column("password_reset_otps", "send_count")
  op.drop_column("password_reset_otps", "target_phone")
  op.alter_column("password_reset_otps", "target_email", existing_type=sa.String(length=255), nullable=False)
