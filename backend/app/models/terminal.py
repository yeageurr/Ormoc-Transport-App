from sqlalchemy import String, Text, Numeric, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import TYPE_CHECKING

from app.database import Base

if TYPE_CHECKING:
  from app.models.account import Account
  from app.models.geofence_event import GeofenceEvent
  from app.models.notification import BroadcastNotification
  from app.models.route import Route


class Terminal(Base):
  __tablename__ = "terminals"

  terminal_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
  admin_id: Mapped[int | None] = mapped_column(ForeignKey("accounts.account_id"), unique=True)
  terminal_name: Mapped[str] = mapped_column(String(50), nullable=False)
  min_latitude: Mapped[float] = mapped_column(Numeric(9, 6), nullable=False)
  min_longitude: Mapped[float] = mapped_column(Numeric(9, 6), nullable=False)
  max_latitude: Mapped[float] = mapped_column(Numeric(9, 6), nullable=False)
  max_longitude: Mapped[float] = mapped_column(Numeric(9, 6), nullable=False)
  address: Mapped[str] = mapped_column(Text, nullable=False, unique=True)

  # Relationships
  admin: Mapped["Account"] = relationship(back_populates="terminal")
  geofence_events: Mapped[list["GeofenceEvent"]] = relationship(back_populates="terminal")
  broadcast_notifications: Mapped[list["BroadcastNotification"]] = relationship(back_populates="terminal")
  routes: Mapped[list["Route"]] = relationship(back_populates="origin")