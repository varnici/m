from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.infrastructure.database import Base


def _id() -> str:
    return str(uuid.uuid4())


class DriverProfile(Base):
    __tablename__ = "driver_profiles"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_id)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)

    full_name: Mapped[str] = mapped_column(String, nullable=False)
    phone: Mapped[str] = mapped_column(String, nullable=False)
    vehicle_type: Mapped[str] = mapped_column(String, nullable=False)  # motorcycle | car | bus | truck
    vehicle_plate: Mapped[str] = mapped_column(String, nullable=False)

    # Stored as JSON string for MVP simplicity
    certifications_json: Mapped[str] = mapped_column(String, nullable=False, default="[]")

    nin_verified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    vehicle_docs_verified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_online: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    current_lat: Mapped[float | None] = mapped_column(Float, nullable=True)
    current_lng: Mapped[float | None] = mapped_column(Float, nullable=True)
    rating: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    total_jobs: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

    user = relationship("User")


class TransportBooking(Base):
    __tablename__ = "transport_bookings"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_id)
    client_user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    driver_user_id: Mapped[str | None] = mapped_column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)

    vehicle_type: Mapped[str] = mapped_column(String, nullable=False)  # motorcycle | car | bus | truck
    status: Mapped[str] = mapped_column(String, nullable=False, default="pending")  # pending/matched/in_transit/completed/cancelled

    pickup_address: Mapped[str] = mapped_column(String, nullable=False)
    pickup_lat: Mapped[float] = mapped_column(Float, nullable=False)
    pickup_lng: Mapped[float] = mapped_column(Float, nullable=False)
    delivery_address: Mapped[str] = mapped_column(String, nullable=False)
    delivery_lat: Mapped[float] = mapped_column(Float, nullable=False)
    delivery_lng: Mapped[float] = mapped_column(Float, nullable=False)

    item_description: Mapped[str] = mapped_column(String, nullable=False)
    item_weight_kg: Mapped[float] = mapped_column(Float, nullable=False)
    declared_goods_value_kobo: Mapped[int] = mapped_column(Integer, nullable=False)
    delivery_fee_kobo: Mapped[int] = mapped_column(Integer, nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)


class BookingTrackingPoint(Base):
    __tablename__ = "booking_tracking_points"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_id)
    booking_id: Mapped[str] = mapped_column(String, ForeignKey("transport_bookings.id", ondelete="CASCADE"), nullable=False, index=True)
    driver_user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    lat: Mapped[float] = mapped_column(Float, nullable=False)
    lng: Mapped[float] = mapped_column(Float, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

