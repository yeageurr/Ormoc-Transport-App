from datetime import datetime
import re

from pydantic import BaseModel, ConfigDict, EmailStr, field_validator, model_validator

from app.enums import AccountStatus, AccountRole
from app.schemas.vehicle import VehicleBase


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
  vehicle: VehicleBase | None = None
  vehicle_id: int | None = None

  @field_validator("contact_number")
  @classmethod
  def validate_contact_number(cls, value: str) -> str:
    if not re.fullmatch(r"\d{11}", value):
      raise ValueError("Contact number must be exactly 11 digits")
    return value

  @model_validator(mode="after")
  def validate_vehicle_choice(self):
    if (self.vehicle is None) == (self.vehicle_id is None):
      raise ValueError("Choose exactly one: create a new vehicle or pick an existing vehicle")
    return self


class DispatcherCreate(BaseModel):
  first_name: str
  last_name: str
  contact_number: str
  email: EmailStr | None = None

  @field_validator("contact_number")
  @classmethod
  def validate_contact_number(cls, value: str) -> str:
    if not re.fullmatch(r"\d{11}", value):
      raise ValueError("Contact number must be exactly 11 digits")
    return value

  @field_validator("first_name", "last_name")
  @classmethod
  def validate_name(cls, value: str) -> str:
    value = value.strip()
    if not value or len(value) > 50:
      raise ValueError("Name must be between 1 and 50 characters")
    return value


class UserResponse(UserBase):
  model_config = ConfigDict(from_attributes=True)

  user_id: int
  driver_id: str
  vehicle_plate_number: str | None = None
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
  """Staff may maintain only regulatory driver and vehicle details."""
  license_num: str | None = None
  license_expiry: datetime | None = None
  vehicle_plate_number: str | None = None

  @field_validator("license_num")
  @classmethod
  def validate_license_num(cls, value: str | None) -> str | None:
    if value is None:
      raise ValueError("License number cannot be empty")
    value = value.strip()
    if not value or len(value) > 13:
      raise ValueError("License number must be between 1 and 13 characters")
    return value

  @field_validator("vehicle_plate_number")
  @classmethod
  def validate_vehicle_plate_number(cls, value: str | None) -> str | None:
    if value is None:
      raise ValueError("Vehicle plate number cannot be empty")
    value = value.strip().upper()
    if not value or len(value) > 8:
      raise ValueError("Vehicle plate number must be between 1 and 8 characters")
    return value

  @field_validator("license_expiry")
  @classmethod
  def validate_license_expiry(cls, value: datetime | None) -> datetime:
    if value is None:
      raise ValueError("License expiry date is required")
    return value
