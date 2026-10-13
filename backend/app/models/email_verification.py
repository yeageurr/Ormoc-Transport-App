from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class EmailVerification(Base):
  __tablename__ = "email_verifications"

  verification_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
  account_id: Mapped[int] = mapped_column(
    ForeignKey("accounts.account_id", ondelete="CASCADE"), unique=True, nullable=False
  )
  pending_email: Mapped[str] = mapped_column(String(255), nullable=False)
  code_salt: Mapped[str] = mapped_column(String(32), nullable=False)
  code_hash: Mapped[str] = mapped_column(String(64), nullable=False)
  expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
  attempts: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
  last_sent_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
