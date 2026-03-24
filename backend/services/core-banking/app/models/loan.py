from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import BigInteger, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.infrastructure.database import Base


def _id() -> str:
    return str(uuid.uuid4())


class Loan(Base):
    __tablename__ = "loans"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_id)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # pending | active | closed | defaulted
    status: Mapped[str] = mapped_column(String, nullable=False, default="pending")

    principal_kobo: Mapped[int] = mapped_column(BigInteger, nullable=False)
    service_fee_kobo: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    total_due_kobo: Mapped[int] = mapped_column(BigInteger, nullable=False)
    repaid_kobo: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)

    product_sku: Mapped[str] = mapped_column(String, nullable=False)
    product_qty: Mapped[int] = mapped_column(Integer, nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

