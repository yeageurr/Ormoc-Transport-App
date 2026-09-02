from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.account import Account
from app.models.audit_log import AuditLog
from app.schemas.audit_log import AuditLogResponse
from app.core.permissions import require_role
from app.enums import AccountRole

router = APIRouter()


@router.get("", response_model=list[AuditLogResponse])
def list_audit_logs(
  target_table: str | None = None, 
  actor_id: int | None = None, 
  db: Session = Depends(get_db), 
  current_admin: Account = Depends(require_role(AccountRole.ADMIN),)
):

  query = db.query(AuditLog)

  if target_table:
    query = query.filter(AuditLog.target_table == target_table)

  if actor_id:
    query = query.filter(AuditLog.actor_id == actor_id)

  return query.order_by(AuditLog.created_at.desc()).all()


@router.get("/{audit_id}", response_model=AuditLogResponse)
def get_audit_log(
  audit_id: int,
  db: Session = Depends(get_db),
  current_admin: Account = Depends(require_role(AccountRole.ADMIN)),
):

  entry = db.query(AuditLog).filter(AuditLog.audit_id == audit_id).first()
  if entry is None:
    raise HTTPException(
      status_code = status.HTTP_404_NOT_FOUND,
      detail="Audit log entry not found"
    )

  return entry