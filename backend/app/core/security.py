import os
from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
from passlib.context import CryptContext
from dotenv import load_dotenv

from app.enums import AccountRole

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKE_EXPIRE_MINUTES", 480))

pwd_context = CryptContext(schemas=["bcrypt"], deprecated="auto")


# Password Hashing
def hash_password(plain_password: str):
  return pwd_context.hash(plain_password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
  return pwd_context.verify(plain_password, hashed_password)


# JWT
def create_access_token(account_id: int, role: AccountRole) -> str:
  expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
  payload = {
    "account_id": account_id,
    "role": role.value,
    "exxp": expire
  }

  return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict | None:
  try:
    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    return payload
  except JWTError:
    return None