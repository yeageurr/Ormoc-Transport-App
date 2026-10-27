"""Replace admin role and enforce dispatcher assignment closure metadata.

Revision ID: 9a4b6c8d1e20
Revises: 8d3f1a6c9b20
Create Date: 2026-10-22
"""

from alembic import op
import sqlalchemy as sa


revision = "9a4b6c8d1e20"
down_revision = "8d3f1a6c9b20"
branch_labels = None
depends_on = None


def upgrade() -> None:
  bind = op.get_bind()

  # Keep account IDs intact so terminals.admin_id and other historical FKs
  # continue to reference the same people.
  if bind.dialect.name == "postgresql":
    op.execute(
      "CREATE TYPE account_role_without_admin AS ENUM "
      "('DRIVER', 'DISPATCHER', 'TICKETING_OFFICER')"
    )
    op.execute(
      "ALTER TABLE accounts ALTER COLUMN role TYPE account_role_without_admin "
      "USING (CASE role::text WHEN 'ADMIN' THEN 'TICKETING_OFFICER' "
      "ELSE role::text END)::account_role_without_admin"
    )
    op.execute("DROP TYPE account_role")
    op.execute("ALTER TYPE account_role_without_admin RENAME TO account_role")
  else:
    op.execute(
      "UPDATE accounts SET role = 'TICKETING_OFFICER' WHERE role = 'ADMIN'"
    )

  op.add_column(
    "dispatch_tickets",
    sa.Column("cancelled_at", sa.DateTime(timezone=True), nullable=True),
  )
  op.add_column(
    "dispatch_tickets",
    sa.Column("expired_at", sa.DateTime(timezone=True), nullable=True),
  )
  op.create_check_constraint(
    "ck_dispatch_tickets_validity_matches_lifecycle",
    "dispatch_tickets",
    "is_valid = (used_at IS NULL AND cancelled_at IS NULL AND expired_at IS NULL)",
  )
  op.add_column(
    "queue_reservations",
    sa.Column("expired_at", sa.DateTime(timezone=True), nullable=True),
  )
  op.add_column("queue_reservations", sa.Column("approval_status", sa.String(length=16), nullable=True))
  op.add_column("queue_reservations", sa.Column("queue_status", sa.String(length=16), nullable=True))
  op.add_column("queue_reservations", sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True))
  op.add_column("queue_reservations", sa.Column("approved_by", sa.Integer(), nullable=True))
  op.create_foreign_key(
    "fk_queue_reservations_approved_by_accounts",
    "queue_reservations",
    "accounts",
    ["approved_by"],
    ["account_id"],
  )

  # Preserve historical reservations. A ticket proves dispatcher approval;
  # a ticket's creation/issuer provide the best available approval audit data.
  op.execute(
    "UPDATE queue_reservations AS qr SET approval_status = CASE "
    "WHEN qr.status = 'cancelled' THEN 'cancelled' "
    "WHEN qr.status = 'expired' THEN 'expired' "
    "WHEN EXISTS (SELECT 1 FROM dispatch_tickets dt WHERE dt.reservation_id = qr.id) THEN 'approved' "
    "ELSE 'pending' END"
  )
  op.execute(
    "UPDATE queue_reservations AS qr SET queue_status = CASE "
    "WHEN qr.approval_status = 'approved' THEN qr.status ELSE NULL END"
  )
  op.execute(
    "UPDATE queue_reservations AS qr SET "
    "approved_at = (SELECT dt.created_at FROM dispatch_tickets dt WHERE dt.reservation_id = qr.id), "
    "approved_by = (SELECT dt.issued_by FROM dispatch_tickets dt WHERE dt.reservation_id = qr.id) "
    "WHERE qr.approval_status = 'approved'"
  )
  op.execute(
    "UPDATE queue_reservations SET cancelled_at = CURRENT_TIMESTAMP "
    "WHERE approval_status = 'cancelled' AND cancelled_at IS NULL"
  )
  op.execute(
    "UPDATE queue_reservations SET expired_at = CURRENT_TIMESTAMP "
    "WHERE approval_status = 'expired' AND expired_at IS NULL"
  )

  op.drop_constraint("ck_queue_reservations_status", "queue_reservations", type_="check")
  op.drop_constraint("ck_queue_reservations_inactive_number_null", "queue_reservations", type_="check")
  op.drop_column("queue_reservations", "status")
  op.alter_column("queue_reservations", "approval_status", nullable=False, server_default="pending")
  op.create_check_constraint(
    "ck_queue_reservations_approval_status",
    "queue_reservations",
    "approval_status IN ('pending', 'approved', 'cancelled', 'expired')",
  )
  op.create_check_constraint(
    "ck_queue_reservations_queue_status",
    "queue_reservations",
    "queue_status IS NULL OR queue_status IN ('on_queue', 'loading', 'departed')",
  )
  op.create_check_constraint(
    "ck_queue_reservations_approval_queue_status",
    "queue_reservations",
    "(approval_status = 'approved' AND queue_status IS NOT NULL) OR "
    "(approval_status <> 'approved' AND queue_status IS NULL)",
  )
  op.create_check_constraint(
    "ck_queue_reservations_inactive_number_null",
    "queue_reservations",
    "(queue_status IN ('on_queue', 'loading') AND queue_number IS NOT NULL) OR "
    "((queue_status IS NULL OR queue_status = 'departed') AND queue_number IS NULL)",
  )
  op.create_check_constraint(
    "ck_queue_reservations_approval_audit_pair",
    "queue_reservations",
    "(approval_status = 'approved' AND approved_by IS NOT NULL AND approved_at IS NOT NULL) OR "
    "(approval_status <> 'approved' AND approved_by IS NULL AND approved_at IS NULL)",
  )
  op.create_check_constraint(
    "ck_queue_reservations_cancelled_timestamp",
    "queue_reservations",
    "(approval_status = 'cancelled' AND cancelled_at IS NOT NULL) OR "
    "(approval_status <> 'cancelled' AND cancelled_at IS NULL)",
  )
  op.create_check_constraint(
    "ck_queue_reservations_expired_timestamp",
    "queue_reservations",
    "(approval_status = 'expired' AND expired_at IS NOT NULL) OR "
    "(approval_status <> 'expired' AND expired_at IS NULL)",
  )
  op.create_index(
    "uq_queue_reservations_one_active_per_driver",
    "queue_reservations",
    ["driver_id"],
    unique=True,
    postgresql_where=sa.text("approval_status = 'pending' OR queue_status IN ('on_queue', 'loading')"),
    sqlite_where=sa.text("approval_status = 'pending' OR queue_status IN ('on_queue', 'loading')"),
  )
  op.create_index(
    "ix_dispatcher_assignments_due_for_autoclose",
    "dispatcher_assignments",
    ["created_at"],
    unique=False,
    postgresql_where=sa.text("closed_at IS NULL"),
    sqlite_where=sa.text("closed_at IS NULL"),
  )
  op.create_check_constraint(
    "ck_dispatcher_assignments_closure_metadata",
    "dispatcher_assignments",
    "(closed_at IS NOT NULL OR auto_closed = false) AND "
    "(auto_closed = false OR (closed_at IS NOT NULL AND closed_by IS NULL))",
  )


