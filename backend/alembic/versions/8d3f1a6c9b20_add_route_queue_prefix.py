"""Add independent route queue prefixes and four-digit queue sequences.

Revision ID: 8d3f1a6c9b20
Revises: 7c2e9a4b6d10
Create Date: 2026-10-21
"""

from alembic import op
import sqlalchemy as sa


revision = "8d3f1a6c9b20"
down_revision = "7c2e9a4b6d10"
branch_labels = None
depends_on = None


def upgrade() -> None:
  op.add_column("routes", sa.Column("queue_prefix", sa.String(length=8), nullable=True))
  bind = op.get_bind()
  routes = sa.table(
    "routes",
    sa.column("route_id", sa.Integer()),
    sa.column("queue_prefix", sa.String(length=8)),
  )
  route_ids = bind.execute(sa.select(routes.c.route_id)).scalars().all()
  for route_id in route_ids:
    # Preserve a readable initial code without changing route primary keys.
    prefix = str(route_id).zfill(3)
    bind.execute(
      routes.update().where(routes.c.route_id == route_id).values(queue_prefix=prefix)
    )

  with op.batch_alter_table("routes") as batch_op:
    batch_op.alter_column("queue_prefix", existing_type=sa.String(length=8), nullable=False)
    batch_op.create_unique_constraint("uq_routes_queue_prefix", ["queue_prefix"])

  with op.batch_alter_table("queue_reservations") as batch_op:
    batch_op.create_check_constraint(
      "ck_queue_reservations_queue_number_range",
      "queue_number IS NULL OR queue_number BETWEEN 1 AND 9999",
    )

  with op.batch_alter_table("dispatch_tickets") as batch_op:
    batch_op.create_check_constraint(
      "ck_dispatch_tickets_queue_number_range",
      "queue_number BETWEEN 1 AND 9999",
    )


def downgrade() -> None:
  with op.batch_alter_table("dispatch_tickets") as batch_op:
    batch_op.drop_constraint("ck_dispatch_tickets_queue_number_range", type_="check")

  with op.batch_alter_table("queue_reservations") as batch_op:
    batch_op.drop_constraint("ck_queue_reservations_queue_number_range", type_="check")

  with op.batch_alter_table("routes") as batch_op:
    batch_op.drop_constraint("uq_routes_queue_prefix", type_="unique")
    batch_op.drop_column("queue_prefix")
