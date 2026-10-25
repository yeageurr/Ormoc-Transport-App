from datetime import datetime, time, timedelta
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
from app.models.audit_log import AuditLog
from app.models.destinations import Destination
from app.models.dispatcher_profile import DispatcherProfile
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


@router.get("/history")
def list_assignment_history(
  operating_date: date | None = Query(default=None),
  db: Session = Depends(get_db),
  officer: Account = Depends(require_role(AccountRole.TICKETING_OFFICER)),
):
  assignments_query = db.query(DispatcherAssignment)
  if operating_date is not None:
    assignments_query = assignments_query.filter(DispatcherAssignment.operating_date == operating_date)
  assignments = assignments_query.all()
  by_id = {row.id: row for row in assignments}
  logs_query = db.query(AuditLog).filter(AuditLog.target_table == "dispatcher_assignments")
  if operating_date is not None:
    logs_query = logs_query.filter(AuditLog.created_at >= datetime.combine(operating_date, time.min, PH_TIMEZONE))
    logs_query = logs_query.filter(AuditLog.created_at < datetime.combine(operating_date + timedelta(days=1), time.min, PH_TIMEZONE))
  logs = logs_query.order_by(AuditLog.created_at.desc()).all()

  route_ids = {row.route_id for row in assignments}
  routes = db.query(Route).join(Destination, Route.destination_id == Destination.destination_id).filter(Route.route_id.in_(route_ids)).all() if route_ids else []
  route_names = {route.route_id: route.destination.name for route in routes}
  account_ids = {row.dispatcher_id for row in assignments} | {log.actor_id for log in logs if log.actor_id is not None}
  accounts = db.query(Account).filter(Account.account_id.in_(account_ids)).all() if account_ids else []
  dispatchers = db.query(DispatcherProfile).filter(DispatcherProfile.account_id.in_(account_ids)).all() if account_ids else []
  account_by_id = {item.account_id: item for item in accounts}
  dispatcher_by_id = {item.account_id: f"{item.first_name} {item.last_name}" for item in dispatchers}
  events = []
  for log in logs:
    context = log.context or {}
    bulk = bool(context.get("bulk_operation"))
    assignment_id = context.get("assignment_id")
    if assignment_id is None and not context.get("route_id") and not bulk:
      assignment_id = log.target_id
    assignment = by_id.get(assignment_id)
    affected_ids = context.get("assignment_ids", []) if bulk else ([assignment.id] if assignment else [])
    affected_assignments = [by_id[item_id] for item_id in affected_ids if item_id in by_id]
    route_labels = [route_names.get(item.route_id, f"Route {item.route_id}") for item in affected_assignments]
    affected_routes = [{
      "assignment_id": item.id,
      "route_id": item.route_id,
      "route_name": route_names.get(item.route_id, f"Route {item.route_id}"),
      "dispatcher_id": item.dispatcher_id,
      "dispatcher_name": dispatcher_by_id.get(item.dispatcher_id, account_by_id.get(item.dispatcher_id).username if account_by_id.get(item.dispatcher_id) else f"Account {item.dispatcher_id}"),
      "operating_date": item.operating_date,
    } for item in affected_assignments]
    if not bulk and not affected_routes and context.get("route_id"):
      failed_route_id = context["route_id"]
      failed_dispatcher_id = context.get("dispatcher_id")
      failed_dispatcher = account_by_id.get(failed_dispatcher_id)
      affected_routes.append({
        "assignment_id": None,
        "route_id": failed_route_id,
        "route_name": route_names.get(failed_route_id, f"Route {failed_route_id}"),
        "dispatcher_id": failed_dispatcher_id,
        "dispatcher_name": dispatcher_by_id.get(failed_dispatcher_id, failed_dispatcher.username if failed_dispatcher else f"Account {failed_dispatcher_id}") if failed_dispatcher_id else "—",
        "operating_date": context.get("operating_date"),
      })
    if bulk:
      affected_data = "All Routes"
    elif assignment:
      affected_data = route_names.get(assignment.route_id, f"Route {assignment.route_id}")
    elif context.get("route_id"):
      route_id = context["route_id"]
      affected_data = route_names.get(route_id, f"Route {route_id}")
    else:
      affected_data = "All Routes" if context.get("all_routes") else "Route details unavailable"
    actor = account_by_id.get(log.actor_id)
    if log.actor_type == "system":
      performed_by = "System"
    elif actor and actor.role == AccountRole.TICKETING_OFFICER:
      performed_by = "Ticketing Officer"
    elif actor:
      performed_by = dispatcher_by_id.get(actor.account_id, actor.username)
    else:
      performed_by = "Unknown"
    events.append({
      "audit_id": log.audit_id,
      "record_id": f"DISP-{log.audit_id:06d}",
      "action": log.details,
      "action_type": "Bulk operation" if bulk else "Action failed" if log.outcome == "failed" else "Opened dispatch operation" if "open" in log.details.lower() else "Closed dispatch operation",
      "performed_by": performed_by,
      "performed_at": log.created_at,
      "operating_date": assignment.operating_date if assignment else context.get("operating_date"),
      "affected_data": affected_data,
      "routes_affected": route_labels if bulk else ([affected_data] if assignment or context.get("route_id") else []),
      "affected_routes": affected_routes,
      "outcome": log.outcome,
      "context": context,
    })
  return events


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
    log_action(db, officer.account_id, AuditAction.CREATE, "dispatcher_assignments", route_id, "Failed to open dispatch ticketing: operating date is in the past", outcome="failed", context={"route_id": route_id, "dispatcher_id": dispatcher_id, "operating_date": operating_date.isoformat()})
    raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Operating date cannot be in the past")
  if db.query(Route.route_id).filter(Route.route_id == route_id, Route.is_active.is_(True)).first() is None:
    log_action(db, officer.account_id, AuditAction.CREATE, "dispatcher_assignments", route_id, "Failed to open dispatch ticketing: route not found", outcome="failed", context={"route_id": route_id, "dispatcher_id": dispatcher_id})
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Route not found")
  dispatcher = db.query(Account).filter(Account.account_id == dispatcher_id).first()
  if dispatcher is None or dispatcher.role != AccountRole.DISPATCHER:
    log_action(db, officer.account_id, AuditAction.CREATE, "dispatcher_assignments", route_id, "Failed to open dispatch ticketing: dispatcher account not found", outcome="failed", context={"route_id": route_id, "dispatcher_id": dispatcher_id})
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
    log_action(db, officer.account_id, AuditAction.CREATE, "dispatcher_assignments", route_id, "Failed to open dispatch ticketing: route or dispatcher already has an open assignment", outcome="failed", context={"route_id": route_id, "dispatcher_id": dispatcher_id, "operating_date": operating_date.isoformat()})
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
    context={"route_id": assignment.route_id, "dispatcher_id": assignment.dispatcher_id, "assignment_id": assignment.id},
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
    log_action(db, officer.account_id, AuditAction.UPDATE, "dispatcher_assignments", assignment_id, "Failed to close dispatch ticketing: assignment not found", outcome="failed")
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dispatch assignment not found")
  if assignment.closed_at is not None:
    log_action(db, officer.account_id, AuditAction.UPDATE, "dispatcher_assignments", assignment_id, "Failed to close dispatch ticketing: assignment is already closed", outcome="failed", context={"route_id": assignment.route_id, "dispatcher_id": assignment.dispatcher_id, "assignment_id": assignment.id})
    raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Dispatch assignment is already closed")

  now = datetime.now(PH_TIMEZONE)
  if assignment.operating_date != now.date():
    log_action(db, officer.account_id, AuditAction.UPDATE, "dispatcher_assignments", assignment_id, "Failed to close dispatch ticketing: assignment operating date does not match today", outcome="failed", context={"route_id": assignment.route_id, "dispatcher_id": assignment.dispatcher_id, "assignment_id": assignment.id})
    raise HTTPException(
      status_code=status.HTTP_409_CONFLICT,
      detail="Manual closure is available only on the assignment's operating date",
    )
  if now.timetz().replace(tzinfo=None) < MANUAL_CLOSE_START:
    log_action(db, officer.account_id, AuditAction.UPDATE, "dispatcher_assignments", assignment_id, "Failed to close dispatch ticketing: manual closure is before 21:00", outcome="failed", context={"route_id": assignment.route_id, "dispatcher_id": assignment.dispatcher_id, "assignment_id": assignment.id})
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
    context={"route_id": assignment.route_id, "dispatcher_id": assignment.dispatcher_id, "assignment_id": assignment.id},
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


