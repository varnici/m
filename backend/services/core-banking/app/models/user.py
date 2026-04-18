from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, String, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.infrastructure.database import Base


def _id() -> str:
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_id)
    phone: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    email: Mapped[str | None] = mapped_column(String, unique=True, nullable=True)
    full_name: Mapped[str | None] = mapped_column(String, nullable=True)

    # personal | nine_to_five | business_owner
    category: Mapped[str] = mapped_column(String, nullable=False, default="personal")

    # Business profile fields
    business_name: Mapped[str | None] = mapped_column(String, nullable=True)
    trading_name: Mapped[str | None] = mapped_column(String, nullable=True)
    ownership_type: Mapped[str | None] = mapped_column(String, nullable=True)  # sole_proprietorship, partnership, corporation
    registration_status: Mapped[str | None] = mapped_column(String, nullable=True)  # registered, unregistered, pending
    location: Mapped[dict | None] = mapped_column(JSON, nullable=True)  # JSON for address details

    # bronze | silver | gold | platinum
    trust_level: Mapped[str] = mapped_column(String, nullable=False, default="bronze")

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

    wallet = relationship("Wallet", back_populates="user", uselist=False, cascade="all, delete-orphan")
    credit_scores = relationship("CreditScore", back_populates="user", cascade="all, delete-orphan")
    sales_metrics = relationship("SalesMetrics", back_populates="user", cascade="all, delete-orphan")
    inventory_metrics = relationship("InventoryMetrics", back_populates="user", cascade="all, delete-orphan")
    loan_metrics = relationship("LoanMetrics", back_populates="user", cascade="all, delete-orphan")
    loan_applications = relationship("LoanApplication", back_populates="user", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
    messages = relationship("Message", back_populates="user", cascade="all, delete-orphan")
    support_tickets = relationship("SupportTicket", back_populates="user", cascade="all, delete-orphan")

