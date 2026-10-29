from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

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
  admin: Account = Depends(require_role(AccountRole.ADMIN),)
):

  query = db.query(AuditLog)

  if target_table:
    query = query.filter(AuditLog.target_table == target_table)
  if exclude_target_table:
    query = query.filter(AuditLog.target_table != exclude_target_table)

  if actor_id:
    query = query.filter(AuditLog.actor_id == actor_id)

  entries = query.order_by(AuditLog.created_at.desc()).all()
  actor_ids = {entry.actor_id for entry in entries if entry.actor_id is not None}
  actor_accounts = db.query(Account).filter(Account.account_id.in_(actor_ids)).options(joinedload(Account.user)).all() if actor_ids else []
  actor_by_id = {account.account_id: account for account in actor_accounts}
  actor_display_names = {
    account_id: (
      account.display_name
      or (f"{account.user.first_name} {account.user.last_name}" if account.user else None)
    )
    for account_id, account in actor_by_id.items()
  }
  user_ids = [entry.target_id for entry in entries if entry.target_table == "users" and not (entry.context or {}).get("account_id")]
  account_by_user_id = {
    user.user_id: user.account_id
    for user in db.query(User).filter(User.user_id.in_(user_ids)).all()
  } if user_ids else {}
  result = []
  for entry in entries:
    response = AuditLogResponse.model_validate(entry).model_dump()
    if entry.actor_id in actor_by_id:
      response["actor"] = {
        **(response.get("actor") or {}),
        "display_name": actor_display_names.get(entry.actor_id),
      }
    response["context"] = entry.context or (
      {"account_id": account_by_user_id[entry.target_id], "user_id": entry.target_id}
      if entry.target_id in account_by_user_id else None
    )
    result.append(response)
  return result


@router.get("/{audit_id}", response_model=AuditLogResponse)
def get_audit_log(
  audit_id: int,
  db: Session = Depends(get_db),
  admin: Account = Depends(require_role(AccountRole.ADMIN)),
):

  entry = db.query(AuditLog).filter(AuditLog.audit_id == audit_id).first()
  if entry is None:
    raise HTTPException(
      status_code = status.HTTP_404_NOT_FOUND,
      detail="Audit log entry not found"
    )

  response = AuditLogResponse.model_validate(entry).model_dump()
  if entry.actor_id is not None:
    actor_account = db.query(Account).filter(Account.account_id == entry.actor_id).options(joinedload(Account.user)).first()
    if actor_account is not None:
      response["actor"] = response.get("actor") or {}
      response["actor"]["display_name"] = actor_account.display_name or (
        f"{actor_account.user.first_name} {actor_account.user.last_name}" if actor_account.user else None
      )
  if entry.target_table == "users" and not (entry.context or {}).get("account_id"):
    user = db.query(User).filter(User.user_id == entry.target_id).first()
    if user:
      response["context"] = {"account_id": user.account_id, "user_id": user.user_id}
  return response
