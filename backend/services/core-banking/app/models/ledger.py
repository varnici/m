from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    BigInteger, Boolean, CheckConstraint, DateTime, ForeignKey, String, Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.infrastructure.database import Base


def _id() -> str:
    return str(uuid.uuid4())


class ChartOfAccount(Base):
    __tablename__ = "chart_of_accounts"

    code: Mapped[str] = mapped_column(String(10), primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    account_type: Mapped[str] = mapped_column(String(20), nullable=False)
    parent_code: Mapped[str | None] = mapped_column(
        String(10), ForeignKey("chart_of_accounts.code"), nullable=True,
    )
    is_system: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    __table_args__ = (
        CheckConstraint(
            "account_type IN ('asset', 'liability', 'equity', 'revenue', 'expense')",
            name="ck_coa_account_type",
        ),
    )


class LedgerTransaction(Base):
    __tablename__ = "ledger_transactions"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_id)
    reference_type: Mapped[str] = mapped_column(String(40), nullable=False)
    reference_id: Mapped[str | None] = mapped_column(String, nullable=True, index=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    idempotency_key: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    created_by: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    prev_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    tx_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    is_voided: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    entries: Mapped[list[LedgerEntry]] = relationship(
        "LedgerEntry", back_populates="transaction", cascade="all, delete-orphan",
    )


class LedgerEntry(Base):
    __tablename__ = "ledger_entries"
    __table_args__ = (
        CheckConstraint("debit_kobo >= 0", name="ck_le_debit_non_negative"),
        CheckConstraint("credit_kobo >= 0", name="ck_le_credit_non_negative"),
        CheckConstraint(
            "(debit_kobo > 0 AND credit_kobo = 0) OR (debit_kobo = 0 AND credit_kobo > 0)",
            name="ck_le_single_sided",
        ),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_id)
    transaction_id: Mapped[str] = mapped_column(
        String, ForeignKey("ledger_transactions.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    account_code: Mapped[str] = mapped_column(
        String(10), ForeignKey("chart_of_accounts.code"),
        nullable=False, index=True,
    )
    debit_kobo: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    credit_kobo: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    memo: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    transaction: Mapped[LedgerTransaction] = relationship(
        "LedgerTransaction", back_populates="entries",
    )
