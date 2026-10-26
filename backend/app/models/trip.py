from datetime import datetime
from uuid import UUID
from sqlalchemy import Boolean, CheckConstraint, DateTime, Numeric, Enum, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import TYPE_CHECKING

from app.database import Base
from app.enums import TripStatus

if TYPE_CHECKING:
  from app.models.dispatch_log import DispatchLog
  from app.models.gps_log import GpsLog
  from app.models.incident_log import Incident
  from app.models.user import User
  from app.models.vehicle import Vehicle
  from app.models.dispatch_ticket import DispatchTicket
  from app.models.route import Route


class Trip(Base):
  __tablename__ = "trips"

  __table_args__ = (
    CheckConstraint(
      "(dispatch_id IS NOT NULL AND driver_id IS NULL AND vehicle_id IS NULL) "
      "OR (dispatch_id IS NULL AND driver_id IS NOT NULL AND vehicle_id IS NOT NULL)",
      name="ck_trips_identity_source",
    ),
  )

  trip_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
  dispatch_id: Mapped[int | None] = mapped_column(ForeignKey("dispatch_logs.dispatch_id"), nullable=True)
  driver_id: Mapped[int | None] = mapped_column(ForeignKey("users.user_id"), nullable=True)
  vehicle_id: Mapped[int | None] = mapped_column(ForeignKey("vehicles.vehicle_id"), nullable=True)
  route_id: Mapped[int | None] = mapped_column(ForeignKey("routes.route_id"), nullable=True, index=True)
  dispatch_ticket_id: Mapped[UUID | None] = mapped_column(ForeignKey("dispatch_tickets.id"), nullable=True)
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
  dispatch_log: Mapped["DispatchLog | None"] = relationship(back_populates="trips")
  route: Mapped["Route | None"] = relationship(back_populates="trips")
  driver: Mapped["User | None"] = relationship(back_populates="direct_trips")
  vehicle: Mapped["Vehicle | None"] = relationship(back_populates="direct_trips")
  dispatch_ticket: Mapped["DispatchTicket | None"] = relationship(back_populates="trip")
  gps_logs: Mapped[list["GpsLog"]] = relationship(back_populates="trip")
  incidents: Mapped[list["Incident"]] = relationship(back_populates="trip")
