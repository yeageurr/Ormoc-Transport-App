from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Numeric, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class DriverLocation(Base):
  """Latest foreground GPS fix for a driver and their assigned vehicle."""
  __tablename__ = "driver_locations"

  driver_id: Mapped[int] = mapped_column(ForeignKey("users.user_id"), primary_key=True)
  vehicle_id: Mapped[int] = mapped_column(ForeignKey("vehicles.vehicle_id"), nullable=False)
  dispatch_id: Mapped[int | None] = mapped_column(ForeignKey("dispatch_logs.dispatch_id"))
  latitude: Mapped[float] = mapped_column(Numeric(9, 6), nullable=False)
  longitude: Mapped[float] = mapped_column(Numeric(9, 6), nullable=False)
  speed_kmh: Mapped[float] = mapped_column(Numeric(6, 2), nullable=False, default=0)
  recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())
