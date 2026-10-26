from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import TYPE_CHECKING

from app.database import Base

if TYPE_CHECKING:
  from app.models.account import Account
  from app.models.vehicle import Vehicle
  from app.models.dispatch_log import DispatchLog
  from app.models.incident_log import Incident
  from app.models.trip import Trip
  from app.models.queue_reservation import QueueReservation


class User(Base):
  __tablename__ = "users"

  user_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
  # Public identifier shown to drivers.  This is deliberately separate from
  # the internal numeric user_id used by foreign keys throughout the system.
  driver_id: Mapped[str] = mapped_column(String(10), unique=True, nullable=False)
  account_id: Mapped[int] = mapped_column(
    ForeignKey("accounts.account_id"), unique=True, nullable=False
  )
  first_name: Mapped[str] = mapped_column(String(50), nullable=False)
  last_name: Mapped[str] = mapped_column(String(50), nullable=False)
  contact_number: Mapped[str] = mapped_column(String(11), unique=True, nullable=False)
  email: Mapped[str | None] = mapped_column(String(255), unique=True)
  license_num: Mapped[str] = mapped_column(String(13), unique=True, nullable=False)
  license_expiry: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

  # Relationships
  account: Mapped["Account"] = relationship(back_populates="user")
  vehicle: Mapped["Vehicle"] = relationship(
    back_populates="owner", foreign_keys="Vehicle.owner_id", uselist=False
  )
  borrowed_vehicle: Mapped["Vehicle | None"] = relationship(
    back_populates="borrower", foreign_keys="Vehicle.borrower_id", uselist=False
  )
  dispatch_logs: Mapped[list["DispatchLog"]] = relationship(back_populates="driver")
  incidents: Mapped[list["Incident"]] = relationship(back_populates="reported_by_user")
  direct_trips: Mapped[list["Trip"]] = relationship(back_populates="driver", foreign_keys="Trip.driver_id")
  queue_reservations: Mapped[list["QueueReservation"]] = relationship(back_populates="driver")

  @property
  def active_vehicle(self):
    """Return this driver's current vehicle, respecting any active borrower."""
    if self.borrowed_vehicle is not None:
      return self.borrowed_vehicle
    if self.vehicle is not None and self.vehicle.borrower_id is None:
      return self.vehicle
    return None
