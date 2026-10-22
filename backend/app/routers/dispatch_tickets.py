from datetime import datetime, timedelta, timezone
from uuid import UUID
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.permissions import get_driver_profile, require_role
from app.database import get_db
from app.enums import AccountRole
from app.models.account import Account
from app.models.dispatch_ticket import DispatchTicket
from app.models.dispatcher_assignment import DispatcherAssignment
from app.models.queue_reservation import QueueReservation

router = APIRouter()
PH_TIMEZONE = ZoneInfo("Asia/Manila")


@router.post("/{ticket_id}/consume")
def consume_ticket(
  ticket_id: UUID,
  db: Session = Depends(get_db),
  driver_account: Account = Depends(require_role(AccountRole.DRIVER)),
):
  """Consume a ticket after the QR has been accepted for the signed-in driver."""
  driver = get_driver_profile(db, driver_account)
  ticket = (
    db.query(DispatchTicket)
    .filter(DispatchTicket.id == ticket_id)
    .with_for_update()
    .first()
  )
  if ticket is None:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")
  if ticket.driver_id != driver.user_id:
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This ticket belongs to another driver")
  if not ticket.is_valid or ticket.used_at is not None or ticket.cancelled_at is not None:
    raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ticket is no longer valid")

  assignment = (
    db.query(DispatcherAssignment)
    .filter(
      DispatcherAssignment.dispatcher_id == ticket.issued_by,
      DispatcherAssignment.route_id == ticket.route_id,
      DispatcherAssignment.operating_date == ticket.operating_date,
      DispatcherAssignment.closed_at.is_(None),
      DispatcherAssignment.created_at > datetime.now(timezone.utc) - timedelta(hours=24),
    )
    .first()
  )
  if assignment is None:
    raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="The dispatch ticketing shift is closed")

  reservation = (
    db.query(QueueReservation)
    .filter(QueueReservation.id == ticket.reservation_id)
    .with_for_update()
    .first()
  )
  if reservation is None or reservation.driver_id != driver.user_id:
    raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ticket reservation is unavailable")
  if reservation.approval_status != "approved" or reservation.queue_status not in ("on_queue", "loading"):
    raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Reservation is no longer active")

  used_at = datetime.now(PH_TIMEZONE)
  ticket.used_at = used_at
  ticket.is_valid = False
  reservation.queue_status = "departed"
  reservation.departed_at = used_at
  reservation.queue_number = None
  db.commit()
  return {"ticket_id": str(ticket.id), "used_at": used_at, "is_valid": False}


@router.post("/{ticket_id}/cancel")
def cancel_ticket(
  ticket_id: UUID,
  db: Session = Depends(get_db),
  dispatcher: Account = Depends(require_role(AccountRole.DISPATCHER)),
):
  """Void an unused ticket issued by this dispatcher, retaining its history."""
  ticket = (
    db.query(DispatchTicket)
    .filter(DispatchTicket.id == ticket_id)
    .with_for_update()
    .first()
  )
  if ticket is None:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")
  if ticket.issued_by != dispatcher.account_id:
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only cancel tickets you issued")
  if not ticket.is_valid or ticket.used_at is not None or ticket.cancelled_at is not None:
    raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ticket is no longer active")

  reservation = (
    db.query(QueueReservation)
    .filter(QueueReservation.id == ticket.reservation_id)
    .with_for_update()
    .first()
  )
  if reservation is None:
    raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ticket reservation is unavailable")

  cancelled_at = datetime.now(PH_TIMEZONE)
  ticket.cancelled_at = cancelled_at
  ticket.is_valid = False
  reservation.approval_status = "cancelled"
  reservation.queue_status = None
  reservation.cancelled_at = cancelled_at
  reservation.cancelled_by = dispatcher.account_id
  reservation.queue_number = None
  db.commit()
  return {"ticket_id": str(ticket.id), "cancelled_at": cancelled_at, "is_valid": False}
