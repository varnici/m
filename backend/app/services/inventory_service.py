"""Inventory service - business logic layer with performance optimizations."""
from __future__ import annotations
from uuid import UUID
from decimal import Decimal
from functools import lru_cache
from typing import Dict, Optional

from app.models.inventory import InventoryCreate, InventoryUpdate, InventoryRecord, SummaryResponse
from app.services.supabase_service import get_supabase
from app.services import savings_service

TABLE = "inventory"

# OPTIMIZATION: In-memory cache for frequently accessed items (O(1) lookup)
_item_cache: Dict[str, Optional[InventoryRecord]] = {}
_cache_hits = 0
_cache_misses = 0


def _client():
    return get_supabase()


def create_item(payload: InventoryCreate) -> InventoryRecord:
    """Create a new inventory item."""
    data = payload.model_dump(mode="json")
    res = _client().table(TABLE).insert(data).execute()
    record = InventoryRecord(**res.data[0])
    
    # OPTIMIZATION: Cache newly created item
    _item_cache[str(record.id)] = record
    
    return record


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
    """Get a single inventory item by ID with caching (O(1) lookup)."""
    global _cache_hits, _cache_misses
    
    item_key = str(item_id)
    
    # OPTIMIZATION: Check cache first (O(1) instead of DB query)
    if item_key in _item_cache:
        _cache_hits += 1
        return _item_cache[item_key]
    
    # Cache miss - fetch from DB
    _cache_misses += 1
    res = _client().table(TABLE).select("*").eq("id", item_key).execute()
    if not res.data:
        _item_cache[item_key] = None
        return None
    
    record = InventoryRecord(**res.data[0])
    _item_cache[item_key] = record
    return record


def update_item(item_id: UUID, payload: InventoryUpdate) -> InventoryRecord | None:
    """Update an inventory item - OPTIMIZED: Avoids N+1 queries."""
    item_key = str(item_id)
    
    # OPTIMIZATION: Get previous item from cache first (no DB hit if cached)
    previous = get_item(item_id)
    
    data = payload.model_dump(mode="json", exclude_none=True)
    if not data:
        return previous  # OPTIMIZATION: Return cached previous instead of querying again
    
    res = _client().table(TABLE).update(data).eq("id", item_key).execute()
    if not res.data:
        return None
    
    updated = InventoryRecord(**res.data[0])

    # OPTIMIZATION: Invalidate cache on update
    _item_cache[item_key] = updated
    
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
    """Delete an inventory item with cache invalidation."""
    item_key = str(item_id)
    res = _client().table(TABLE).delete().eq("id", item_key).execute()
    
    # OPTIMIZATION: Invalidate cache on delete
    if item_key in _item_cache:
        del _item_cache[item_key]
    
    return len(res.data) > 0


# OPTIMIZATION: Cache summary (computed by database view) with TTL
_summary_cache: Optional[SummaryResponse] = None
_summary_cache_ts: float = 0
_SUMMARY_CACHE_TTL_SECONDS = 300  # 5 minutes


def get_summary() -> SummaryResponse:
    """Get inventory summary statistics with caching (database view)."""
    import time
    global _summary_cache, _summary_cache_ts
    
    current_ts = time.time()
    # OPTIMIZATION: Return cached summary if fresh (O(1) instead of DB query)
    if _summary_cache and (current_ts - _summary_cache_ts) < _SUMMARY_CACHE_TTL_SECONDS:
        return _summary_cache
    
    res = _client().table("inventory_summary").select("*").execute()
    if not res.data:
        result = SummaryResponse(
            total_items=0, total_sold=0,
            total_revenue=0, total_profit=0, margin_pct=0
        )
    else:
        result = SummaryResponse(**res.data[0])
    
    # OPTIMIZATION: Update cache
    _summary_cache = result
    _summary_cache_ts = current_ts
    
    return result
