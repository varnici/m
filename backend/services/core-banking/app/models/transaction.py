from __future__ import annotations

import uuid
from datetime import datetime, timezone
from sqlalchemy import BigInteger, CheckConstraint, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.infrastructure.database import Base


def _id() -> str:
    return str(uuid.uuid4())


class Transaction(Base):
    __tablename__ = "transactions"
    __table_args__ = (
        CheckConstraint("amount_kobo >= 0", name="ck_transactions_amount_non_negative"),
        CheckConstraint("running_balance_kobo >= 0", name="ck_transactions_running_balance_non_negative"),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_id)
    wallet_id: Mapped[str] = mapped_column(
        String, ForeignKey("wallets.id", ondelete="CASCADE"), nullable=False, index=True
    )
    
    # sale_proceeds, repayment_sweep, transfer_out, topup, etc.
    type: Mapped[str] = mapped_column(String, nullable=False)
    amount_kobo: Mapped[int] = mapped_column(BigInteger, nullable=False)
    running_balance_kobo: Mapped[int] = mapped_column(BigInteger, nullable=False)
    description: Mapped[str | None] = mapped_column(String, nullable=True)
    reference_id: Mapped[str | None] = mapped_column(String, nullable=True, index=True)
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    wallet = relationship("Wallet", back_populates="transactions")
