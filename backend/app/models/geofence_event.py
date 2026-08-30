from datetime import datetime
from sqlalchemy import DateTime, Enum, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import TYPE_CHECKING

from app.database import Base
from app.enums import GeofenceEventType

if TYPE_CHECKING:
  from app.models.terminal import Terminal
  from app.models.vehicle import Vehicle


class GeofenceEvent(Base):
  __tablename__ = "geofence_events"

  event_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
  terminal_id: Mapped[int] = mapped_column(ForeignKey("terminals.terminal_id"), nullable=False)
  vehicle_id: Mapped[int] = mapped_column(ForeignKey("vehicles.vehicle_id"), nullable=False)
  event_type: Mapped[GeofenceEventType] = mapped_column(
    Enum(GeofenceEventType, name="geofence_event_type"), nullable=False, default=GeofenceEventType.ENTER
  )
  event_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())


  terminal: Mapped["Terminal"] = relationship(back_populates="geofence_events")
  vehicle: Mapped["Vehicle"] = relationship(back_populates="geofence_events")