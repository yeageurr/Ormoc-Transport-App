from datetime import date, datetime, timedelta, timezone
import logging
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.core.permissions import get_driver_profile, require_role
from app.database import get_db
from app.enums import AccountRole, NotificationType
from app.models.account import Account
from app.models.dispatch_log import DispatchLog
from app.models.dispatch_ticket import DispatchTicket
from app.models.dispatcher_assignment import DispatcherAssignment
from app.models.notification import Notification
from app.models.queue_reservation import QueueReservation
from app.models.route import Route
from app.models.trip import Trip
from app.models.vehicle import Vehicle
from app.schemas.queue_reservation import (
  DispatcherQueueReservationResponse,
  DriverQueueReservationHistoryResponse,
  QueueReservationCreate,
  QueueReservationResponse,
)
from app.schemas.route import RouteResponse
from app.services.dispatch_ticket_service import generate_unique_ticket_reference
from app.websocket.connection_manager import manager

router = APIRouter()
PH_TIMEZONE = ZoneInfo("Asia/Manila")
logger = logging.getLogger(__name__)


async def _push_saved_notification(notification: Notification) -> None:
  try:
    await manager.send_to(notification.recipient_id, {
      "type": "notification",
      "data": {
        "notification_id": notification.notification_id,
        "notification_type": notification.notification_type.value,
        "message": notification.message,
        "created_at": notification.created_at.isoformat(),
      },
    })
  except Exception:
    logger.warning("Notification %s committed but live delivery failed", notification.notification_id, exc_info=True)


def _has_active_trip(db: Session, driver_id: int) -> bool:
  return (
    db.query(Trip.trip_id)
    .outerjoin(DispatchLog, Trip.dispatch_id == DispatchLog.dispatch_id)
    .filter(
      Trip.is_complete.is_(False),
      or_(Trip.driver_id == driver_id, DispatchLog.driver_id == driver_id),
    )
    .first()
    is not None
  )


def _response(reservation: QueueReservation) -> QueueReservationResponse:
  ticket = reservation.ticket
  return QueueReservationResponse(
    id=reservation.id,
    route_id=reservation.route_id,
    vehicle_id=reservation.vehicle_id,
    operating_date=reservation.operating_date,
    queue_number=reservation.queue_number,
    queue_display=(
      f"{reservation.route.queue_prefix}-{reservation.queue_number:04d}"
      if reservation.queue_number is not None and reservation.route is not None
      else None
    ),
    approval_status=reservation.approval_status,
    queue_status=reservation.queue_status,
    reserved_at=reservation.reserved_at,
    approved_at=reservation.approved_at,
    approved_by=reservation.approved_by,
    cancelled_at=reservation.cancelled_at,
    cancelled_by=reservation.cancelled_by,
    expired_at=reservation.expired_at,
    ticket_id=str(ticket.id) if ticket else None,
    ticket_reference=ticket.public_reference if ticket else None,
    ticket_is_valid=ticket.is_valid if ticket else None,
  )


@router.get("/driver/current", response_model=QueueReservationResponse)
def current_driver_reservation(
  db: Session = Depends(get_db),
  account: Account = Depends(require_role(AccountRole.DRIVER)),
):
  driver = get_driver_profile(db, account)
  reservation = (
    db.query(QueueReservation)
    .filter(
      QueueReservation.driver_id == driver.user_id,
      (QueueReservation.approval_status == "pending")
      | (QueueReservation.queue_status.in_(("on_queue", "loading"))),
    )
    .order_by(QueueReservation.reserved_at.desc())
    .first()
  )
  if reservation is None:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No active reservation")
  return _response(reservation)


@router.get("/driver/available-routes", response_model=list[RouteResponse])
def available_driver_reservation_routes(
  db: Session = Depends(get_db),
  account: Account = Depends(require_role(AccountRole.DRIVER)),
):
  """Return routes with an open dispatcher assignment for today's PH operating date."""
  now = datetime.now(PH_TIMEZONE)
  routes = (
    db.query(Route)
    .join(DispatcherAssignment, DispatcherAssignment.route_id == Route.route_id)
    .filter(
      Route.is_active.is_(True),
      DispatcherAssignment.operating_date == now.date(),
      DispatcherAssignment.closed_at.is_(None),
      DispatcherAssignment.created_at > datetime.now(timezone.utc) - timedelta(hours=24),
    )
    .order_by(Route.route_id.asc())
    .all()
  )
  # A route may have more than one legacy open row; expose one selector option.
  return list({route.route_id: route for route in routes}.values())


