"""Remove dispatch ticketing and incident reporting; make trips route-owned.

Revision ID: 4e9f2b7c1d63
Revises: 3c8f1a6d9b42
Create Date: 2026-10-29
"""
from alembic import op
import sqlalchemy as sa

revision = "4e9f2b7c1d63"
down_revision = "3c8f1a6d9b42"
branch_labels = None
depends_on = None


def upgrade() -> None:
  bind = op.get_bind()
  if bind.dialect.name != "postgresql":
    raise RuntimeError("This feature-removal migration currently requires PostgreSQL")

  # Preserve trip identity before the dispatch records are removed.
  op.execute("""
    UPDATE trips AS t SET
      driver_id = COALESCE(t.driver_id, d.driver_id),
      vehicle_id = COALESCE(t.vehicle_id, d.vehicle_id),
      route_id = COALESCE(t.route_id, d.route_id)
    FROM dispatch_logs AS d
    WHERE t.dispatch_id = d.dispatch_id
      AND (t.driver_id IS NULL OR t.vehicle_id IS NULL OR t.route_id IS NULL)
  """)
  unresolved = bind.execute(sa.text(
    "SELECT count(*) FROM trips WHERE driver_id IS NULL OR vehicle_id IS NULL OR route_id IS NULL"
  )).scalar_one()
  if unresolved:
    raise RuntimeError(
      f"Cannot remove dispatch data: {unresolved} trip(s) have no driver, vehicle, or route after backfill"
    )

  # Remove dispatch references from route trip and last-location records.
  op.execute("ALTER TABLE trips DROP CONSTRAINT IF EXISTS ck_trips_identity_source")
  op.execute("ALTER TABLE trips DROP CONSTRAINT IF EXISTS trips_dispatch_id_fkey")
  op.execute("ALTER TABLE trips DROP CONSTRAINT IF EXISTS trips_dispatch_ticket_id_fkey")
  op.drop_column("trips", "dispatch_ticket_id")
  op.drop_column("trips", "dispatch_id")
  op.alter_column("trips", "driver_id", existing_type=sa.Integer(), nullable=False)
  op.alter_column("trips", "vehicle_id", existing_type=sa.Integer(), nullable=False)
  op.alter_column("trips", "route_id", existing_type=sa.Integer(), nullable=False)

  op.execute("ALTER TABLE driver_locations DROP CONSTRAINT IF EXISTS driver_locations_dispatch_id_fkey")
  op.drop_column("driver_locations", "dispatch_id")
  op.drop_column("routes", "queue_prefix")

  # Keep deleted dispatcher accounts and audit references, but ensure they can
  # no longer authenticate or gain the admin role's permissions.
  op.execute("UPDATE accounts SET status = 'DISABLED' WHERE role = 'DISPATCHER'")
  op.execute("""
    CREATE TYPE account_role_new AS ENUM ('ADMIN', 'DRIVER')
  """)
  op.execute("""
    ALTER TABLE accounts ALTER COLUMN role TYPE account_role_new
    USING (CASE role::text
      WHEN 'TICKETING_OFFICER' THEN 'ADMIN'
      WHEN 'DISPATCHER' THEN 'ADMIN'
      ELSE role::text
    END)::account_role_new
  """)
  op.execute("DROP TYPE account_role")
  op.execute("ALTER TYPE account_role_new RENAME TO account_role")

  # Drop dependent ticket/queue tables before their referenced records.
  for table in (
    "dispatch_tickets",
    "queue_reservations",
    "dispatcher_assignments",
    "dispatcher_profiles",
    "incidents",
    "dispatch_logs",
    "broadcast_notifications",
  ):
    op.execute(f'DROP TABLE IF EXISTS "{table}" CASCADE')

  for enum_type in ("incident_type", "incident_status", "broadcast_type"):
    op.execute(f'DROP TYPE IF EXISTS "{enum_type}"')


def downgrade() -> None:
  raise RuntimeError(
    "This migration removes dispatch and incident data permanently; restore from backup to roll back."
  )
