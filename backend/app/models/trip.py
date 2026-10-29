from datetime import datetime
from sqlalchemy import Boolean, DateTime, Numeric, Enum, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import TYPE_CHECKING

from app.database import Base
from app.enums import TripStatus

if TYPE_CHECKING:
  from app.models.gps_log import GpsLog
  from app.models.user import User
  from app.models.vehicle import Vehicle
  from app.models.route import Route
  from app.models.trip_pause_event import TripPauseEvent


class Trip(Base):
  __tablename__ = "trips"

  trip_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
  driver_id: Mapped[int] = mapped_column(ForeignKey("users.user_id"), nullable=False)
  vehicle_id: Mapped[int] = mapped_column(ForeignKey("vehicles.vehicle_id"), nullable=False)
  route_id: Mapped[int] = mapped_column(ForeignKey("routes.route_id"), nullable=False, index=True)
  status: Mapped[TripStatus] = mapped_column(
      Enum(TripStatus, name="trip_status"), nullable=False, default=TripStatus.OUTGOING
  )
  time_departed: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
  time_arrived: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
  # NOTE: ERD types this TIMESTAMPTZ, but "duration in minutes" is a numeric value,
  # not a timestamp — kept as Numeric here since that matches what the column name says.
  trip_duration_minutes: Mapped[float | None] = mapped_column(Numeric(6, 2))
  average_speed_km: Mapped[float | None] = mapped_column(Numeric(6, 2))
  distance_traveled_km: Mapped[float | None] = mapped_column(Numeric(8, 3))
  is_complete: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

  # Relationships
  route: Mapped["Route | None"] = relationship(back_populates="trips")
  driver: Mapped["User | None"] = relationship(back_populates="direct_trips")
  vehicle: Mapped["Vehicle | None"] = relationship(back_populates="direct_trips")
  gps_logs: Mapped[list["GpsLog"]] = relationship(back_populates="trip")
  pause_events: Mapped[list["TripPauseEvent"]] = relationship(
    back_populates="trip", cascade="all, delete-orphan", order_by="TripPauseEvent.paused_at"
  )
