from datetime import datetime
from pydantic import BaseModel, ConfigDict, EmailStr

from app.enums import AccountStatus, AccountRole


# ---------- Account ----------

class AccountBase(BaseModel):
  username: str
  role: AccountRole


class AccountResponse(AccountBase):
  model_config = ConfigDict(from_attributes=True)

  account_id: int
  status: AccountStatus
  created_on: datetime
  last_login: datetime
  must_change_password: bool


# ---------- User (profile) ----------

class UserBase(BaseModel):
  first_name: str
  last_name: str
  contact_number: str
  email: EmailStr | None = None
  license_num: str
  license_expiry: datetime


class DriverCreate(UserBase):
  """Admin-facing form to create a new driver — creates both the
  Account (auth) and User (profile) rows together."""
  password: str


class UserResponse(UserBase):
  model_config = ConfigDict(from_attributes=True)

  user_id: int
  account: AccountResponse


class UserUpdate(BaseModel):
  """Driver editing their own profile — phone number intentionally
  excluded since it's the login username and locked from self-edit."""
  first_name: str | None = None
  last_name: str | None = None
  email: EmailStr | None = None