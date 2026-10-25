from datetime import date, datetime, timedelta, timezone
from uuid import UUID
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.permissions import get_driver_profile, require_role
from app.database import get_db
from app.enums import AccountRole
from app.models.account import Account
from app.models.dispatch_ticket import DispatchTicket
from app.models.dispatcher_assignment import DispatcherAssignment
from app.models.queue_reservation import QueueReservation
from app.models.route import Route
from app.models.destinations import Destination
from app.models.terminal import Terminal
from app.models.user import User
from app.models.vehicle import Vehicle

router = APIRouter()
PH_TIMEZONE = ZoneInfo("Asia/Manila")


@router.get("/records")
def list_dispatch_records(
  operating_date: date | None = None,
  db: Session = Depends(get_db),
  officer: Account = Depends(require_role(AccountRole.TICKETING_OFFICER)),
):
  """Return the daily departure register, excluding route open/close audit events."""
  report_date = operating_date or datetime.now(PH_TIMEZONE).date()
  ticket_rows = (
    db.query(DispatchTicket, User, Vehicle, Route, Destination)
    .join(User, User.user_id == DispatchTicket.driver_id)
    .join(Vehicle, Vehicle.vehicle_id == DispatchTicket.vehicle_id)
    .join(Route, Route.route_id == DispatchTicket.route_id)
    .join(Destination, Destination.destination_id == Route.destination_id)
    .filter(
      DispatchTicket.operating_date == report_date,
      DispatchTicket.used_at.is_not(None),
      DispatchTicket.cancelled_at.is_(None),
    )
    .order_by(Route.route_id, DispatchTicket.used_at, DispatchTicket.created_at)
    .all()
  )
  routes = db.query(Route, Destination, Terminal).join(
    Destination, Destination.destination_id == Route.destination_id
  ).join(Terminal, Terminal.terminal_id == Route.origin_id).filter(Route.is_active.is_(True)).order_by(Route.route_id).all()
  assignments = (
    db.query(DispatcherAssignment)
    .filter(DispatcherAssignment.operating_date == report_date)
    .order_by(DispatcherAssignment.created_at)
    .all()
  )
  assignments_by_route = {}
  for assignment in assignments:
    assignments_by_route.setdefault(assignment.route_id, []).append(assignment)

  report_routes = {}
  for route, destination, terminal in routes:
    report_routes[route.route_id] = {
      "route_id": route.route_id,
      "route_name": destination.name,
      "terminal_name": terminal.terminal_name,
      "opened_at": None,
      "closed_at": None,
      "tickets": [],
    }

  for ticket, driver, vehicle, route, destination in ticket_rows:
    group = report_routes.setdefault(ticket.route_id, {
      "route_id": route.route_id,
      "route_name": destination.name,
      "terminal_name": route.origin.terminal_name if route.origin else None,
      "opened_at": None,
      "closed_at": None,
      "tickets": [],
    })
    route_assignments = assignments_by_route.get(ticket.route_id, [])
    matching = [item for item in route_assignments if item.dispatcher_id == ticket.issued_by and item.created_at <= ticket.created_at]
    assignment = matching[-1] if matching else (route_assignments[-1] if route_assignments else None)
    if assignment:
      group["opened_at"] = assignment.created_at
      group["closed_at"] = assignment.closed_at
    group["tickets"].append({
      "ticket_id": str(ticket.id),
      "reference_number": ticket.public_reference,
      "queue_number": ticket.queue_number,
      "route_id": ticket.route_id,
      "route_name": destination.name,
      "operating_date": ticket.operating_date,
      "plate_number": vehicle.plate_number.upper(),
      "driver_name": f"{driver.first_name} {driver.last_name}".strip(),
      "driver_contact": driver.contact_number,
      "issued_at": ticket.created_at,
      "departure_at": ticket.used_at,
    })

  # Include operation times even when no ticket departed on this route.
  for route_id, route_assignments in assignments_by_route.items():
    group = report_routes.get(route_id)
    if group and route_assignments:
      assignment = route_assignments[-1]
      group["opened_at"] = group["opened_at"] or assignment.created_at
      group["closed_at"] = group["closed_at"] or assignment.closed_at

  first_terminal = next((row[2] for row in routes), db.query(Terminal).order_by(Terminal.terminal_id).first())
  return {
    "operating_date": report_date,
    "terminal": {
      "name": first_terminal.terminal_name if first_terminal else "Terminal",
      "address": first_terminal.address if first_terminal else "",
    },
    "routes": list(report_routes.values()),
  }


@router.get("/records/dates")
def list_dispatch_record_dates(
  db: Session = Depends(get_db),
  officer: Account = Depends(require_role(AccountRole.TICKETING_OFFICER)),
):
  """List dates with completed departures and their route-operation time span."""
  departure_dates = [row[0] for row in (
    db.query(DispatchTicket.operating_date)
    .filter(DispatchTicket.used_at.is_not(None), DispatchTicket.cancelled_at.is_(None))
    .distinct()
    .order_by(DispatchTicket.operating_date.desc())
    .all()
  )]
  if not departure_dates:
    return []
  assignments = (
    db.query(DispatcherAssignment)
    .filter(DispatcherAssignment.operating_date.in_(departure_dates))
    .order_by(DispatcherAssignment.operating_date, DispatcherAssignment.created_at)
    .all()
  )
  span_by_date = {}
  for assignment in assignments:
    span = span_by_date.setdefault(assignment.operating_date, {"opened_at": assignment.created_at, "closed_at": None})
    if assignment.created_at < span["opened_at"]:
      span["opened_at"] = assignment.created_at
    if assignment.closed_at and (span["closed_at"] is None or assignment.closed_at > span["closed_at"]):
      span["closed_at"] = assignment.closed_at
  ticket_counts = dict(
    db.query(DispatchTicket.operating_date, func.count(DispatchTicket.id))
    .filter(DispatchTicket.operating_date.in_(departure_dates), DispatchTicket.used_at.is_not(None), DispatchTicket.cancelled_at.is_(None))
    .group_by(DispatchTicket.operating_date)
    .all()
  )
  return [{
    "operating_date": report_date,
    "opened_at": span_by_date.get(report_date, {}).get("opened_at"),
    "closed_at": span_by_date.get(report_date, {}).get("closed_at"),
    "total_tickets": ticket_counts.get(report_date, 0),
  } for report_date in departure_dates]


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
