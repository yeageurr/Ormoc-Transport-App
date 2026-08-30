from datetime import datetime
from sqlalchemy import Text, Boolean, DateTime, Enum, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import TYPE_CHECKING

from app.database import Base
from app.enums import NotificationType, BroadcastType

if TYPE_CHECKING:
  from app.models.terminal import Terminal
  from app.models.account import Account
  from app.models.route import Route


class Notification(Base):
  """Targeted, persistent — one specific recipient, never auto-expires."""
  __tablename__ = "notifications"

  notification_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
  recipient_id: Mapped[int] = mapped_column(ForeignKey("accounts.account_id"), nullable=False)
  notification_type: Mapped[NotificationType] = mapped_column(
    Enum(NotificationType, name="notification_type"), nullable=False
  )
  message: Mapped[str | None] = mapped_column(Text)
  is_read: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
  created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())


  recipient: Mapped["Account"] = relationship(back_populates="notifications")


class BroadcastNotification(Base):
  __tablename__ = "broadcast_notifications"

  broadcast_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
  terminal_id: Mapped[int | None] = mapped_column(ForeignKey("terminals.terminal_id"))
  route_id: Mapped[int | None] = mapped_column(ForeignKey("routes.route_id"))
  broadcast_type: Mapped[BroadcastType] = mapped_column(
    Enum(BroadcastType, name="broadcast_type"), nullable=False
  )
  created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())


  terminal: Mapped["Terminal"] = relationship(back_populates="broadcast_notifications")
  route: Mapped["Route"] = relationship(back_populates="broadcast_notifications")