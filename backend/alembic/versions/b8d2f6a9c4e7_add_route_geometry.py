"""add verified route geometry

Revision ID: b8d2f6a9c4e7
Revises: f4b7c2d9e1a3
Create Date: 2026-09-24
"""

from alembic import op
import sqlalchemy as sa


revision = "b8d2f6a9c4e7"
down_revision = "f4b7c2d9e1a3"
branch_labels = None
depends_on = None


def upgrade() -> None:
  op.add_column("routes", sa.Column("route_geometry", sa.JSON(), nullable=True))


def downgrade() -> None:
  op.drop_column("routes", "route_geometry")
