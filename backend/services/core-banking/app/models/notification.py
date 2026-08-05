from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, String, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.infrastructure.database import Base


def _id() -> str:
    return str(uuid.uuid4())


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_id)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # loan_status | payment_due | credit_limit | system | order_request | fund_transfer | payment_receipt
    type: Mapped[str] = mapped_column(String, nullable=False)
    title: Mapped[str] = mapped_column(String, nullable=False)
    message: Mapped[str] = mapped_column(String, nullable=False)
    read: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    # Deep-link target, e.g. related_entity_type="trade_order", related_entity_id=<TradeOrder.id>
    related_entity_type: Mapped[str | None] = mapped_column(String, nullable=True)
    related_entity_id: Mapped[str | None] = mapped_column(String, nullable=True)
    # Structured payload for rich notifications, e.g. order line items for
    # "detailed notification of all the needed items" (order_request type).
    notification_metadata: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="notifications")


class DeviceToken(Base):
    """
    Push-token registration scaffolding — stores Expo push tokens so remote
    delivery can be switched on later without a schema change. Actually
    dispatching to APNs/FCM requires push credentials this repo doesn't have
    configured yet; until then, notifications are in-app only (see
    NotificationService).
    """
    __tablename__ = "device_tokens"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_id)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    push_token: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    platform: Mapped[str] = mapped_column(String, nullable=False)  # ios | android
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
