from datetime import datetime, time
from zoneinfo import ZoneInfo

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.permissions import require_role
from app.enums import AccountRole, AuditAction
from app.models.account import Account
from app.models.dispatcher_assignment import DispatcherAssignment
from app.models.route import Route
from app.schemas.dispatcher_assignment import DispatcherAssignmentCreate, DispatcherAssignmentResponse
from app.services.dispatcher_assignment_service import expire_assignment_reservations
from app.services.audit_service import log_action

router = APIRouter()
PH_TIMEZONE = ZoneInfo("Asia/Manila")
MANUAL_CLOSE_START = time(21, 0)


@router.get("")
def list_assignments(
  operating_date: date | None = Query(default=None),
  db: Session = Depends(get_db),
  officer: Account = Depends(require_role(AccountRole.TICKETING_OFFICER)),
):
  query = db.query(DispatcherAssignment)
  if operating_date is not None:
    query = query.filter(DispatcherAssignment.operating_date == operating_date)
  assignments = query.order_by(DispatcherAssignment.created_at.desc()).all()
  return [
    {
      "id": item.id,
      "operating_date": item.operating_date,
      "route_id": item.route_id,
      "dispatcher_id": item.dispatcher_id,
      "assigned_by": item.assigned_by,
      "created_at": item.created_at,
      "closed_at": item.closed_at,
      "closed_by": item.closed_by,
      "auto_closed": item.auto_closed,
    }
    for item in assignments
  ]


@router.post("", response_model=DispatcherAssignmentResponse, status_code=status.HTTP_201_CREATED)
def create_assignment(
  payload: DispatcherAssignmentCreate,
  db: Session = Depends(get_db),
  officer: Account = Depends(require_role(AccountRole.TICKETING_OFFICER)),
):
  operating_date = payload.operating_date
  route_id = payload.route_id
  dispatcher_id = payload.dispatcher_id
  if operating_date < datetime.now(PH_TIMEZONE).date():
    raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Operating date cannot be in the past")
  if db.query(Route.route_id).filter(Route.route_id == route_id, Route.is_active.is_(True)).first() is None:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Route not found")
  dispatcher = db.query(Account).filter(Account.account_id == dispatcher_id).first()
  if dispatcher is None or dispatcher.role != AccountRole.DISPATCHER:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dispatcher account not found")

  assignment = DispatcherAssignment(
    operating_date=operating_date,
    route_id=route_id,
    dispatcher_id=dispatcher_id,
    assigned_by=officer.account_id,
  )
  db.add(assignment)
  try:
    db.commit()
  except IntegrityError as exc:
    db.rollback()
    # Partial unique indexes enforce both the one-route-per-dispatcher and
    # one-dispatcher-per-route rule for an operating date.
    raise HTTPException(
      status_code=status.HTTP_409_CONFLICT,
      detail="The dispatcher or route already has an open assignment for that date",
    ) from exc
  db.refresh(assignment)
  log_action(
    db, officer.account_id, AuditAction.CREATE, "dispatcher_assignments", assignment.id,
    f"Opened dispatch ticketing for route {assignment.route_id} on {assignment.operating_date}; dispatcher account {assignment.dispatcher_id}",
  )
  return {
    "id": assignment.id,
    "operating_date": assignment.operating_date,
    "route_id": assignment.route_id,
    "dispatcher_id": assignment.dispatcher_id,
    "assigned_by": assignment.assigned_by,
    "created_at": assignment.created_at,
    "closed_at": assignment.closed_at,
    "auto_closed": assignment.auto_closed,
  }


@router.post("/{assignment_id}/close", response_model=DispatcherAssignmentResponse)
def close_assignment(
  assignment_id: int,
  db: Session = Depends(get_db),
  officer: Account = Depends(require_role(AccountRole.TICKETING_OFFICER)),
):
  assignment = (
    db.query(DispatcherAssignment)
    .filter(DispatcherAssignment.id == assignment_id)
    .with_for_update()
    .first()
  )
  if assignment is None:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dispatch assignment not found")
  if assignment.closed_at is not None:
    raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Dispatch assignment is already closed")

  now = datetime.now(PH_TIMEZONE)
  if assignment.operating_date != now.date():
    raise HTTPException(
      status_code=status.HTTP_409_CONFLICT,
      detail="Manual closure is available only on the assignment's operating date",
    )
  if now.timetz().replace(tzinfo=None) < MANUAL_CLOSE_START:
    raise HTTPException(
      status_code=status.HTTP_409_CONFLICT,
      detail="Manual assignment closure is available starting at 21:00 Asia/Manila time",
    )

  assignment.closed_at = now
  assignment.closed_by = officer.account_id
  assignment.auto_closed = False
  expire_assignment_reservations(db, assignment, now)
  db.commit()
  db.refresh(assignment)
  log_action(
    db, officer.account_id, AuditAction.UPDATE, "dispatcher_assignments", assignment.id,
    f"Closed dispatch ticketing for route {assignment.route_id} on {assignment.operating_date}",
  )
  return {
    "id": assignment.id,
    "operating_date": assignment.operating_date,
    "route_id": assignment.route_id,
    "dispatcher_id": assignment.dispatcher_id,
    "assigned_by": assignment.assigned_by,
    "created_at": assignment.created_at,
    "closed_at": assignment.closed_at,
    "closed_by": assignment.closed_by,
    "auto_closed": assignment.auto_closed,
  }
