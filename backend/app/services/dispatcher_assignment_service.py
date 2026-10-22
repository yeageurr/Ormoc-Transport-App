from datetime import datetime

from sqlalchemy.orm import Session

from app.models.dispatch_ticket import DispatchTicket
from app.models.dispatcher_assignment import DispatcherAssignment
from app.models.queue_reservation import QueueReservation


def expire_assignment_reservations(
  db: Session,
  assignment: DispatcherAssignment,
  expired_at: datetime,
) -> None:
  """Expire all pending/issued queue reservations when a shift closes."""
  reservations = (
    db.query(QueueReservation)
    .filter(
      QueueReservation.route_id == assignment.route_id,
      QueueReservation.operating_date == assignment.operating_date,
      (QueueReservation.approval_status == "pending")
      | (QueueReservation.queue_status.in_(("on_queue", "loading"))),
    )
    .with_for_update()
    .all()
  )
  reservation_ids = [reservation.id for reservation in reservations]
  if reservation_ids:
    tickets = (
      db.query(DispatchTicket)
      .filter(
        DispatchTicket.reservation_id.in_(reservation_ids),
        DispatchTicket.is_valid.is_(True),
      )
      .with_for_update()
      .all()
    )
    for ticket in tickets:
      ticket.expired_at = expired_at
      ticket.is_valid = False

  for reservation in reservations:
    reservation.approval_status = "expired"
    reservation.queue_status = None
    reservation.expired_at = expired_at
    reservation.queue_number = None
