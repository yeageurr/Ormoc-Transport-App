"""Keep trip status limited to route direction.

Revision ID: f1a2b3c4d5e6
Revises: e5f6a7b8c9d0
Create Date: 2026-10-14
"""

from alembic import op
import sqlalchemy as sa


revision = "f1a2b3c4d5e6"
down_revision = "e5f6a7b8c9d0"
branch_labels = None
depends_on = None


def upgrade() -> None:
  bind = op.get_bind()

  if bind.dialect.name == "postgresql":
    # Legacy COMPLETED rows did not retain a direction. Infer it from their
    # chronological position within each dispatch before removing the label.
    op.execute(sa.text("""
      WITH ranked AS (
        SELECT trip_id,
          ROW_NUMBER() OVER (PARTITION BY dispatch_id ORDER BY time_departed, trip_id) - 1 AS leg_index
        FROM trips
      )
      UPDATE trips
      SET status = CASE WHEN ranked.leg_index % 2 = 0
        THEN 'OUTGOING'::trip_status ELSE 'RETURNING'::trip_status END
      FROM ranked
      WHERE trips.trip_id = ranked.trip_id AND trips.status = 'COMPLETED'
    """))
    op.execute("ALTER TYPE trip_status RENAME TO trip_status_old")
    op.execute("ALTER TABLE trips ALTER COLUMN status TYPE VARCHAR USING status::text")
    op.execute("CREATE TYPE trip_status AS ENUM ('OUTGOING', 'RETURNING')")
    op.execute("ALTER TABLE trips ALTER COLUMN status TYPE trip_status USING status::trip_status")
    op.execute("DROP TYPE trip_status_old")
  else:
    op.execute(sa.text("""
      WITH ranked AS (
        SELECT trip_id,
          ROW_NUMBER() OVER (PARTITION BY dispatch_id ORDER BY time_departed, trip_id) - 1 AS leg_index
        FROM trips
      )
      UPDATE trips
      SET status = CASE WHEN ranked.leg_index % 2 = 0 THEN 'OUTGOING' ELSE 'RETURNING' END
      FROM ranked
      WHERE trips.trip_id = ranked.trip_id AND trips.status = 'COMPLETED'
    """))


def downgrade() -> None:
  bind = op.get_bind()
  if bind.dialect.name == "postgresql":
    op.execute("ALTER TYPE trip_status RENAME TO trip_status_new")
    op.execute("ALTER TABLE trips ALTER COLUMN status TYPE VARCHAR USING status::text")
    op.execute("CREATE TYPE trip_status AS ENUM ('OUTGOING', 'RETURNING', 'COMPLETED')")
    op.execute("ALTER TABLE trips ALTER COLUMN status TYPE trip_status USING status::trip_status")
    op.execute("DROP TYPE trip_status_new")
