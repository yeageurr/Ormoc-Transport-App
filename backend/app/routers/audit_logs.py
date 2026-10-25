from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.account import Account
from app.models.audit_log import AuditLog
from app.models.user import User
from app.schemas.audit_log import AuditLogResponse
from app.core.permissions import require_role
from app.enums import AccountRole

router = APIRouter()


@router.get("", response_model=list[AuditLogResponse])
def list_audit_logs(
  target_table: str | None = None, 
  exclude_target_table: str | None = None,
  actor_id: int | None = None, 
  db: Session = Depends(get_db), 
  ticketing_officer: Account = Depends(require_role(AccountRole.TICKETING_OFFICER),)
):

  query = db.query(AuditLog)

  if target_table:
    query = query.filter(AuditLog.target_table == target_table)
  if exclude_target_table:
    query = query.filter(AuditLog.target_table != exclude_target_table)

  if actor_id:
    query = query.filter(AuditLog.actor_id == actor_id)

  entries = query.order_by(AuditLog.created_at.desc()).all()
  user_ids = [entry.target_id for entry in entries if entry.target_table == "users" and not (entry.context or {}).get("account_id")]
  account_by_user_id = {
    user.user_id: user.account_id
    for user in db.query(User).filter(User.user_id.in_(user_ids)).all()
  } if user_ids else {}
  return [
    {
      **AuditLogResponse.model_validate(entry).model_dump(),
      "context": entry.context or ({"account_id": account_by_user_id[entry.target_id], "user_id": entry.target_id} if entry.target_id in account_by_user_id else None),
    }
    for entry in entries
  ]


@router.get("/{audit_id}", response_model=AuditLogResponse)
def get_audit_log(
  audit_id: int,
  db: Session = Depends(get_db),
  ticketing_officer: Account = Depends(require_role(AccountRole.TICKETING_OFFICER)),
):

  entry = db.query(AuditLog).filter(AuditLog.audit_id == audit_id).first()
  if entry is None:
    raise HTTPException(
      status_code = status.HTTP_404_NOT_FOUND,
      detail="Audit log entry not found"
    )

  response = AuditLogResponse.model_validate(entry).model_dump()
  if entry.target_table == "users" and not (entry.context or {}).get("account_id"):
    user = db.query(User).filter(User.user_id == entry.target_id).first()
    if user:
      response["context"] = {"account_id": user.account_id, "user_id": user.user_id}
  return response
