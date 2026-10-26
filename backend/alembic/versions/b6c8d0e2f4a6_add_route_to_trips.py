"""Store route identity directly on trip records.

Revision ID: b6c8d0e2f4a6
Merges: b3d5f7a9c1e2, d6f0a2b4c8e1
Create Date: 2026-10-26
"""

from alembic import op
import sqlalchemy as sa


revision = "b6c8d0e2f4a6"
down_revision = ("b3d5f7a9c1e2", "d6f0a2b4c8e1")
branch_labels = None
depends_on = None


def upgrade() -> None:
  op.add_column("trips", sa.Column("route_id", sa.Integer(), nullable=True))
  op.create_foreign_key(
    "fk_trips_route_id_routes",
    "trips",
    "routes",
    ["route_id"],
    ["route_id"],
  )
  op.create_index("ix_trips_route_id", "trips", ["route_id"])
  op.execute(
    "UPDATE trips AS t SET route_id = d.route_id "
    "FROM dispatch_logs AS d "
    "WHERE t.dispatch_id = d.dispatch_id AND t.route_id IS NULL"
  )


def downgrade() -> None:
  op.drop_index("ix_trips_route_id", table_name="trips")
  op.drop_constraint("fk_trips_route_id_routes", "trips", type_="foreignkey")
  op.drop_column("trips", "route_id")
