from sqlalchemy.orm import Session

from app.core.ticket_reference import generate_ticket_reference
from app.models.dispatch_ticket import DispatchTicket


def generate_unique_ticket_reference(db: Session, max_attempts: int = 10) -> str:
  """Find an unused reference before insertion; the DB constraint remains authoritative.

  The unique constraint handles the extremely rare race where concurrent
  requests happen to choose the same reference. Ticket creation should retry
  the transaction if that constraint is hit.
  """
  for _ in range(max_attempts):
    reference = generate_ticket_reference()
    exists = (
      db.query(DispatchTicket.id)
      .filter(DispatchTicket.public_reference == reference)
      .first()
    )
    if not exists:
      return reference

  raise RuntimeError("Could not allocate a unique ticket reference; retry the operation")
