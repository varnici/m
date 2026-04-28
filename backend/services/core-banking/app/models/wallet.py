from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import BigInteger, CheckConstraint, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.infrastructure.database import Base


def _id() -> str:
    return str(uuid.uuid4())


class Wallet(Base):
    __tablename__ = "wallets"
    __table_args__ = (
        CheckConstraint("balance_kobo >= 0", name="ck_wallets_balance_non_negative"),
        CheckConstraint("total_debt_kobo >= 0", name="ck_wallets_total_debt_non_negative"),
        CheckConstraint("credit_limit_kobo >= 0", name="ck_wallets_credit_limit_non_negative"),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_id)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)

    balance_kobo: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    credit_limit_kobo: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    available_credit_kobo: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    total_debt_kobo: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    next_repayment_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    repayment_amount_kobo: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    user = relationship("User", back_populates="wallet")
