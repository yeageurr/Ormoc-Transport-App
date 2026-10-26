from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class PassengerQueueEntry(Base):
  __tablename__ = "passenger_queue_entries"
  __table_args__ = (
    Index("ix_passenger_queue_route_active_seen", "route_id", "is_active", "last_seen_at"),
  )

  passenger_queue_entry_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
  session_token: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
  route_id: Mapped[int] = mapped_column(ForeignKey("routes.route_id", ondelete="CASCADE"), nullable=False)
  terminal_id: Mapped[int] = mapped_column(ForeignKey("terminals.terminal_id", ondelete="CASCADE"), nullable=False)
  is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="true")
  joined_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
  last_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
  left_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
