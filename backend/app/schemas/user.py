from datetime import datetime
import re

from pydantic import BaseModel, ConfigDict, EmailStr, field_validator

from app.enums import AccountStatus, AccountRole


# ---------- Account ----------

class AccountBase(BaseModel):
  username: str
  role: AccountRole


class AccountResponse(AccountBase):
  model_config = ConfigDict(from_attributes=True)

  account_id: int
  account_code: str
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
  password: str | None = None


class UserResponse(UserBase):
  model_config = ConfigDict(from_attributes=True)

  user_id: int
  driver_id: str
  account: AccountResponse


class UserUpdate(BaseModel):
  """Driver self-edit. Changing the login phone or email requires current-password verification."""
  first_name: str | None = None
  last_name: str | None = None
  email: EmailStr | None = None
  contact_number: str | None = None
  current_password: str | None = None

  @field_validator("contact_number")
  @classmethod
  def validate_contact_number(cls, value: str | None) -> str | None:
    if value is not None and not re.fullmatch(r"\d{11}", value):
      raise ValueError("Contact number must be exactly 11 digits")
    return value


class UserUpdateResponse(UserResponse):
  email_verification_pending: bool = False
  pending_email: EmailStr | None = None


class EmailOtpVerify(BaseModel):
  code: str

  @field_validator("code")
  @classmethod
  def validate_code(cls, value: str) -> str:
    if not re.fullmatch(r"\d{6}", value):
      raise ValueError("Code must be exactly 6 digits")
    return value


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
