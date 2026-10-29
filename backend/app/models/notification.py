from datetime import datetime
from sqlalchemy import Text, Boolean, DateTime, Enum, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import TYPE_CHECKING

from app.database import Base
from app.enums import NotificationType

if TYPE_CHECKING:
  from app.models.account import Account


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
