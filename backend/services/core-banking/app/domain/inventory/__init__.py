"""Inventory domain module."""

from app.domain.inventory.entities import InventoryCommand, InventoryLedgerEntry
from app.domain.inventory.events import (
    InventoryEvent,
    StockAdjusted,
    StockMovedIn,
    StockMovedOut,
)
from app.domain.inventory.service import InventoryCommandService
from app.domain.inventory.sqlalchemy_adapters import (
    SQLAlchemyInventoryIdempotencyStore,
    SQLAlchemyInventoryLedgerRepository,
    SQLAlchemyInventoryOutbox,
)

__all__ = [
    "InventoryCommand",
    "InventoryLedgerEntry",
    "InventoryEvent",
    "StockAdjusted",
    "StockMovedIn",
    "StockMovedOut",
    "InventoryCommandService",
    "SQLAlchemyInventoryIdempotencyStore",
    "SQLAlchemyInventoryLedgerRepository",
    "SQLAlchemyInventoryOutbox",
]
