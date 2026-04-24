from __future__ import annotations

from dataclasses import asdict
from datetime import datetime

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.config import settings
from app.domain.inventory.entities import InventoryLedgerEntry
from app.domain.inventory.events import InventoryEvent
from app.domain.inventory.ports import (
    InventoryIdempotencyStore,
    InventoryLedgerRepository,
    InventoryOutbox,
)
from app.models.inventory import Product, StockLevel
from app.models.inventory_domain import (
    DomainOutboxMessageModel,
    InventoryIdempotencyKeyModel,
    InventoryLedgerEntryModel,
)


class SQLAlchemyInventoryLedgerRepository(InventoryLedgerRepository):
    def __init__(self, db: Session):
        self.db = db

    def append_entry(self, entry: InventoryLedgerEntry) -> None:
        self.db.add(
            InventoryLedgerEntryModel(
                owner_id=entry.owner_id,
                command_id=entry.command_id,
                idempotency_key=entry.idempotency_key,
                product_id=entry.product_id,
                store_id=entry.store_id,
                quantity_delta=entry.quantity_delta,
                movement_type=entry.movement_type.value,
                occurred_at=entry.occurred_at,
                reason_code=entry.reason_code,
                reference_id=entry.reference_id,
                reference_type=entry.reference_type,
            )
        )

    def current_quantity(self, owner_id: str, product_id: str, store_id: str) -> int:
        # Use current stock on-hand for domain validation.
        # Note: We intentionally use only quantity_on_hand (not subtracting
        # quantity_reserved) because during the reservation-first sale flow,
        # reserve_stock() increments quantity_reserved *before*
        # commit_stock_reservation() decrements quantity_on_hand.
        # Subtracting reserved here would double-count the stock reduction
        # and falsely reject valid sales as "Insufficient stock".
        # The reservation system already enforces availability upstream.
        quantity = (
            self.db.query(
                func.coalesce(func.sum(StockLevel.quantity_on_hand), 0)
            )
            .join(Product, Product.id == StockLevel.product_id)
            .filter(
                Product.owner_id == owner_id,
                StockLevel.product_id == product_id,
                StockLevel.store_id == store_id,
            )
            .scalar()
        )
        return int(quantity or 0)


class SQLAlchemyInventoryIdempotencyStore(InventoryIdempotencyStore):
    def __init__(self, db: Session):
        self.db = db

    def seen(self, owner_id: str, idempotency_key: str) -> bool:
        existing = (
            self.db.query(InventoryIdempotencyKeyModel.id)
            .filter(
                InventoryIdempotencyKeyModel.owner_id == owner_id,
                InventoryIdempotencyKeyModel.idempotency_key == idempotency_key,
            )
            .first()
        )
        return existing is not None

    def mark(self, owner_id: str, idempotency_key: str, command_id: str) -> None:
        self.db.add(
            InventoryIdempotencyKeyModel(
                owner_id=owner_id,
                idempotency_key=idempotency_key,
                command_id=command_id,
            )
        )


class SQLAlchemyInventoryOutbox(InventoryOutbox):
    def __init__(self, db: Session):
        self.db = db

    def publish(self, event: InventoryEvent) -> None:
        payload = asdict(event)
        # Convert datetime to ISO string for JSON serialization
        if "occurred_at" in payload and isinstance(payload["occurred_at"], datetime):
            payload["occurred_at"] = payload["occurred_at"].isoformat()

        self.db.add(
            DomainOutboxMessageModel(
                topic=settings.inventory_domain_outbox_topic,
                event_type=event.__class__.__name__,
                owner_id=event.owner_id,
                command_id=event.command_id,
                payload=payload,
                status="pending",
            )
        )

