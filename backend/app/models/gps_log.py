from datetime import datetime
from sqlalchemy import DateTime, Numeric, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import TYPE_CHECKING

from app.database import Base

if TYPE_CHECKING:
  from app.models.trip import Trip


class GpsLog(Base):
  __tablename__ = "gps_logs"

  gps_log_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
  trip_id: Mapped[int] = mapped_column(ForeignKey("trips.trip_id"), nullable=False)
  latitude: Mapped[float] = mapped_column(Numeric(9, 6), nullable=False)
  longitude: Mapped[float] = mapped_column(Numeric(9, 6), nullable=False)
  recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
  speed_kmh: Mapped[float] = mapped_column(Numeric(6, 2), nullable=False)

  # Relationships
  trip: Mapped["Trip"] = relationship(back_populates="gps_logs")