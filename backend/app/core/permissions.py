from typing import Optional
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.security import decode_access_token
from app.models.account import Account
from app.enums import AccountRole, AccountStatus


class OAuth2PasswordBearerWithCookie(OAuth2PasswordBearer):
  async def __call__(self, request: Request) -> Optional[str]:
    # 1. Try reading the token from the HttpOnly cookie first
    token = request.cookies.get("access_token")

    if token:
      # Strip "Bearer " prefix if present in the cookie
      if token.startswith("Bearer "):
        return token.split(" ")[1]
      return token

    # 2. Fall back to checking the Authorization header (via standard OAuth2PasswordBearer)
    return await super().__call__(request)


# Use our custom scheme instead of standard OAuth2PasswordBearer
oauth2_scheme = OAuth2PasswordBearerWithCookie(tokenUrl="auth/login", auto_error=False)


def get_current_account(
  token: Optional[str] = Depends(oauth2_scheme),
  db: Session = Depends(get_db)
) -> Account:
  credentials_exception = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Could not validate credentials",
    headers={"WWW-Authenticate": "Bearer"}
  )

  if not token:
    raise credentials_exception

  payload = decode_access_token(token)
  if payload is None:
    raise credentials_exception

  account_id = payload.get("account_id")
  if account_id is None:
    raise credentials_exception

  account = db.query(Account).filter(Account.account_id == account_id).first()
  if account is None:
    raise credentials_exception

  if account.status != AccountStatus.ACTIVE:
    raise HTTPException(
      status_code=status.HTTP_403_FORBIDDEN,
      detail=f"Account is {account.status.value}"
    )

  return account


def require_role(*allowed_roles: AccountRole):
  def role_checker(account: Account = Depends(get_current_account)) -> Account:
    if account.role not in allowed_roles:
      raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="You do not have permission to perform this action",
      )
    return account
  return role_checker