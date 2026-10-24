"""Store dispatcher contact details for ticketing officer account creation.

Revision ID: a2c4e6f8b0d1
Revises: 9a4b6c8d1e20
Create Date: 2026-10-25
"""

from alembic import op
import sqlalchemy as sa


revision = "a2c4e6f8b0d1"
down_revision = "9a4b6c8d1e20"
branch_labels = None
depends_on = None


def upgrade() -> None:
  op.create_table(
    "dispatcher_profiles",
    sa.Column("dispatcher_profile_id", sa.Integer(), autoincrement=True, nullable=False),
    sa.Column("account_id", sa.Integer(), nullable=False),
    sa.Column("first_name", sa.String(length=50), nullable=False),
    sa.Column("last_name", sa.String(length=50), nullable=False),
    sa.Column("contact_number", sa.String(length=11), nullable=False),
    sa.ForeignKeyConstraint(["account_id"], ["accounts.account_id"], ondelete="CASCADE"),
    sa.PrimaryKeyConstraint("dispatcher_profile_id"),
    sa.UniqueConstraint("account_id"),
    sa.UniqueConstraint("contact_number"),
  )


def downgrade() -> None:
  op.drop_table("dispatcher_profiles")
