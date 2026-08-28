from __future__ import annotations

from sqlalchemy import String, ForeignKey, Text, Enum, DateTime, func, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base
from datetime import datetime, timezone
from app.enums import UserRole, AccountStatus


class Accounts(Base):
  __tablename__ = "account"

  account_id: Mapped[int] = mapped_column(primary_key=True)
  username: Mapped[str] = mapped_column(String(11), unique=True, nullable=False)
  password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
  role: Mapped[UserRole] = mapped_column(Enum(UserRole), nullable=False, default=UserRole.DRIVER)
  status: Mapped[AccountStatus] = mapped_column(Enum(AccountStatus), nullable=False, default=AccountStatus.ACTIVE)
  created_on: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda:datetime.now(timezone.utc), server_default=func.now())
  updated_on: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda:datetime.now(timezone.utc), server_default=func.now())
  last_login: Mapped[datetime] = mapped_column(DateTime(timezone=True))
  must_change_password: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)