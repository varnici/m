from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime


@dataclass(frozen=True)
class InventoryEvent:
    owner_id: str
    command_id: str
    product_id: str
    store_id: str
    occurred_at: datetime


@dataclass(frozen=True)
class StockMovedIn(InventoryEvent):
    quantity: int


@dataclass(frozen=True)
class StockMovedOut(InventoryEvent):
    quantity: int


@dataclass(frozen=True)
class StockAdjusted(InventoryEvent):
    quantity_delta: int

