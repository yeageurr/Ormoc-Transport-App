from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog
from app.enums import AuditAction


def log_action(db: Session, actor_id: int, action: AuditAction, target_table: str, target_id: int, details: str) -> AuditLog:
  """Called from other routers after a create/update/suspend/etc. action.
  Not a standalone endpoint — this is infrastructure, not user-facing."""
  entry = AuditLog(
    actor_id=actor_id,
    action=action,
    target_table=target_table,
    target_id=target_id,
    details=details,
  )
  db.add(entry)
  db.commit()
  return entry