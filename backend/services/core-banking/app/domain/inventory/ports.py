from __future__ import annotations

from typing import Protocol

from app.domain.inventory.entities import InventoryLedgerEntry
from app.domain.inventory.events import InventoryEvent


class InventoryLedgerRepository(Protocol):
    def append_entry(self, entry: InventoryLedgerEntry) -> None:
        ...

    def current_quantity(self, owner_id: str, product_id: str, store_id: str) -> int:
        ...


class InventoryIdempotencyStore(Protocol):
    def seen(self, owner_id: str, idempotency_key: str) -> bool:
        ...

    def mark(self, owner_id: str, idempotency_key: str, command_id: str) -> None:
        ...


class InventoryOutbox(Protocol):
    def publish(self, event: InventoryEvent) -> None:
        ...

