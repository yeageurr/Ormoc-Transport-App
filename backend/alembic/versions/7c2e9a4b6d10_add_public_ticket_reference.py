"""Add a human-readable public reference to dispatch tickets.

Revision ID: 7c2e9a4b6d10
Revises: 5a7c9e2d4b61
Create Date: 2026-10-21
"""

import secrets

from alembic import op
import sqlalchemy as sa


revision = "7c2e9a4b6d10"
down_revision = "5a7c9e2d4b61"
branch_labels = None
depends_on = None


REFERENCE_ALPHABET = "ABCDEFGHJKMNPQRSTVWXYZ23456789"
REFERENCE_LENGTH = 8


def _new_reference(used: set[str]) -> str:
  while True:
    candidate = "".join(secrets.choice(REFERENCE_ALPHABET) for _ in range(REFERENCE_LENGTH))
    if candidate not in used:
      used.add(candidate)
      return candidate


def upgrade() -> None:
  op.add_column(
    "dispatch_tickets",
    sa.Column("public_reference", sa.String(length=8), nullable=True),
  )

  bind = op.get_bind()
  tickets = sa.table(
    "dispatch_tickets",
    sa.column("id", sa.Uuid(as_uuid=True)),
    sa.column("public_reference", sa.String(length=8)),
  )
  used: set[str] = set()
  ticket_ids = bind.execute(sa.select(tickets.c.id)).scalars().all()
  for ticket_id in ticket_ids:
    reference = _new_reference(used)
    bind.execute(
      tickets.update()
      .where(tickets.c.id == ticket_id)
      .values(public_reference=reference)
    )

  with op.batch_alter_table("dispatch_tickets") as batch_op:
    batch_op.alter_column(
      "public_reference",
      existing_type=sa.String(length=8),
      nullable=False,
    )
    batch_op.create_unique_constraint(
      "uq_dispatch_tickets_public_reference",
      ["public_reference"],
    )


def downgrade() -> None:
  with op.batch_alter_table("dispatch_tickets") as batch_op:
    batch_op.drop_constraint("uq_dispatch_tickets_public_reference", type_="unique")
    batch_op.drop_column("public_reference")
