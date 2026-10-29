from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class PasswordResetOtp(Base):
  __tablename__ = "password_reset_otps"
  __table_args__ = (
    CheckConstraint(
      "(target_email IS NOT NULL AND target_phone IS NULL) OR "
      "(target_email IS NULL AND target_phone IS NOT NULL)",
      name="ck_password_reset_otp_single_destination",
    ),
  )

  reset_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
  account_id: Mapped[int] = mapped_column(
    ForeignKey("accounts.account_id", ondelete="CASCADE"), unique=True, nullable=False
  )
  target_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
  target_phone: Mapped[str | None] = mapped_column(String(11), nullable=True)
  code_salt: Mapped[str] = mapped_column(String(32), nullable=False)
  code_hash: Mapped[str] = mapped_column(String(64), nullable=False)
  expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
  attempts: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
  send_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
  last_sent_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
  cooldown_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
  reset_token_hash: Mapped[str | None] = mapped_column(String(64))
  reset_token_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
