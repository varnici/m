from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.infrastructure.database import Base


def _id() -> str:
    return str(uuid.uuid4())


from app.models.inventory import Product

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

