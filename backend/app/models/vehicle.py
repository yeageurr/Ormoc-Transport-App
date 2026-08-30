from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, Enum, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import TYPE_CHECKING

from app.database import Base
from app.enums import VehicleCondition, VehicleActivityStatus

if TYPE_CHECKING:
  from app.models.user import User
  from app.models.geofence_event import GeofenceEvent
  from app.models.dispatch_log import DispatchLog



class Vehicle(Base):
  __tablename__ = "vehicles"

  vehicle_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
  owner_id: Mapped[int] = mapped_column(ForeignKey("users.user_id"), nullable=False)
  body_color: Mapped[str] = mapped_column(String(7), nullable=False)  # hex value, e.g. "#1D9E75"
  body_number: Mapped[str] = mapped_column(String(10), unique=True, nullable=False)
  plate_number: Mapped[str] = mapped_column(String(7), unique=True, nullable=False)
  vehicle_type: Mapped[str] = mapped_column(String(50), nullable=False)
  condition: Mapped[VehicleCondition] = mapped_column(
    Enum(VehicleCondition, name="vehicle_condition"), nullable=False, default=VehicleCondition.NEW
  )
  activity_status: Mapped[VehicleActivityStatus] = mapped_column(
    Enum(VehicleActivityStatus, name="vehicle_activity_status"),
    default=VehicleActivityStatus.ACTIVE,
  )
  is_registered: Mapped[bool] = mapped_column(Boolean, nullable=False)
  registry_expiration: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
  created_on: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
  updated_on: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), onupdate=func.now())

  # Relationships
  owner: Mapped["User"] = relationship(back_populates="vehicle")
  geofence_events: Mapped[list["GeofenceEvent"]] = relationship(back_populates="vehicle")
  dispatch_logs: Mapped[list["DispatchLog"]] = relationship(back_populates="vehicle")