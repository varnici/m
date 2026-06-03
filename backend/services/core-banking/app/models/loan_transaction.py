from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import BigInteger, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.infrastructure.database import Base


def _id() -> str:
    return str(uuid.uuid4())


class LoanTransaction(Base):
    __tablename__ = "loan_transactions"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_id)
    loan_application_id: Mapped[str] = mapped_column(String, ForeignKey("loan_applications.id", ondelete="CASCADE"), nullable=False)

    type: Mapped[str] = mapped_column(String, nullable=False)  # disbursement, repayment, fee
    amount_kobo: Mapped[int] = mapped_column(BigInteger, nullable=False)
    transaction_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    description: Mapped[str] = mapped_column(String, nullable=False)

    loan_application = relationship("LoanApplication", back_populates="transactions")