def downgrade() -> None:
  bind = op.get_bind()
  op.drop_index("uq_queue_reservations_one_active_per_driver", table_name="queue_reservations")
  op.drop_constraint(
    "ck_dispatch_tickets_validity_matches_lifecycle",
    "dispatch_tickets",
    type_="check",
  )
  for constraint in (
    "ck_queue_reservations_approval_status",
    "ck_queue_reservations_queue_status",
    "ck_queue_reservations_approval_queue_status",
    "ck_queue_reservations_inactive_number_null",
    "ck_queue_reservations_approval_audit_pair",
    "ck_queue_reservations_cancelled_timestamp",
    "ck_queue_reservations_expired_timestamp",
  ):
    op.drop_constraint(constraint, "queue_reservations", type_="check")
  op.add_column("queue_reservations", sa.Column("status", sa.String(length=16), nullable=True))
  op.execute(
    "UPDATE queue_reservations SET status = CASE "
    "WHEN approval_status = 'approved' THEN queue_status "
    "WHEN approval_status = 'cancelled' OR approval_status = 'expired' THEN 'cancelled' "
    "ELSE 'on_queue' END"
  )
  op.alter_column("queue_reservations", "status", nullable=False, server_default="on_queue")
  op.create_check_constraint(
    "ck_queue_reservations_status",
    "queue_reservations",
    "status IN ('on_queue', 'loading', 'departed', 'cancelled')",
  )
  op.create_check_constraint(
    "ck_queue_reservations_inactive_number_null",
    "queue_reservations",
    "status IN ('on_queue', 'loading') OR queue_number IS NULL",
  )
  op.drop_constraint("fk_queue_reservations_approved_by_accounts", "queue_reservations", type_="foreignkey")
  op.drop_column("queue_reservations", "approved_by")
  op.drop_column("queue_reservations", "approved_at")
  op.drop_column("queue_reservations", "queue_status")
  op.drop_column("queue_reservations", "approval_status")
  op.drop_column("queue_reservations", "expired_at")
  op.drop_column("dispatch_tickets", "cancelled_at")
  op.drop_column("dispatch_tickets", "expired_at")
  op.drop_constraint(
    "ck_dispatcher_assignments_closure_metadata",
    "dispatcher_assignments",
    type_="check",
  )
  op.drop_index("ix_dispatcher_assignments_due_for_autoclose", table_name="dispatcher_assignments")

  if bind.dialect.name == "postgresql":
    # Downgrade maps ticketing officers back to admin because their original
    # role cannot be distinguished after the upgrade.
    op.execute(
      "CREATE TYPE account_role_with_admin AS ENUM "
      "('ADMIN', 'DRIVER', 'DISPATCHER', 'TICKETING_OFFICER')"
    )
    op.execute(
      "ALTER TABLE accounts ALTER COLUMN role TYPE account_role_with_admin "
      "USING (CASE role::text WHEN 'TICKETING_OFFICER' THEN 'ADMIN' "
      "ELSE role::text END)::account_role_with_admin"
    )
    op.execute("DROP TYPE account_role")
    op.execute("ALTER TYPE account_role_with_admin RENAME TO account_role")
  else:
    op.execute(
      "UPDATE accounts SET role = 'ADMIN' WHERE role = 'TICKETING_OFFICER'"
    )
