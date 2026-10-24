from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class DispatcherProfile(Base):
  __tablename__ = "dispatcher_profiles"

  dispatcher_profile_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
  account_id: Mapped[int] = mapped_column(ForeignKey("accounts.account_id", ondelete="CASCADE"), unique=True, nullable=False)
  first_name: Mapped[str] = mapped_column(String(50), nullable=False)
  last_name: Mapped[str] = mapped_column(String(50), nullable=False)
  contact_number: Mapped[str] = mapped_column(String(11), unique=True, nullable=False)

  account = relationship("Account")
