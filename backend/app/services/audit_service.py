from sqlalchemy.orm import Session
from app.models.audit_log import AuditLog

def log_action(db: Session, actor_id: int, target_table: str, target_id: int, details: str) -> AuditLog:
  entry = AuditLog(
    actor_id = actor_id,
    target_table = target_table,
    target_id = target_id,
    details = details,
  )

  db.add(entry)
  db.commit()
  return entry