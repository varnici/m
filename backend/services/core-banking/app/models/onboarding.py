from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.infrastructure.database import Base


def _id() -> str:
    return str(uuid.uuid4())


class OnboardingProfile(Base):
    """Tracks onboarding step progression for any user type."""
    __tablename__ = "onboarding_profiles"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_id)
    user_id: Mapped[str] = mapped_column(
        String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True,
    )
    account_type: Mapped[str] = mapped_column(String(30), nullable=False)
    current_step: Mapped[str] = mapped_column(String(40), nullable=False, default="basic_info")
    steps_completed: Mapped[str] = mapped_column(Text, nullable=False, default="")
    is_complete: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )


class MerchantProfile(Base):
    """Extended profile for merchant/SME users."""
    __tablename__ = "merchant_profiles"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_id)
    user_id: Mapped[str] = mapped_column(
        String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True,
    )
    business_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    market_association_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    cac_number: Mapped[str | None] = mapped_column(String(30), nullable=True)
    gps_lat: Mapped[float | None] = mapped_column(Float, nullable=True)
    gps_lng: Mapped[float | None] = mapped_column(Float, nullable=True)
    pos_terminal_id: Mapped[str | None] = mapped_column(String(60), nullable=True)
    store_front_photo_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    face_id_photo_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    inventory_category: Mapped[str | None] = mapped_column(String(60), nullable=True)
    daily_turnover_estimate_kobo: Mapped[int | None] = mapped_column(Integer, nullable=True)
    gps_verified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    pos_verified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    verified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    kyc_confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    kyc_result_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    kyc_verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )


class DistributorProfile(Base):
    """Extended profile for wholesale distributor users."""
    __tablename__ = "distributor_profiles"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_id)
    user_id: Mapped[str] = mapped_column(
        String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True,
    )
    company_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    cac_reg_number: Mapped[str | None] = mapped_column(String(30), nullable=True)
    tin: Mapped[str | None] = mapped_column(String(20), nullable=True)
    cac_verified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    warehouse_address: Mapped[str | None] = mapped_column(Text, nullable=True)
    warehouse_lat: Mapped[float | None] = mapped_column(Float, nullable=True)
    warehouse_lng: Mapped[float | None] = mapped_column(Float, nullable=True)
    product_categories: Mapped[str | None] = mapped_column(Text, nullable=True)
    min_order_value_kobo: Mapped[int | None] = mapped_column(Integer, nullable=True)
    bank_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    account_number: Mapped[str | None] = mapped_column(String(20), nullable=True)
    verified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    verification_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )


class LogisticsPartnerProfile(Base):
    """Extended profile for logistics/transportation partner users."""
    __tablename__ = "logistics_partner_profiles"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_id)
    user_id: Mapped[str] = mapped_column(
        String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True,
    )
    company_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    fleet_size: Mapped[int | None] = mapped_column(Integer, nullable=True)
    vehicle_registration_numbers: Mapped[str | None] = mapped_column(Text, nullable=True)
    driver_license_number: Mapped[str | None] = mapped_column(String(30), nullable=True)
    insurance_provider: Mapped[str | None] = mapped_column(String(100), nullable=True)
    insurance_policy_number: Mapped[str | None] = mapped_column(String(60), nullable=True)
    insurance_verified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    vehicle_docs_verified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    operating_regions: Mapped[str | None] = mapped_column(Text, nullable=True)
    verified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
