import re

from pydantic import BaseModel, field_validator

from app.enums import AccountRole


class LoginRequest(BaseModel):
  username: str
  password: str


class TokenResponse(BaseModel):
  access_token: str
  token_type: str = "bearer"
  must_change_password: bool


class TokenPayload(BaseModel):
  """What gets encoded inside the JWT."""
  account_id: int
  role: AccountRole
  exp: int


class ChangePasswordRequest(BaseModel):
  current_password: str
  new_password: str
  confirm_password: str

  @field_validator("new_password")
  @classmethod
  def validate_password_strength(cls, value: str) -> str:
    """Require 8+ characters with lowercase, uppercase, and a digit.

    Symbols remain optional. A Python regex is used here because Pydantic's
    default regex engine intentionally does not support look-ahead patterns.
    """
    password_pattern = re.compile(r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$")
    if not password_pattern.fullmatch(value):
      raise ValueError(
        "Password must be at least 8 characters and include an uppercase letter, "
        "a lowercase letter, and a number"
      )
    return value
