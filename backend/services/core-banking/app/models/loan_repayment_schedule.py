from __future__ import annotations

import uuid
from datetime import date, datetime

from sqlalchemy import BigInteger, Date, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.infrastructure.database import Base


def _id() -> str:
    return str(uuid.uuid4())


class LoanRepaymentSchedule(Base):
    __tablename__ = "loan_repayment_schedules"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_id)
    loan_application_id: Mapped[str] = mapped_column(String, ForeignKey("loan_applications.id", ondelete="CASCADE"), nullable=False)

    installment_number: Mapped[int] = mapped_column(Integer, nullable=False)
    due_date: Mapped[date] = mapped_column(Date, nullable=False)
    amount_kobo: Mapped[int] = mapped_column(BigInteger, nullable=False)
    principal_kobo: Mapped[int] = mapped_column(BigInteger, nullable=False)
    interest_kobo: Mapped[int] = mapped_column(BigInteger, nullable=False)
    status: Mapped[str] = mapped_column(String, nullable=False, default="pending")  # pending, paid, overdue
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    loan_application = relationship("LoanApplication", back_populates="repayment_schedules")