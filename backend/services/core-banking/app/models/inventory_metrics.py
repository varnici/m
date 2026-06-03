from __future__ import annotations

import uuid
from datetime import date, datetime

from sqlalchemy import BigInteger, Date, DateTime, Float, ForeignKey, Integer, String, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.infrastructure.database import Base


def _id() -> str:
    return str(uuid.uuid4())


class InventoryMetrics(Base):
    __tablename__ = "inventory_metrics"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_id)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    date: Mapped[date] = mapped_column(Date, nullable=False)
    total_inventory_value_kobo: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    low_stock_items: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    out_of_stock_items: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    inventory_turnover_ratio: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    top_selling_items: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

    user = relationship("User", back_populates="inventory_metrics")