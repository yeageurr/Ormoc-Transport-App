from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import TYPE_CHECKING

from app.database import Base

if TYPE_CHECKING:
  from app.models.account import Account
  from app.models.vehicle import Vehicle
  from app.models.dispatch_log import DispatchLog
  from app.models.incident_log import Incident


class User(Base):
  __tablename__ = "users"

  user_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
  account_id: Mapped[int] = mapped_column(
    ForeignKey("accounts.account_id"), unique=True, nullable=False
  )
  first_name: Mapped[str] = mapped_column(String(50), nullable=False)
  last_name: Mapped[str] = mapped_column(String(50), nullable=False)
  contact_number: Mapped[str] = mapped_column(String(11), unique=True, nullable=False)
  email: Mapped[str | None] = mapped_column(String(25), unique=True)
  license_num: Mapped[str] = mapped_column(String(11), unique=True, nullable=False)
  license_expiry: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

  # Relationships
  account: Mapped["Account"] = relationship(back_populates="user")
  vehicle: Mapped["Vehicle"] = relationship(back_populates="owner", uselist=False)
  dispatch_logs: Mapped[list["DispatchLog"]] = relationship(back_populates="driver")
  incidents_resolved: Mapped[list["Incident"]] = relationship(back_populates="resolved_by_user")