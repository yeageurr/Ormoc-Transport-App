"""Store reported horizontal GPS accuracy with each trip ping.

Revision ID: 9c2d4f6a8b10
Revises: 5a8d2c4f7b91
Create Date: 2026-11-20
"""

from alembic import op
import sqlalchemy as sa


revision = "9c2d4f6a8b10"
down_revision = "5a8d2c4f7b91"
branch_labels = None
depends_on = None


def upgrade() -> None:
  op.add_column("gps_logs", sa.Column("accuracy_meters", sa.Numeric(7, 2), nullable=True))


def downgrade() -> None:
  op.drop_column("gps_logs", "accuracy_meters")
