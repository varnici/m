from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, JSON
from sqlalchemy.orm import Mapped, mapped_column

from app.infrastructure.database import Base


def _id() -> str:
    return str(uuid.uuid4())


class VelocityScore(Base):
    __tablename__ = "velocity_scores"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_id)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    score: Mapped[float] = mapped_column(Float, nullable=False)
    units_per_day: Mapped[float] = mapped_column(Float, nullable=False)
    restock_consistency: Mapped[float] = mapped_column(Float, nullable=False)
    repayment_ratio: Mapped[float] = mapped_column(Float, nullable=False)
    credit_limit_kobo: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    breakdown: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    calculated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )
