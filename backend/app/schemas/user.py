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
  Account (auth) and User (profile) rows together. If password is
  omitted, a random temporary password is generated server-side."""
  password: str | None = None


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


class DriverAdminUpdate(BaseModel):
  """Admin editing a driver's profile — unlike UserUpdate, this CAN
  touch contact_number and license fields, since the admin is the
  authoritative source for correcting driver records (e.g. a typo'd
  phone number or license renewal), not the driver themselves."""
  first_name: str | None = None
  last_name: str | None = None
  contact_number: str | None = None
  email: EmailStr | None = None
  license_num: str | None = None
  license_expiry: datetime | None = None