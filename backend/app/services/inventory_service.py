"""Inventory service - business logic layer."""
from __future__ import annotations
from uuid import UUID
from decimal import Decimal

from app.models.inventory import InventoryCreate, InventoryUpdate, InventoryRecord, SummaryResponse
from app.services.supabase_service import get_supabase
from app.services import savings_service

TABLE = "inventory"


def _client():
    return get_supabase()


def create_item(payload: InventoryCreate) -> InventoryRecord:
    """Create a new inventory item."""
    data = payload.model_dump(mode="json")
    res = _client().table(TABLE).insert(data).execute()
    return InventoryRecord(**res.data[0])


def list_items(limit: int = 100, offset: int = 0) -> list[InventoryRecord]:
    """List inventory items with pagination."""
    res = (
        _client()
        .table(TABLE)
        .select("*")
        .order("created_at", desc=True)
        .range(offset, offset + limit - 1)
        .execute()
    )
    return [InventoryRecord(**r) for r in res.data]


def get_item(item_id: UUID) -> InventoryRecord | None:
    """Get a single inventory item by ID."""
    res = _client().table(TABLE).select("*").eq("id", str(item_id)).execute()
    if not res.data:
        return None
    return InventoryRecord(**res.data[0])


def update_item(item_id: UUID, payload: InventoryUpdate) -> InventoryRecord | None:
    """Update an inventory item."""
    previous = get_item(item_id)
    data = payload.model_dump(mode="json", exclude_none=True)
    if not data:
        return get_item(item_id)
    res = _client().table(TABLE).update(data).eq("id", str(item_id)).execute()
    if not res.data:
        return None
    updated = InventoryRecord(**res.data[0])

    # Contextual handshake: sale increase prompts smart savings suggestion.
    if previous and payload.sold is not None and payload.sold > previous.sold:
        sold_delta = payload.sold - previous.sold
        profit_per_item = Decimal(updated.price) - Decimal(updated.product_cost)
        profit_delta = max(profit_per_item * Decimal(sold_delta), Decimal("0"))
        suggestion = savings_service.generate_smart_suggestion(updated.customer_id, profit_delta)
        if suggestion:
            try:
                _client().table("transaction_logs").insert(
                    {
                        "user_id": updated.customer_id,
                        "action": "inventory_sale_smart_suggestion",
                        "action_details": suggestion,
                    }
                ).execute()
            except Exception:
                # Suggestion generation should never block inventory updates.
                pass

    return updated


def delete_item(item_id: UUID) -> bool:
    """Delete an inventory item."""
    res = _client().table(TABLE).delete().eq("id", str(item_id)).execute()
    return len(res.data) > 0


def get_summary() -> SummaryResponse:
    """Get inventory summary statistics."""
    res = _client().table("inventory_summary").select("*").execute()
    if not res.data:
        return SummaryResponse(
            total_items=0, total_sold=0,
            total_revenue=0, total_profit=0, margin_pct=0
        )
    return SummaryResponse(**res.data[0])
