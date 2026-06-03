from __future__ import annotations

import uuid
from datetime import date, datetime, timezone
from enum import Enum as PyEnum
from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    Enum,
    JSON,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.infrastructure.database import Base


def _id() -> str:
    return str(uuid.uuid4())


class SavingsGoalStatus(PyEnum):
    ACTIVE = "active"
    COMPLETED = "completed"
    PAUSED = "paused"
    CANCELLED = "cancelled"


class SavingsTransactionType(PyEnum):
    DEPOSIT = "deposit"
    WITHDRAWAL = "withdrawal"
    INTEREST = "interest"
    FEE_REBATE = "fee_rebate"
    ADJUSTMENT = "adjustment"


class SavingsTransactionStatus(PyEnum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    REVERSED = "reversed"


class SavingsGoal(Base):
    __tablename__ = "savings_goals"
    __table_args__ = (
        CheckConstraint("target_amount_kobo > 0", name="ck_savings_goals_target_amount_positive"),
        CheckConstraint("current_total_kobo >= 0", name="ck_savings_goals_current_total_non_negative"),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_id)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    category: Mapped[str] = mapped_column(String, default="General", nullable=False)
    target_amount_kobo: Mapped[int] = mapped_column(BigInteger, nullable=False)
    current_total_kobo: Mapped[int] = mapped_column(BigInteger, default=0)
    currency: Mapped[str] = mapped_column(String, default="NGN")
    status: Mapped[str] = mapped_column(String, default="active")
    
    is_auto_save_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    auto_save_amount_kobo: Mapped[int | None] = mapped_column(BigInteger, default=0)
    auto_save_frequency: Mapped[str | None] = mapped_column(String, nullable=True) # daily, weekly, monthly
    
    target_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    image_url: Mapped[str | None] = mapped_column(String, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    user = relationship("User")
    transactions = relationship("SavingsTransaction", back_populates="goal", cascade="all, delete-orphan")


class SavingsTransaction(Base):
    __tablename__ = "savings_transactions"
    __table_args__ = (
        CheckConstraint("amount_kobo <> 0", name="ck_savings_transactions_amount_non_zero"),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_id)
    goal_id: Mapped[str] = mapped_column(String, ForeignKey("savings_goals.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    amount_kobo: Mapped[int] = mapped_column(BigInteger, nullable=False)
    transaction_type: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[str] = mapped_column(String, default="pending")
    
    management_fee_kobo: Mapped[int] = mapped_column(BigInteger, default=0)
    partner_commission_kobo: Mapped[int] = mapped_column(BigInteger, default=0)
    
    reference: Mapped[str | None] = mapped_column(String, unique=True, nullable=True)
    source: Mapped[str | None] = mapped_column(String, default="manual") # manual, auto_sweep, sales_hook
    transaction_metadata: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    goal = relationship("SavingsGoal", back_populates="transactions")
    user = relationship("User")


class SavingsStreak(Base):
    __tablename__ = "savings_streaks"

    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    last_deposit_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    streak_count: Mapped[int] = mapped_column(Integer, default=0)
    longest_streak: Mapped[int] = mapped_column(Integer, default=0)
    total_savings_count: Mapped[int] = mapped_column(Integer, default=0)
    last_streak_update: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    user = relationship("User")
