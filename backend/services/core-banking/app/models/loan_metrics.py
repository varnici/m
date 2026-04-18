from __future__ import annotations

import uuid
from datetime import date, datetime

from sqlalchemy import BigInteger, Date, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.infrastructure.database import Base


def _id() -> str:
    return str(uuid.uuid4())


class LoanMetrics(Base):
    __tablename__ = "loan_metrics"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_id)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    date: Mapped[date] = mapped_column(Date, nullable=False)
    active_loans_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    total_loan_amount_kobo: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    total_outstanding_kobo: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    repayment_rate: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    default_rate: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

    user = relationship("User", back_populates="loan_metrics")