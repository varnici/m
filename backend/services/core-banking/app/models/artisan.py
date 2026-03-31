from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.infrastructure.database import Base


def _id() -> str:
    return str(uuid.uuid4())


class Artisan(Base):
    """
    Registered artisan / technical professional.
    """

    __tablename__ = "artisans"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_id)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False)

    trade_category: Mapped[str] = mapped_column(String, nullable=False)
    years_experience: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    service_area: Mapped[str | None] = mapped_column(String, nullable=True)

    estate: Mapped[str | None] = mapped_column(String, nullable=True)
    city: Mapped[str | None] = mapped_column(String, nullable=True)
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)

    # simple rating aggregate (0–5)
    rating: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    rating_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    status: Mapped[str] = mapped_column(String, nullable=False, default="provisional")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

    user = relationship("User")


class ArtisanBooking(Base):
    """
    A single service booking between a client and an artisan.
    """

    __tablename__ = "artisan_bookings"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_id)
    artisan_id: Mapped[str] = mapped_column(String, ForeignKey("artisans.id"), nullable=False)
    client_user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False)

    service_category: Mapped[str] = mapped_column(String, nullable=False)
    problem_description: Mapped[str] = mapped_column(String, nullable=False)
    address: Mapped[str] = mapped_column(String, nullable=False)
    scheduled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    status: Mapped[str] = mapped_column(String, nullable=False, default="pending")  # pending/accepted/completed/cancelled

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

    artisan = relationship("Artisan")


class ArtisanRating(Base):
    """
    Binary-question style rating mapped to an aggregate score.
    """

    __tablename__ = "artisan_ratings"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_id)
    booking_id: Mapped[str] = mapped_column(String, ForeignKey("artisan_bookings.id"), nullable=False, unique=True)

    goods_condition_ok: Mapped[bool] = mapped_column(default=True, nullable=False)
    on_time: Mapped[str] = mapped_column(String, nullable=False, default="yes")  # yes/partial/no
    communication_ok: Mapped[bool] = mapped_column(default=True, nullable=False)
    correct_address: Mapped[bool] = mapped_column(default=True, nullable=False)

    score: Mapped[float] = mapped_column(Float, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