@router.get("/driver/mine", response_model=list[DriverQueueReservationHistoryResponse])
def driver_reservation_history(
  db: Session = Depends(get_db),
  account: Account = Depends(require_role(AccountRole.DRIVER)),
):
  """Return all of the signed-in driver's reservation and ticket records."""
  driver = get_driver_profile(db, account)
  reservations = (
    db.query(QueueReservation)
    .options(
      joinedload(QueueReservation.driver),
      joinedload(QueueReservation.vehicle),
      joinedload(QueueReservation.route).joinedload(Route.origin),
      joinedload(QueueReservation.route).joinedload(Route.destination),
      joinedload(QueueReservation.ticket),
    )
    .filter(QueueReservation.driver_id == driver.user_id)
    .order_by(QueueReservation.reserved_at.desc())
    .all()
  )

  history = []
  for reservation in reservations:
    ticket = reservation.ticket
    response_data = _response(reservation).model_dump()
    if ticket is not None:
      # Departed reservations clear their queue number to release the daily
      # uniqueness slot, so display the immutable number retained on the ticket.
      response_data["queue_number"] = ticket.queue_number
      response_data["queue_display"] = f"{reservation.route.queue_prefix}-{ticket.queue_number:04d}"
    history.append(DriverQueueReservationHistoryResponse(
      **response_data,
      driver_name=f"{reservation.driver.first_name} {reservation.driver.last_name}",
      route_label=(
        f"{reservation.route.origin.terminal_name} - {reservation.route.destination.name}"
      ),
      vehicle_plate=reservation.vehicle.plate_number,
      vehicle_body_number=reservation.vehicle.body_number,
      loading_at=reservation.loading_at,
      departed_at=reservation.departed_at,
      ticket_created_at=ticket.created_at if ticket else None,
      ticket_used_at=ticket.used_at if ticket else None,
      ticket_cancelled_at=ticket.cancelled_at if ticket else None,
      ticket_expired_at=ticket.expired_at if ticket else None,
    ))
  return history


@router.get("/dispatcher/pending", response_model=list[DispatcherQueueReservationResponse])
def pending_dispatcher_reservations(
  operating_date: date | None = None,
  db: Session = Depends(get_db),
  dispatcher: Account = Depends(require_role(AccountRole.DISPATCHER)),
):
  """List pending requests for this dispatcher's open route/date assignment."""
  target_date = operating_date or datetime.now(PH_TIMEZONE).date()
  assignment = (
    db.query(DispatcherAssignment)
    .filter(
      DispatcherAssignment.dispatcher_id == dispatcher.account_id,
      DispatcherAssignment.operating_date == target_date,
      DispatcherAssignment.closed_at.is_(None),
      DispatcherAssignment.created_at > datetime.now(timezone.utc) - timedelta(hours=24),
    )
    .first()
  )
  if assignment is None:
    return []

  reservations = (
    db.query(QueueReservation)
    .options(
      joinedload(QueueReservation.driver),
      joinedload(QueueReservation.vehicle),
      joinedload(QueueReservation.route).joinedload(Route.origin),
      joinedload(QueueReservation.route).joinedload(Route.destination),
      joinedload(QueueReservation.ticket),
    )
    .filter(
      QueueReservation.route_id == assignment.route_id,
      QueueReservation.operating_date == target_date,
      QueueReservation.approval_status == "pending",
    )
    .order_by(QueueReservation.reserved_at.asc())
    .all()
  )

  responses = []
  for reservation in reservations:
    response_data = _response(reservation).model_dump()
    responses.append(DispatcherQueueReservationResponse(
      **response_data,
      driver_name=f"{reservation.driver.first_name} {reservation.driver.last_name}",
      driver_public_id=reservation.driver.driver_id,
      route_label=f"{reservation.route.origin.terminal_name} - {reservation.route.destination.name}",
      vehicle_plate=reservation.vehicle.plate_number,
      vehicle_body_number=reservation.vehicle.body_number,
      loading_at=reservation.loading_at,
      departed_at=reservation.departed_at,
      ticket_created_at=None,
      ticket_used_at=None,
      ticket_cancelled_at=None,
      ticket_expired_at=None,
    ))
  return responses


