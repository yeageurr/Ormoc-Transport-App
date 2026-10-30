from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class TripPauseEvent(Base):
  """Audit marker for a driver pause; GPS logging continues during pauses."""

  __tablename__ = "trip_pause_events"

  pause_event_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
  trip_id: Mapped[int] = mapped_column(ForeignKey("trips.trip_id", ondelete="CASCADE"), nullable=False, index=True)
  paused_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
  resumed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
  delay_reason: Mapped[str | None] = mapped_column(String(32))
  delay_details: Mapped[str | None] = mapped_column(Text)
  broadcast_to_commuters: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")

  trip = relationship("Trip", back_populates="pause_events")