@router.post("/close-all")
def close_all_assignments(
  db: Session = Depends(get_db),
  officer: Account = Depends(require_role(AccountRole.TICKETING_OFFICER)),
):
  now = datetime.now(PH_TIMEZONE)
  today = now.date()
  if now.timetz().replace(tzinfo=None) < MANUAL_CLOSE_START:
    log_action(db, officer.account_id, AuditAction.UPDATE, "dispatcher_assignments", 0, "Failed bulk operation: manual closure is before 21:00", outcome="failed", context={"bulk_operation": True, "all_routes": True, "operating_date": today.isoformat()})
    raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Manual assignment closure is available starting at 21:00 Asia/Manila time")
  assignments = (
    db.query(DispatcherAssignment)
    .filter(DispatcherAssignment.operating_date == today, DispatcherAssignment.closed_at.is_(None))
    .with_for_update()
    .all()
  )
  if not assignments:
    log_action(db, officer.account_id, AuditAction.UPDATE, "dispatcher_assignments", 0, "Failed bulk operation: no open routes to close", outcome="failed", context={"bulk_operation": True, "all_routes": True, "operating_date": today.isoformat()})
    raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="There are no open route operations to close")
  for assignment in assignments:
    assignment.closed_at = now
    assignment.closed_by = officer.account_id
    assignment.auto_closed = False
    expire_assignment_reservations(db, assignment, now)
  ids = [item.id for item in assignments]
  route_ids = [item.route_id for item in assignments]
  db.add(AuditLog(
    actor_id=officer.account_id,
    actor_type="account",
    action=AuditAction.UPDATE,
    target_table="dispatcher_assignments",
    target_id=0,
    details=f"Bulk operation: closed all {len(assignments)} open route operations for {today}",
    outcome="success",
    context={"bulk_operation": True, "all_routes": True, "operating_date": today.isoformat(), "assignment_ids": ids, "route_ids": route_ids},
    created_at=now,
  ))
  db.commit()
  return {"closed_count": len(assignments), "detail": "All open route operations have been closed."}
