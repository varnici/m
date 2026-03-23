from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import BigInteger, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.infrastructure.database import Base


def _id() -> str:
    return str(uuid.uuid4())


class Repayment(Base):
    __tablename__ = "repayments"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_id)
    loan_id: Mapped[str] = mapped_column(String, ForeignKey("loans.id", ondelete="CASCADE"), nullable=False, index=True)
    amount_kobo: Mapped[int] = mapped_column(BigInteger, nullable=False)
    paid_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

