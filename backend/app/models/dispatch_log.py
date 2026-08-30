from datetime import datetime
from sqlalchemy import DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import TYPE_CHECKING

from app.database import Base

if TYPE_CHECKING:
  from app.models.account import Account
  from app.models.user import User
  from app.models.vehicle import Vehicle
  from app.models.route import Route
  from app.models.trip import Trip


class DispatchLog(Base):
  __tablename__ = "dispatch_logs"

  dispatch_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
  admin_id: Mapped[int | None] = mapped_column(ForeignKey("accounts.account_id"))
  driver_id: Mapped[int] = mapped_column(ForeignKey("users.user_id"), nullable=False)
  vehicle_id: Mapped[int] = mapped_column(ForeignKey("vehicles.vehicle_id"), nullable=False)
  route_id: Mapped[int] = mapped_column(ForeignKey("routes.route_id"), nullable=False)
  created_on: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
  effective_on: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

  # Relationships
  admin: Mapped["Account"] = relationship(back_populates="dispatch_logs")
  driver: Mapped["User"] = relationship(back_populates="dispatch_logs")
  vehicle: Mapped["Vehicle"] = relationship(back_populates="dispatch_logs")
  route: Mapped["Route"] = relationship(back_populates="dispatch_logs")
  trips: Mapped[list["Trip"]] = relationship(back_populates="dispatch_log")