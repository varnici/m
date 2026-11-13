from __future__ import annotations

import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    DateTime,
    Integer,
    JSON,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.infrastructure.database import Base


def _id() -> str:
    return str(uuid.uuid4())


class BusinessStarterKit(Base):
    """A curated, admin-defined bundle of items needed to open a specific
    small business (e.g. a provision store), with an all-in cost — the
    "idea" a nine_to_five worker commits to saving toward. Kits are seeded
    by migration for now; there's no admin CRUD UI yet, same as
    business_clusters.
    """

    __tablename__ = "business_starter_kits"
    __table_args__ = (
        CheckConstraint("total_cost_kobo > 0", name="ck_business_starter_kits_cost_positive"),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_id)
    slug: Mapped[str] = mapped_column(String, unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    business_category: Mapped[str] = mapped_column(String, nullable=False)
    icon_name: Mapped[str] = mapped_column(String, default="Store")

    total_cost_kobo: Mapped[int] = mapped_column(BigInteger, nullable=False)
    suggested_duration_months: Mapped[int] = mapped_column(Integer, nullable=False, default=6)

    # List of {"name": str, "quantity": int, "estimated_cost_kobo": int}
    items: Mapped[list] = mapped_column(JSON, nullable=False, default=list)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    display_order: Mapped[int] = mapped_column(Integer, default=0)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
