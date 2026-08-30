from datetime import datetime
from sqlalchemy import Boolean, DateTime, Numeric, Enum, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import TYPE_CHECKING

from app.database import Base
from app.enums import TripStatus

if TYPE_CHECKING:
  from app.models.dispatch_log import DispatchLog
  from app.models.gps_log import GpsLog
  from app.models.incident_log import Incident


class Trip(Base):
  __tablename__ = "trips"

  trip_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
  dispatch_id: Mapped[int] = mapped_column(ForeignKey("dispatch_logs.dispatch_id"), nullable=False)
  status: Mapped[TripStatus] = mapped_column(
      Enum(TripStatus, name="trip_status"), nullable=False, default=TripStatus.OUTGOING
  )
  time_departed: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
  time_arrived: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
  # NOTE: ERD types this TIMESTAMPTZ, but "duration in minutes" is a numeric value,
  # not a timestamp — kept as Numeric here since that matches what the column name says.
  trip_duration_minutes: Mapped[float | None] = mapped_column(Numeric(6, 2))
  average_speed_km: Mapped[float | None] = mapped_column(Numeric(6, 2))
  is_complete: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

  # Relationships
  dispatch_log: Mapped["DispatchLog"] = relationship(back_populates="trips")
  gps_logs: Mapped[list["GpsLog"]] = relationship(back_populates="trip")
  incidents: Mapped[list["Incident"]] = relationship(back_populates="trip")