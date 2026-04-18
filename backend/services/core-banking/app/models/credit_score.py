from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.infrastructure.database import Base


def _id() -> str:
    return str(uuid.uuid4())


class CreditScore(Base):
    __tablename__ = "credit_scores"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_id)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    score: Mapped[int] = mapped_column(Integer, nullable=False)  # 0-1000
    risk_level: Mapped[str] = mapped_column(String, nullable=False)  # low, medium, high
    factors: Mapped[list] = mapped_column(JSON, nullable=False)  # list of factors
    calculated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)  # calculated_at + 30 days

    user = relationship("User", back_populates="credit_scores")