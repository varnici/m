from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    BigInteger, Boolean, CheckConstraint, DateTime, ForeignKey, String, Text, event,
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


# Real deploys get this data from Alembic's op.bulk_insert in
# 0008_double_entry_ledger.py / 0019_loan_ledger_accounts.py. But
# Base.metadata.create_all() — the dev-convenience fallback in init_db(), and
# what every ad-hoc test fixture in this codebase uses to stand up a fresh
# SQLite DB — creates the table structure without ever running that seed, so
# LedgerService.record_transaction fails with "Unknown account codes" the
# first time anything posts to the ledger outside a fully-migrated Postgres
# instance. This event fires right after CREATE TABLE for chart_of_accounts
# under create_all() specifically (Alembic's op.create_table builds its own
# ad-hoc Table object, so this listener — bound to the ORM-mapped Table — never
# double-fires there) and keeps both paths seeded with the same accounts.
_SEED_ACCOUNTS = [
    ("1000", "Platform Cash Pool", "asset", None, True, "Master cash asset pool"),
    ("1100", "Escrow Holding", "asset", None, True, "Funds held in escrow during order fulfillment"),
    ("1200", "User Wallets Receivable", "asset", None, True, "Outstanding receivables from user wallets"),
    ("1300", "Loans Receivable", "asset", None, True, "Outstanding principal on disbursed business loans"),
    ("2000", "User Wallet Liabilities", "liability", None, True, "Deposits owed back to users"),
    ("2100", "Distributor Accounts Payable", "liability", None, True, "Wholesale payouts due to distributors"),
    ("2200", "Logistics Fees Payable", "liability", None, True, "Fulfillment fees due to logistics partners"),
    ("2300", "Investor Escrow Payable", "liability", None, True, "Escrow funds owed to 9-5 worker investors"),
    ("3000", "Default Reserve Pool", "equity", None, True, "Platform reserve equity buffer"),
    ("4000", "Platform Commission Revenue", "revenue", None, True, "Revenue from platform spread/commission"),
    ("4100", "Investment Management Fee", "revenue", None, True, "Fees from investment management"),
    ("4200", "Loan Interest Income", "revenue", None, True, "Interest collected on repaid business loans"),
    ("5000", "Payment Processing Costs", "expense", None, True, "Third-party payment gateway fees"),
]


@event.listens_for(ChartOfAccount.__table__, "after_create")
def _seed_chart_of_accounts(target, connection, **kw):
    connection.execute(
        target.insert(),
        [
            {
                "code": code, "name": name, "account_type": atype,
                "parent_code": parent, "is_system": is_sys, "description": desc,
            }
            for code, name, atype, parent, is_sys, desc in _SEED_ACCOUNTS
        ],
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
