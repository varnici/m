from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.infrastructure.database import Base


def _id() -> str:
    return str(uuid.uuid4())


class Product(Base):
    """
    A product a business owner can list in the marketplace.
    """

    __tablename__ = "products"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_id)
    owner_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False)

    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str | None] = mapped_column(String, nullable=True)
    sku: Mapped[str | None] = mapped_column(String, nullable=True)
    category: Mapped[str | None] = mapped_column(String, nullable=True)

    # Base price per unit in kobo (Naira * 100)
    unit_price_kobo: Mapped[int] = mapped_column(Integer, nullable=False)

    # Simple geo fields (estate / area + optional lat/lng)
    estate: Mapped[str | None] = mapped_column(String, nullable=True)
    city: Mapped[str | None] = mapped_column(String, nullable=True)
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)

    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

    owner = relationship("User")


class Listing(Base):
    """
    A concrete listing of a product in the public / in-app marketplace.
    """

    __tablename__ = "listings"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_id)
    product_id: Mapped[str] = mapped_column(String, ForeignKey("products.id"), nullable=False)

    # Optional override of price/quantity for this listing
    price_kobo: Mapped[int] = mapped_column(Integer, nullable=False)
    available_quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # public slug for Virtual Shopfront URLs
    slug: Mapped[str] = mapped_column(String, unique=True, nullable=False)

    # simple visibility + soft-delete
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

    product = relationship("Product")

