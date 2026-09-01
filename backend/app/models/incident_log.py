from datetime import datetime
from sqlalchemy import Text, DateTime, Numeric, Enum, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import TYPE_CHECKING

from app.database import Base
from app.enums import IncidentType, IncidentStatus

if TYPE_CHECKING:
  from app.models.trip import Trip
  from app.models.user import User
  from app.models.account import Account


class Incident(Base):
  __tablename__ = "incidents"

  incident_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
  trip_id: Mapped[int] = mapped_column(ForeignKey("trips.trip_id"), nullable=False)
  reported_by: Mapped[int] = mapped_column(ForeignKey("users.user_id"), nullable=False)
  incident_type: Mapped[IncidentType] = mapped_column(Enum(IncidentType, name="incident_type"), nullable=False)
  description: Mapped[str | None] = mapped_column(Text)
  latitude: Mapped[float] = mapped_column(Numeric(9, 6), nullable=False)
  longitude: Mapped[float] = mapped_column(Numeric(9, 6), nullable=False)
  status: Mapped[IncidentStatus] = mapped_column(
    Enum(IncidentStatus, name="incident_status"), nullable=False, default=IncidentStatus.OPEN
  )
  reported_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())


  resolved_by: Mapped[int | None] = mapped_column(ForeignKey("accounts.account_id"))
  resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
  updated_by: Mapped[int | None] = mapped_column(ForeignKey("accounts.account_id"))
  updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), onupdate=func.now())


  trip: Mapped["Trip"] = relationship(back_populates="incidents")
  reported_by_user: Mapped["User"] = relationship(foreign_keys=[reported_by])
  resolved_by_user: Mapped["User"] = relationship(foreign_keys=[resolved_by], back_populates="incidents_resolved")
  updated_by_account: Mapped["Account"] = relationship(foreign_keys=[updated_by], back_populates="incidents_updated")