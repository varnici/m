from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import DateTime, Integer, String, Text, UniqueConstraint, JSON
from sqlalchemy.orm import Mapped, mapped_column

from app.infrastructure.database import Base


def _id() -> str:
    return str(uuid.uuid4())


class InventoryLedgerEntryModel(Base):
    __tablename__ = "inventory_ledger_entries"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_id)
    owner_id: Mapped[str] = mapped_column(String, nullable=False, index=True)
    command_id: Mapped[str] = mapped_column(String, nullable=False, index=True)
    idempotency_key: Mapped[str] = mapped_column(String, nullable=False, index=True)
    product_id: Mapped[str] = mapped_column(String, nullable=False, index=True)
    store_id: Mapped[str] = mapped_column(String, nullable=False, index=True)
    quantity_delta: Mapped[int] = mapped_column(Integer, nullable=False)
    movement_type: Mapped[str] = mapped_column(String, nullable=False)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    reason_code: Mapped[str | None] = mapped_column(String, nullable=True)
    reference_id: Mapped[str | None] = mapped_column(String, nullable=True)
    reference_type: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))


class InventoryIdempotencyKeyModel(Base):
    __tablename__ = "inventory_idempotency_keys"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_id)
    owner_id: Mapped[str] = mapped_column(String, nullable=False, index=True)
    idempotency_key: Mapped[str] = mapped_column(String, nullable=False)
    command_id: Mapped[str] = mapped_column(String, nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        UniqueConstraint("owner_id", "idempotency_key", name="uq_inventory_idem_owner_key"),
    )


class DomainOutboxMessageModel(Base):
    __tablename__ = "domain_outbox_messages"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_id)
    topic: Mapped[str] = mapped_column(String, nullable=False, index=True)
    event_type: Mapped[str] = mapped_column(String, nullable=False, index=True)
    owner_id: Mapped[str] = mapped_column(String, nullable=False, index=True)
    command_id: Mapped[str] = mapped_column(String, nullable=False, index=True)
    payload: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    status: Mapped[str] = mapped_column(String, nullable=False, default="pending", index=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))


class InventoryReservationModel(Base):
    __tablename__ = "inventory_reservations"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_id)
    owner_id: Mapped[str] = mapped_column(String, nullable=False, index=True)
    product_id: Mapped[str] = mapped_column(String, nullable=False, index=True)
    store_id: Mapped[str] = mapped_column(String, nullable=False, index=True)
    status: Mapped[str] = mapped_column(String, nullable=False, default="active", index=True)
    purpose: Mapped[str] = mapped_column(String, nullable=False, default="sale")
    quantity_reserved: Mapped[int] = mapped_column(Integer, nullable=False)
    quantity_committed: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    quantity_released: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    reference_id: Mapped[str | None] = mapped_column(String, nullable=True)
    reference_type: Mapped[str | None] = mapped_column(String, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    released_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    committed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
