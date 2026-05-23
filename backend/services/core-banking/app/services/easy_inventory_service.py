"""app/services/easy_inventory_service.py — business logic, decoupled from HTTP layer."""
from __future__ import annotations
from uuid import UUID

from app.schemas.easy_inventory import InventoryCreate, InventoryUpdate, InventoryRecord, SummaryResponse
from app.services.supabase_service import get_supabase

TABLE = "inventory"


def _client():
    return get_supabase()


def create_item(payload: InventoryCreate) -> InventoryRecord:
    data = payload.model_dump(mode="json")
    # profit & revenue are GENERATED columns — Supabase computes them
    res = _client().table(TABLE).insert(data).execute()
    return InventoryRecord(**res.data[0])


def list_items(limit: int = 100, offset: int = 0) -> list[InventoryRecord]:
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
    res = _client().table(TABLE).select("*").eq("id", str(item_id)).execute()
    if not res.data:
        return None
    return InventoryRecord(**res.data[0])


def update_item(item_id: UUID, payload: InventoryUpdate) -> InventoryRecord | None:
    data = payload.model_dump(mode="json", exclude_none=True)
    if not data:
        return get_item(item_id)
    res = _client().table(TABLE).update(data).eq("id", str(item_id)).execute()
    if not res.data:
        return None
    return InventoryRecord(**res.data[0])


def delete_item(item_id: UUID) -> bool:
    res = _client().table(TABLE).delete().eq("id", str(item_id)).execute()
    return len(res.data) > 0


def get_summary() -> SummaryResponse:
    res = _client().table("inventory_summary").select("*").execute()
    if not res.data:
        return SummaryResponse(
            total_items=0, total_sold=0,
            total_revenue=0, total_profit=0, margin_pct=0
        )
    return SummaryResponse(**res.data[0])
