from datetime import date, datetime

from sqlalchemy import CheckConstraint, Date, DateTime, ForeignKey, Index, Integer, String, UniqueConstraint, func, text
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
    Index(
      "uq_queue_reservations_one_active_per_driver",
      "driver_id",
      unique=True,
      postgresql_where=text("approval_status = 'pending' OR queue_status IN ('on_queue', 'loading')"),
      sqlite_where=text("approval_status = 'pending' OR queue_status IN ('on_queue', 'loading')"),
    ),
    UniqueConstraint(
      "route_id", "operating_date", "queue_number",
      name="uq_queue_reservations_route_date_number",
    ),
    CheckConstraint(
      "approval_status IN ('pending', 'approved', 'cancelled', 'expired')",
      name="ck_queue_reservations_approval_status",
    ),
    CheckConstraint(
      "queue_status IS NULL OR queue_status IN ('on_queue', 'loading', 'departed')",
      name="ck_queue_reservations_queue_status",
    ),
    CheckConstraint(
      "(approval_status = 'approved' AND queue_status IS NOT NULL) OR "
      "(approval_status <> 'approved' AND queue_status IS NULL)",
      name="ck_queue_reservations_approval_queue_status",
    ),
    CheckConstraint(
      "(queue_status IN ('on_queue', 'loading') AND queue_number IS NOT NULL) OR "
      "(queue_status IS NULL OR queue_status = 'departed') AND queue_number IS NULL",
      name="ck_queue_reservations_inactive_number_null",
    ),
    CheckConstraint(
      "queue_number IS NULL OR queue_number BETWEEN 1 AND 9999",
      name="ck_queue_reservations_queue_number_range",
    ),
    CheckConstraint(
      "(approval_status = 'approved' AND approved_by IS NOT NULL AND approved_at IS NOT NULL) OR "
      "(approval_status <> 'approved' AND approved_by IS NULL AND approved_at IS NULL)",
      name="ck_queue_reservations_approval_audit_pair",
    ),
    CheckConstraint(
      "(approval_status = 'cancelled' AND cancelled_at IS NOT NULL) OR "
      "(approval_status <> 'cancelled' AND cancelled_at IS NULL)",
      name="ck_queue_reservations_cancelled_timestamp",
    ),
    CheckConstraint(
      "(approval_status = 'expired' AND expired_at IS NOT NULL) OR "
      "(approval_status <> 'expired' AND expired_at IS NULL)",
      name="ck_queue_reservations_expired_timestamp",
    ),
  )

  id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
  driver_id: Mapped[int] = mapped_column(ForeignKey("users.user_id"), nullable=False)
  vehicle_id: Mapped[int] = mapped_column(ForeignKey("vehicles.vehicle_id"), nullable=False)
  route_id: Mapped[int] = mapped_column(ForeignKey("routes.route_id"), nullable=False)
  operating_date: Mapped[date] = mapped_column(Date, nullable=False)
  queue_number: Mapped[int | None] = mapped_column(Integer, nullable=True)
  approval_status: Mapped[str] = mapped_column(String(16), nullable=False, default="pending", server_default="pending")
  queue_status: Mapped[str | None] = mapped_column(String(16), nullable=True)
  reserved_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
  approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
  approved_by: Mapped[int | None] = mapped_column(ForeignKey("accounts.account_id"))
  loading_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
  departed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
  cancelled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
  expired_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
  # Dispatcher accounts are account-level identities, not driver user profiles.
  cancelled_by: Mapped[int | None] = mapped_column(ForeignKey("accounts.account_id"))

  driver: Mapped["User"] = relationship(back_populates="queue_reservations")
  vehicle: Mapped["Vehicle"] = relationship(back_populates="queue_reservations")
  route: Mapped["Route"] = relationship(back_populates="queue_reservations")
  ticket: Mapped["DispatchTicket | None"] = relationship(back_populates="reservation", uselist=False)
