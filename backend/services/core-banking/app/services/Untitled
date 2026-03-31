"""
Trust Score Model
Caches computed trust scores per user so the endpoint is fast on repeat calls.
Re-computed automatically whenever the service detects stale data (>1 hour old).
"""

from datetime import datetime
from sqlalchemy import Column, String, Float, Integer, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid

from app.infrastructure.database import Base


class TrustScore(Base):
    __tablename__ = "trust_scores"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, unique=True, index=True)

    # Composite score (0–100)
    total_score = Column(Float, nullable=False, default=0.0)

    # Component sub-scores (each 0–100, weighted in service layer)
    sales_velocity_score = Column(Float, nullable=False, default=0.0)
    repayment_history_score = Column(Float, nullable=False, default=0.0)
    savings_behavior_score = Column(Float, nullable=False, default=0.0)
    pool_participation_score = Column(Float, nullable=False, default=0.0)

    # Tier: "Emerging" | "Trusted" | "Established" | "Elite"
    tier = Column(String(32), nullable=False, default="Emerging")

    # Snapshot metadata
    total_sales_recorded = Column(Integer, default=0)
    total_loans_repaid = Column(Integer, default=0)
    active_savings_goals = Column(Integer, default=0)
    pool_contributions_count = Column(Integer, default=0)

    # AI-generated plain-language insight for the frontend
    insight = Column(Text, nullable=True)

    computed_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="trust_score")