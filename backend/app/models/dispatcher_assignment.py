from datetime import date, datetime

from sqlalchemy import Boolean, CheckConstraint, Date, DateTime, ForeignKey, Index, func, text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class DispatcherAssignment(Base):
  __tablename__ = "dispatcher_assignments"
  __table_args__ = (
    Index(
      "uq_dispatcher_assignments_open_route_day",
      "operating_date",
      "route_id",
      unique=True,
      postgresql_where=text("closed_at IS NULL"),
      sqlite_where=text("closed_at IS NULL"),
    ),
    Index(
      "uq_dispatcher_assignments_open_dispatcher_day",
      "operating_date",
      "dispatcher_id",
      unique=True,
      postgresql_where=text("closed_at IS NULL"),
      sqlite_where=text("closed_at IS NULL"),
    ),
    Index(
      "ix_dispatcher_assignments_due_for_autoclose",
      "created_at",
      postgresql_where=text("closed_at IS NULL"),
      sqlite_where=text("closed_at IS NULL"),
    ),
    CheckConstraint(
      "(closed_at IS NULL AND auto_closed = false AND closed_by IS NULL) OR "
      "(closed_at IS NOT NULL AND ((auto_closed = true AND closed_by IS NULL) OR "
      "(auto_closed = false AND closed_by IS NOT NULL)))",
      name="ck_dispatcher_assignments_closure_metadata",
    ),
  )

  id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
  operating_date: Mapped[date] = mapped_column(Date, nullable=False)
  route_id: Mapped[int] = mapped_column(ForeignKey("routes.route_id"), nullable=False)
  # Dispatcher and assigning officer are account roles, so these reference accounts.
  dispatcher_id: Mapped[int] = mapped_column(ForeignKey("accounts.account_id"), nullable=False)
  assigned_by: Mapped[int] = mapped_column(ForeignKey("accounts.account_id"), nullable=False)
  created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
  closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
  closed_by: Mapped[int | None] = mapped_column(ForeignKey("accounts.account_id"))
  auto_closed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
