from __future__ import annotations

from collections import defaultdict

from app.domain.inventory.entities import InventoryLedgerEntry
from app.domain.inventory.events import InventoryEvent
from app.domain.inventory.ports import (
    InventoryIdempotencyStore,
    InventoryLedgerRepository,
    InventoryOutbox,
)


class InMemoryLedgerRepository(InventoryLedgerRepository):
    def __init__(self) -> None:
        self.entries: list[InventoryLedgerEntry] = []
        self._balances: dict[tuple[str, str, str], int] = defaultdict(int)

    def append_entry(self, entry: InventoryLedgerEntry) -> None:
        self.entries.append(entry)
        key = (entry.owner_id, entry.product_id, entry.store_id)
        self._balances[key] += entry.quantity_delta

    def current_quantity(self, owner_id: str, product_id: str, store_id: str) -> int:
        return self._balances[(owner_id, product_id, store_id)]


class InMemoryIdempotencyStore(InventoryIdempotencyStore):
    def __init__(self) -> None:
        self._seen: dict[tuple[str, str], str] = {}

    def seen(self, owner_id: str, idempotency_key: str) -> bool:
        return (owner_id, idempotency_key) in self._seen

    def mark(self, owner_id: str, idempotency_key: str, command_id: str) -> None:
        self._seen[(owner_id, idempotency_key)] = command_id


class InMemoryOutbox(InventoryOutbox):
    def __init__(self) -> None:
        self.events: list[InventoryEvent] = []

    def publish(self, event: InventoryEvent) -> None:
        self.events.append(event)

