from datetime import date, datetime
from uuid import UUID, uuid4

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import TYPE_CHECKING

from app.database import Base

if TYPE_CHECKING:
  from app.models.queue_reservation import QueueReservation
  from app.models.trip import Trip


class DispatchTicket(Base):
  __tablename__ = "dispatch_tickets"

  id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
  reservation_id: Mapped[int] = mapped_column(
    ForeignKey("queue_reservations.id"), unique=True, nullable=False
  )
  driver_id: Mapped[int] = mapped_column(ForeignKey("users.user_id"), nullable=False)
  vehicle_id: Mapped[int] = mapped_column(ForeignKey("vehicles.vehicle_id"), nullable=False)
  route_id: Mapped[int] = mapped_column(ForeignKey("routes.route_id"), nullable=False)
  queue_number: Mapped[int] = mapped_column(Integer, nullable=False)
  operating_date: Mapped[date] = mapped_column(Date, nullable=False)
  issued_by: Mapped[int] = mapped_column(ForeignKey("accounts.account_id"), nullable=False)
  is_valid: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="true")
  used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
  created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

  reservation: Mapped["QueueReservation"] = relationship(back_populates="ticket")
  trip: Mapped["Trip | None"] = relationship(back_populates="dispatch_ticket", uselist=False)
