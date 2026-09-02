from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.account import Account
from app.models.user import User
from app.schemas.user import UserResponse, UserUpdate
from app.core.permissions import get_current_account, require_role
from app.enums import AccountRole
from app.services.audit_service import log_action

router = APIRouter()


@router.get("/me", response_model=UserResponse)
def get_my_profile(db: Session = Depends(get_db), current_account: Account = Depends(get_current_account), ):
  user = db.query(User).filter(User.account_id == current_account.account_id).first()
  if user is None:
    raise HTTPException(
      status_code=status.HTTP_404_NOT_FOUND,
      details="No profile linked to this account (admin accounts don't have a User row)",
    )

  return user


@router.patch("/me", response_model=UserResponse)
def update_my_profile(payload: UserUpdate, db: Session = Depends(get_db), current_account: Account = Depends(get_current_account), ):
  # contact number is deliberately excluded from the UserUpdate, its the login username so it's not self-editable through this endpoint

  user = db.query(User).filter(User.account_id == current_account.account_id).first()
  if user is None:
    raise HTTPException(
      status_code=status.HTTP_404_NOT_FOUND,
      detail="No profile linked to this account"
    )

  update_data = payload.model_dump(exclude_unset=True)
  for field, value in update_data.items():
    setattr(user, field, value)

  db.commit()
  db.refresh(user)

  log_action(db, current_account.account_id, "users", user.user_id, "Updated own profile")
  return user


# Endpoint for admin checking a user profile
@router.get("/{user_id}", response_model=UserResponse)
def get_user(user_id: int, db: Session = Depends(get_db), current_admin: Account = Depends(require_role(AccountRole.ADMIN)), ):
  user = db.query(User).filter(User.user_id == user_id).first()
  if user is None:
    raise HTTPException(
      status_code=status.HTTP_404_NOT_FOUND,
      detail="User not found"
    )

  return user