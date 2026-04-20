from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from enum import Enum
from typing import Optional


class InventoryMovementType(str, Enum):
    PURCHASE = "purchase"
    SALE = "sale"
    ADJUSTMENT = "adjustment"
    TRANSFER = "transfer"
    DAMAGE = "damage"
    RETURN = "return"


@dataclass(frozen=True)
class InventoryCommand:
    owner_id: str
    command_id: str
    idempotency_key: str
    product_id: str
    movement_type: InventoryMovementType
    quantity: int
    occurred_at: datetime
    from_store_id: Optional[str] = None
    to_store_id: Optional[str] = None
    reason_code: Optional[str] = None
    reference_id: Optional[str] = None
    reference_type: Optional[str] = None
    actor_id: Optional[str] = None


@dataclass(frozen=True)
class InventoryLedgerEntry:
    owner_id: str
    command_id: str
    product_id: str
    store_id: str
    quantity_delta: int
    movement_type: InventoryMovementType
    occurred_at: datetime
    idempotency_key: str
    reason_code: Optional[str] = None
    reference_id: Optional[str] = None
    reference_type: Optional[str] = None

