from pydantic import BaseModel

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