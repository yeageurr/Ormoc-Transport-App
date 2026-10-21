"""Add queue/ticket records and direct identity for non-dispatched trips.

Revision ID: 5a7c9e2d4b61
Revises: f1a2b3c4d5e6
Create Date: 2026-10-21
"""

from alembic import op
import sqlalchemy as sa


revision = "5a7c9e2d4b61"
down_revision = "f1a2b3c4d5e6"
branch_labels = None
depends_on = None


def upgrade() -> None:
  bind = op.get_bind()

  # Retire Montebello from active route selection while preserving destination,
  # dispatch, and trip history that may already reference it.
  op.add_column(
    "routes",
    sa.Column("is_active", sa.Boolean(), server_default=sa.true(), nullable=False),
  )
  op.execute(sa.text(
    "UPDATE routes SET is_active = false "
    "WHERE destination_id IN (SELECT destination_id FROM destinations WHERE name = 'Montebello')"
  ))

  # Additive role values keep existing admin accounts and logins intact during
  # the gradual move to ticketing-officer and dispatcher permissions.
  if bind.dialect.name == "postgresql":
    op.execute("ALTER TYPE account_role ADD VALUE IF NOT EXISTS 'DISPATCHER'")
    op.execute("ALTER TYPE account_role ADD VALUE IF NOT EXISTS 'TICKETING_OFFICER'")

  op.create_table(
    "queue_reservations",
    sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
    sa.Column("driver_id", sa.Integer(), nullable=False),
    sa.Column("vehicle_id", sa.Integer(), nullable=False),
    sa.Column("route_id", sa.Integer(), nullable=False),
    sa.Column("operating_date", sa.Date(), nullable=False),
    sa.Column("queue_number", sa.Integer(), nullable=True),
    sa.Column("status", sa.String(length=16), server_default="on_queue", nullable=False),
    sa.Column("reserved_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    sa.Column("loading_at", sa.DateTime(timezone=True), nullable=True),
    sa.Column("departed_at", sa.DateTime(timezone=True), nullable=True),
    sa.Column("cancelled_at", sa.DateTime(timezone=True), nullable=True),
    sa.Column("cancelled_by", sa.Integer(), nullable=True),
    sa.CheckConstraint(
      "status IN ('on_queue', 'loading', 'departed', 'cancelled')",
      name="ck_queue_reservations_status",
    ),
    sa.CheckConstraint(
      "status IN ('on_queue', 'loading') OR queue_number IS NULL",
      name="ck_queue_reservations_inactive_number_null",
    ),
    sa.ForeignKeyConstraint(["driver_id"], ["users.user_id"]),
    sa.ForeignKeyConstraint(["vehicle_id"], ["vehicles.vehicle_id"]),
    sa.ForeignKeyConstraint(["route_id"], ["routes.route_id"]),
    sa.ForeignKeyConstraint(["cancelled_by"], ["accounts.account_id"]),
    sa.PrimaryKeyConstraint("id"),
  )

  op.create_table(
    "dispatcher_assignments",
    sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
    sa.Column("operating_date", sa.Date(), nullable=False),
    sa.Column("route_id", sa.Integer(), nullable=False),
    sa.Column("dispatcher_id", sa.Integer(), nullable=False),
    sa.Column("assigned_by", sa.Integer(), nullable=False),
    sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    sa.Column("closed_at", sa.DateTime(timezone=True), nullable=True),
    sa.Column("closed_by", sa.Integer(), nullable=True),
    sa.Column("auto_closed", sa.Boolean(), server_default=sa.false(), nullable=False),
    sa.ForeignKeyConstraint(["route_id"], ["routes.route_id"]),
    sa.ForeignKeyConstraint(["dispatcher_id"], ["accounts.account_id"]),
    sa.ForeignKeyConstraint(["assigned_by"], ["accounts.account_id"]),
    sa.ForeignKeyConstraint(["closed_by"], ["accounts.account_id"]),
    sa.PrimaryKeyConstraint("id"),
  )

  op.create_index(
    "uq_dispatcher_assignments_open_route_day",
    "dispatcher_assignments",
    ["operating_date", "route_id"],
    unique=True,
    postgresql_where=sa.text("closed_at IS NULL"),
    sqlite_where=sa.text("closed_at IS NULL"),
  )
  op.create_index(
    "uq_dispatcher_assignments_open_dispatcher_day",
    "dispatcher_assignments",
    ["operating_date", "dispatcher_id"],
    unique=True,
    postgresql_where=sa.text("closed_at IS NULL"),
    sqlite_where=sa.text("closed_at IS NULL"),
  )

  op.create_table(
    "dispatch_tickets",
    sa.Column("id", sa.Uuid(as_uuid=True), nullable=False),
    sa.Column("reservation_id", sa.Integer(), nullable=False),
    sa.Column("driver_id", sa.Integer(), nullable=False),
    sa.Column("vehicle_id", sa.Integer(), nullable=False),
    sa.Column("route_id", sa.Integer(), nullable=False),
    sa.Column("queue_number", sa.Integer(), nullable=False),
    sa.Column("operating_date", sa.Date(), nullable=False),
    sa.Column("issued_by", sa.Integer(), nullable=False),
    sa.Column("is_valid", sa.Boolean(), server_default=sa.true(), nullable=False),
    sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
    sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    sa.ForeignKeyConstraint(["reservation_id"], ["queue_reservations.id"]),
    sa.ForeignKeyConstraint(["driver_id"], ["users.user_id"]),
    sa.ForeignKeyConstraint(["vehicle_id"], ["vehicles.vehicle_id"]),
    sa.ForeignKeyConstraint(["route_id"], ["routes.route_id"]),
    sa.ForeignKeyConstraint(["issued_by"], ["accounts.account_id"]),
    sa.PrimaryKeyConstraint("id"),
    sa.UniqueConstraint("reservation_id", name="uq_dispatch_tickets_reservation_id"),
  )

  if bind.dialect.name == "postgresql":
    op.create_unique_constraint(
      "uq_queue_reservations_route_date_number",
      "queue_reservations",
      ["route_id", "operating_date", "queue_number"],
      deferrable=True,
      initially="DEFERRED",
    )
  else:
    # SQLite cannot defer UNIQUE constraints; reorder implementations can use
    # temporary numbers while preserving the same uniqueness rule.
    op.create_unique_constraint(
      "uq_queue_reservations_route_date_number",
      "queue_reservations",
      ["route_id", "operating_date", "queue_number"],
    )

  with op.batch_alter_table("trips") as batch_op:
    batch_op.alter_column("dispatch_id", existing_type=sa.Integer(), nullable=True)
    batch_op.add_column(sa.Column("driver_id", sa.Integer(), nullable=True))
    batch_op.add_column(sa.Column("vehicle_id", sa.Integer(), nullable=True))
    batch_op.add_column(sa.Column("dispatch_ticket_id", sa.Uuid(as_uuid=True), nullable=True))
    batch_op.create_foreign_key("fk_trips_driver_id_users", "users", ["driver_id"], ["user_id"])
    batch_op.create_foreign_key("fk_trips_vehicle_id_vehicles", "vehicles", ["vehicle_id"], ["vehicle_id"])
    batch_op.create_foreign_key(
      "fk_trips_dispatch_ticket_id_dispatch_tickets",
      "dispatch_tickets",
      ["dispatch_ticket_id"],
      ["id"],
    )
    batch_op.create_check_constraint(
      "ck_trips_identity_source",
      "(dispatch_id IS NOT NULL AND driver_id IS NULL AND vehicle_id IS NULL) "
      "OR (dispatch_id IS NULL AND driver_id IS NOT NULL AND vehicle_id IS NOT NULL)",
    )


def downgrade() -> None:
  with op.batch_alter_table("trips") as batch_op:
    batch_op.drop_constraint("ck_trips_identity_source", type_="check")
    batch_op.drop_constraint("fk_trips_dispatch_ticket_id_dispatch_tickets", type_="foreignkey")
    batch_op.drop_constraint("fk_trips_vehicle_id_vehicles", type_="foreignkey")
    batch_op.drop_constraint("fk_trips_driver_id_users", type_="foreignkey")
    batch_op.drop_column("dispatch_ticket_id")
    batch_op.drop_column("vehicle_id")
    batch_op.drop_column("driver_id")
    batch_op.alter_column("dispatch_id", existing_type=sa.Integer(), nullable=False)

  op.drop_constraint("uq_queue_reservations_route_date_number", "queue_reservations", type_="unique")
  op.drop_table("dispatch_tickets")
  op.drop_index("uq_dispatcher_assignments_open_dispatcher_day", table_name="dispatcher_assignments")
  op.drop_index("uq_dispatcher_assignments_open_route_day", table_name="dispatcher_assignments")
  op.drop_table("dispatcher_assignments")
  op.drop_table("queue_reservations")
  op.drop_column("routes", "is_active")

  # PostgreSQL enum values cannot be removed without recreating the type. Keep
  # the added labels on downgrade; existing account rows and data are preserved.
