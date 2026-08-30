from sqlalchemy import Numeric, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import TYPE_CHECKING

from app.database import Base

if TYPE_CHECKING:
  from app.models.terminal import Terminal
  from app.models.destinations import Destination
  from app.models.dispatch_log import DispatchLog
  from app.models.notification import BroadcastNotification


class Route(Base):
  __tablename__ = "routes"

  route_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
  origin_id: Mapped[int] = mapped_column(ForeignKey("terminals.terminal_id"), nullable=False)
  destination_id: Mapped[int] = mapped_column(ForeignKey("destinations.destination_id"), nullable=False)
  distance: Mapped[float] = mapped_column(Numeric(6, 2), nullable=False)
  average_travel_duration: Mapped[float | None] = mapped_column(Numeric(6, 2))


  origin: Mapped["Terminal"] = relationship(back_populates="routes")
  destination: Mapped["Destination"] = relationship(back_populates="routes")
  dispatch_logs: Mapped[list["DispatchLog"]] = relationship(back_populates="route")
  broadcast_notifications: Mapped[list["BroadcastNotification"]] = relationship(back_populates="route")