from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import BigInteger, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.infrastructure.database import Base


def _id() -> str:
    return str(uuid.uuid4())


class LoanApplication(Base):
    __tablename__ = "loan_applications"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_id)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    amount_kobo: Mapped[int] = mapped_column(BigInteger, nullable=False)
    purpose: Mapped[str] = mapped_column(String, nullable=False)
    term_months: Mapped[int] = mapped_column(Integer, nullable=False)
    interest_rate: Mapped[float] = mapped_column(Float, nullable=False)
    status: Mapped[str] = mapped_column(String, nullable=False, default="pending")  # pending, approved, rejected, disbursed
    applied_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    disbursed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    rejection_reason: Mapped[str | None] = mapped_column(String, nullable=True)

    user = relationship("User", back_populates="loan_applications")
    repayment_schedules = relationship("LoanRepaymentSchedule", back_populates="loan_application", cascade="all, delete-orphan")
    transactions = relationship("LoanTransaction", back_populates="loan_application", cascade="all, delete-orphan")