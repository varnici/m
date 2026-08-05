from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, String, JSON
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

    # retail | nine_to_five | personal | distributor | manufactural | logistics | artisan
    category: Mapped[str] = mapped_column(String, nullable=False, default="personal")

    # Business profile fields
    business_name: Mapped[str | None] = mapped_column(String, nullable=True)
    trading_name: Mapped[str | None] = mapped_column(String, nullable=True)
    business_category: Mapped[str | None] = mapped_column(String, nullable=True)
    bank_name: Mapped[str | None] = mapped_column(String, nullable=True)
    account_number: Mapped[str | None] = mapped_column(String, nullable=True)
    tin: Mapped[str | None] = mapped_column(String, nullable=True)
    ownership_type: Mapped[str | None] = mapped_column(String, nullable=True)  # sole_proprietorship, partnership, corporation
    registration_status: Mapped[str | None] = mapped_column(String, nullable=True)  # registered, unregistered, pending
    location: Mapped[dict | None] = mapped_column(JSON, nullable=True)  # JSON for address details
    profile_image_url: Mapped[str | None] = mapped_column(String, nullable=True)
    settings: Mapped[dict | None] = mapped_column(JSON, nullable=True, default={})
    hashed_pin: Mapped[str | None] = mapped_column(String, nullable=True)
    hashed_pattern: Mapped[str | None] = mapped_column(String, nullable=True)
    security_type: Mapped[str] = mapped_column(String, nullable=False, default="pin") # pin | pattern

    # bronze | silver | gold | platinum
    trust_level: Mapped[str] = mapped_column(String, nullable=False, default="bronze")

    is_admin: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    wallet = relationship("Wallet", back_populates="user", uselist=False, cascade="all, delete-orphan")
    sales_metrics = relationship("SalesMetrics", back_populates="user", cascade="all, delete-orphan")
    inventory_metrics = relationship("InventoryMetrics", back_populates="user", cascade="all, delete-orphan")
    loan_metrics = relationship("LoanMetrics", back_populates="user", cascade="all, delete-orphan")
    loan_applications = relationship("LoanApplication", back_populates="user", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")