@router.post("", response_model=QueueReservationResponse, status_code=status.HTTP_201_CREATED)
async def create_driver_reservation(
  request: QueueReservationCreate,
  db: Session = Depends(get_db),
  account: Account = Depends(require_role(AccountRole.DRIVER)),
):
  driver = get_driver_profile(db, account)
  if _has_active_trip(db, driver.user_id):
    raise HTTPException(
      status_code=status.HTTP_409_CONFLICT,
      detail="You cannot make a reservation while a trip is in progress",
    )

  today = datetime.now(PH_TIMEZONE).date()
  if request.operating_date < today:
    raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Operating date cannot be in the past")

  assignment = (
    db.query(DispatcherAssignment)
    .filter(
      DispatcherAssignment.route_id == request.route_id,
      DispatcherAssignment.operating_date == request.operating_date,
      DispatcherAssignment.closed_at.is_(None),
      DispatcherAssignment.created_at > datetime.now(timezone.utc) - timedelta(hours=24),
    )
    .first()
  )
  if assignment is None:
    raise HTTPException(
      status_code=status.HTTP_409_CONFLICT,
      detail="There is no active dispatcher assignment for this route and operating date",
    )

  has_active_reservation = (
    db.query(QueueReservation.id)
    .filter(
      QueueReservation.driver_id == driver.user_id,
      (QueueReservation.approval_status == "pending")
      | (QueueReservation.queue_status.in_(("on_queue", "loading"))),
    )
    .first()
    is not None
  )
  if has_active_reservation:
    raise HTTPException(
      status_code=status.HTTP_409_CONFLICT,
      detail="You already have an active reservation. View that reservation before making another.",
    )

  route = db.query(Route).filter(Route.route_id == request.route_id, Route.is_active.is_(True)).first()
  if route is None:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Route not found")
  vehicle = db.query(Vehicle).filter(Vehicle.vehicle_id == request.vehicle_id).first()
  if vehicle is None:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found")
  if vehicle.borrower_id is not None:
    vehicle_is_assigned_to_driver = vehicle.borrower_id == driver.user_id
  else:
    vehicle_is_assigned_to_driver = vehicle.owner_id == driver.user_id
  if not vehicle_is_assigned_to_driver:
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This vehicle is not assigned to your account")

  reservation = QueueReservation(
    driver_id=driver.user_id,
    vehicle_id=vehicle.vehicle_id,
    route_id=route.route_id,
    operating_date=request.operating_date,
    queue_number=None,
    approval_status="pending",
    queue_status=None,
  )
  db.add(reservation)
  notification = Notification(
    recipient_id=assignment.dispatcher_id,
    notification_type=NotificationType.UPDATED,
    message=(
      f"New reservation request from {driver.first_name} {driver.last_name} "
      f"for {route.origin.terminal_name} - {route.destination.name} "
      f"on {request.operating_date.isoformat()}. Review the pending request."
    ),
  )
  db.add(notification)
  try:
    db.commit()
  except IntegrityError:
    db.rollback()
    raise HTTPException(
      status_code=status.HTTP_409_CONFLICT,
      detail="An active reservation already exists for your account",
    )
  db.refresh(reservation)
  db.refresh(notification)
  await _push_saved_notification(notification)
  return _response(reservation)


@router.post("/{reservation_id}/confirm", response_model=QueueReservationResponse)
async def confirm_reservation(
  reservation_id: int,
  db: Session = Depends(get_db),
  dispatcher: Account = Depends(require_role(AccountRole.DISPATCHER)),
):
  reservation = (
    db.query(QueueReservation)
    .filter(QueueReservation.id == reservation_id)
    .with_for_update()
    .first()
  )
  if reservation is None:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reservation not found")
  if reservation.approval_status != "pending" or reservation.ticket is not None:
    raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Reservation is no longer pending")

  assignment = (
    db.query(DispatcherAssignment)
    .filter(
      DispatcherAssignment.dispatcher_id == dispatcher.account_id,
      DispatcherAssignment.route_id == reservation.route_id,
      DispatcherAssignment.operating_date == reservation.operating_date,
      DispatcherAssignment.closed_at.is_(None),
      DispatcherAssignment.created_at > datetime.now(timezone.utc) - timedelta(hours=24),
    )
    .first()
  )
  if assignment is None:
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No open assignment for this reservation's route and date")

  # Lock the route row so concurrent confirmations for this route/day allocate
  # distinct, monotonically increasing queue numbers.
  route = (
    db.query(Route)
    .filter(Route.route_id == reservation.route_id)
    .with_for_update()
    .first()
  )
  if route is None:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Route not found")
  latest_queue_number = (
    db.query(func.max(DispatchTicket.queue_number))
    .filter(
      DispatchTicket.route_id == reservation.route_id,
      DispatchTicket.operating_date == reservation.operating_date,
    )
    .scalar()
  ) or 0
  next_queue_number = latest_queue_number + 1
  if next_queue_number > 9999:
    raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This route has reached its queue limit for the operating date")

  ticket = DispatchTicket(
    reservation_id=reservation.id,
    driver_id=reservation.driver_id,
    vehicle_id=reservation.vehicle_id,
    route_id=reservation.route_id,
    queue_number=next_queue_number,
    operating_date=reservation.operating_date,
    issued_by=dispatcher.account_id,
    public_reference=generate_unique_ticket_reference(db),
  )
  reservation.queue_number = next_queue_number
  reservation.approval_status = "approved"
  reservation.queue_status = "on_queue"
  reservation.approved_by = dispatcher.account_id
  reservation.approved_at = datetime.now(PH_TIMEZONE)
  db.add(ticket)
  notification = Notification(
    recipient_id=reservation.driver.account_id,
    notification_type=NotificationType.UPDATED,
    message=(
      f"Your reservation for {reservation.route.origin.terminal_name} - "
      f"{reservation.route.destination.name} on {reservation.operating_date.isoformat()} "
      f"was approved. Your queue number is {route.queue_prefix}-{next_queue_number:04d}. "
      "Open My Tickets to view the reservation details."
    ),
  )
  db.add(notification)
  try:
    db.commit()
  except IntegrityError as exc:
    db.rollback()
    raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Queue position was allocated concurrently; retry confirmation") from exc
  db.expire(reservation, ["ticket"])
  db.refresh(reservation)
  db.refresh(notification)
  await _push_saved_notification(notification)
  return _response(reservation)
