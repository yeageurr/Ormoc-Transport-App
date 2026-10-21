from datetime import date, datetime

from sqlalchemy import CheckConstraint, Date, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import TYPE_CHECKING

from app.database import Base

if TYPE_CHECKING:
  from app.models.user import User
  from app.models.vehicle import Vehicle
  from app.models.route import Route
  from app.models.dispatch_ticket import DispatchTicket


class QueueReservation(Base):
  __tablename__ = "queue_reservations"
  __table_args__ = (
    CheckConstraint(
      "status IN ('on_queue', 'loading', 'departed', 'cancelled')",
      name="ck_queue_reservations_status",
    ),
    CheckConstraint(
      "status IN ('on_queue', 'loading') OR queue_number IS NULL",
      name="ck_queue_reservations_inactive_number_null",
    ),
  )

  id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
  driver_id: Mapped[int] = mapped_column(ForeignKey("users.user_id"), nullable=False)
  vehicle_id: Mapped[int] = mapped_column(ForeignKey("vehicles.vehicle_id"), nullable=False)
  route_id: Mapped[int] = mapped_column(ForeignKey("routes.route_id"), nullable=False)
  operating_date: Mapped[date] = mapped_column(Date, nullable=False)
  queue_number: Mapped[int | None] = mapped_column(Integer, nullable=True)
  status: Mapped[str] = mapped_column(String(16), nullable=False, default="on_queue", server_default="on_queue")
  reserved_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
  loading_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
  departed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
  cancelled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
  # Dispatcher accounts are account-level identities, not driver user profiles.
  cancelled_by: Mapped[int | None] = mapped_column(ForeignKey("accounts.account_id"))

  driver: Mapped["User"] = relationship(back_populates="queue_reservations")
  vehicle: Mapped["Vehicle"] = relationship(back_populates="queue_reservations")
  route: Mapped["Route"] = relationship(back_populates="queue_reservations")
  ticket: Mapped["DispatchTicket | None"] = relationship(back_populates="reservation", uselist=False)
