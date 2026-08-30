from sqlalchemy import String, Text, Numeric
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import TYPE_CHECKING

from app.database import Base

if TYPE_CHECKING:
  from app.models.route import Route


class Destination(Base):
  __tablename__ = "destinations"

  destination_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
  name: Mapped[str] = mapped_column(String(50), nullable=False)
  latitude: Mapped[float] = mapped_column(Numeric(9, 6), nullable=False)
  longitude: Mapped[float] = mapped_column(Numeric(9, 6), nullable=False)
  address: Mapped[str] = mapped_column(Text, nullable=False, unique=True)

  # Relationships
  routes: Mapped[list["Route"]] = relationship(back_populates="destination")