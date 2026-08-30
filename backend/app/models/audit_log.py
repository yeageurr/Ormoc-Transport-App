from datetime import datetime
from sqlalchemy import String, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import TYPE_CHECKING

from app.database import Base

if TYPE_CHECKING:
  from app.models.account import Account


class AuditLog(Base):
  __tablename__ = "audit_logs"

  audit_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
  actor_id: Mapped[int] = mapped_column(ForeignKey("accounts.account_id"), nullable=False)
  target_table: Mapped[str] = mapped_column(String(50), nullable=False)
  target_id: Mapped[int] = mapped_column(nullable=False)
  details: Mapped[str] = mapped_column(Text, nullable=False)
  created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())


  actor: Mapped["Account"] = relationship(back_populates="audit_logs")