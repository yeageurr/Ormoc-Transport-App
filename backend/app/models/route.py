from sqlalchemy import JSON, Numeric, ForeignKey, Boolean, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import TYPE_CHECKING

from app.database import Base

if TYPE_CHECKING:
  from app.models.terminal import Terminal
  from app.models.destinations import Destination
  from app.models.dispatch_log import DispatchLog
  from app.models.notification import BroadcastNotification
  from app.models.queue_reservation import QueueReservation


class Route(Base):
  __tablename__ = "routes"
  __table_args__ = (
    UniqueConstraint("queue_prefix", name="uq_routes_queue_prefix"),
  )

  route_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
  queue_prefix: Mapped[str] = mapped_column(String(8), nullable=False)
  origin_id: Mapped[int] = mapped_column(ForeignKey("terminals.terminal_id"), nullable=False)
  destination_id: Mapped[int] = mapped_column(ForeignKey("destinations.destination_id"), nullable=False)
  distance: Mapped[float] = mapped_column(Numeric(6, 2), nullable=False)
  average_travel_duration: Mapped[float | None] = mapped_column(Numeric(6, 2))
  route_geometry: Mapped[dict | None] = mapped_column(JSON, nullable=True)
  is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="true")


  origin: Mapped["Terminal"] = relationship(back_populates="routes")
  destination: Mapped["Destination"] = relationship(back_populates="routes")
  dispatch_logs: Mapped[list["DispatchLog"]] = relationship(back_populates="route")
  broadcast_notifications: Mapped[list["BroadcastNotification"]] = relationship(back_populates="route")
  queue_reservations: Mapped[list["QueueReservation"]] = relationship(back_populates="route")
