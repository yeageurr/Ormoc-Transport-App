from sqlalchemy.orm import Session
from typing import Any

from app.models.audit_log import AuditLog
from app.enums import AuditAction


def log_action(
  db: Session,
  actor_id: int | None,
  action: AuditAction,
  target_table: str,
  target_id: int,
  details: str,
  *,
  outcome: str = "success",
  actor_type: str = "account",
  context: dict[str, Any] | None = None,
) -> AuditLog:
  """Called from other routers after a create/update/suspend/etc. action.
  Not a standalone endpoint — this is infrastructure, not user-facing."""
  entry = AuditLog(
    actor_id=actor_id,
    actor_type=actor_type,
    action=action,
    target_table=target_table,
    target_id=target_id,
    details=details,
    outcome=outcome,
    context=context,
  )
  db.add(entry)
  db.commit()
  return entry
