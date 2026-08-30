from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, Enum, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import TYPE_CHECKING

from app.database import Base
from app.enums import AccountStatus, AccountRole


if TYPE_CHECKING:
  from app.models.user import User
  from app.models.terminal import Terminal
  from app.models.notification import Notification
  from app.models.dispatch_log import DispatchLog
  from app.models.incident_log import Incident
  from app.models.audit_log import AuditLog


class Account(Base):
  __tablename__ = "accounts"

  account_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
  username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
  password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
  status: Mapped[AccountStatus] = mapped_column(
    Enum(AccountStatus, name="account_status"), nullable=False, default=AccountStatus.ACTIVE
  )
  role: Mapped[AccountRole] = mapped_column(Enum(AccountRole, name="account_role"), nullable=False)
  created_on: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
  updated_on: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), onupdate=func.now())
  last_login: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
  must_change_password: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)


  user: Mapped["User"] = relationship(back_populates="account", uselist=False)
  terminal: Mapped["Terminal"] = relationship(back_populates="admin", uselist=False)
  notifications: Mapped[list["Notification"]] = relationship(back_populates="recipient")
  dispatch_logs: Mapped[list["DispatchLog"]] = relationship(back_populates="admin")
  incidents_updated: Mapped[list["Incident"]] = relationship(back_populates="updated_by_account")
  audit_logs: Mapped[list["AuditLog"]] = relationship(back_populates="actor")