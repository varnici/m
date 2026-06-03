"""Supabase client initialization with a local fallback for tests/dev."""
from __future__ import annotations

from copy import deepcopy
from datetime import datetime, timezone
from decimal import Decimal
from functools import lru_cache
from typing import Any
from uuid import uuid4

from app.config import get_settings

try:  # pragma: no cover - exercised only when the optional dependency exists
    from supabase import Client, create_client
except ImportError:  # pragma: no cover - local/test fallback path
    Client = Any  # type: ignore[assignment]
    create_client = None  # type: ignore[assignment]


class _MemoryResponse:
    def __init__(self, data: list[dict[str, Any]] | Any):
        self.data = data


class _MemoryTableQuery:
    def __init__(self, client: "_MemorySupabaseClient", table_name: str):
        self.client = client
        self.table_name = table_name
        self._operation = "select"
        self._payload: dict[str, Any] | list[dict[str, Any]] | None = None
        self._filters: list[tuple[str, Any]] = []
        self._order: tuple[str, bool] | None = None
        self._limit: int | None = None
        self._range: tuple[int, int] | None = None
        self._columns: list[str] | None = None

    def select(self, columns: str = "*") -> "_MemoryTableQuery":
        self._operation = "select"
        if columns != "*":
            self._columns = [column.strip() for column in columns.split(",")]
        return self

    def insert(self, payload: dict[str, Any] | list[dict[str, Any]]) -> "_MemoryTableQuery":
        self._operation = "insert"
        self._payload = payload
        return self

    def update(self, payload: dict[str, Any]) -> "_MemoryTableQuery":
        self._operation = "update"
        self._payload = payload
        return self

    def delete(self) -> "_MemoryTableQuery":
        self._operation = "delete"
        return self

    def eq(self, column: str, value: Any) -> "_MemoryTableQuery":
        self._filters.append((column, value))
        return self

    def order(self, column: str, desc: bool = False) -> "_MemoryTableQuery":
        self._order = (column, desc)
        return self

    def limit(self, count: int) -> "_MemoryTableQuery":
        self._limit = count
        return self

    def range(self, start: int, end: int) -> "_MemoryTableQuery":
        self._range = (start, end)
        return self

    def execute(self) -> _MemoryResponse:
        if self.table_name == "inventory_summary":
            return _MemoryResponse([self.client.inventory_summary()])

        rows = self.client.table_rows(self.table_name)
        if self._operation == "insert":
            payloads = self._payload if isinstance(self._payload, list) else [self._payload]
            inserted = [self.client.insert_row(self.table_name, payload or {}) for payload in payloads]
            return _MemoryResponse(self._project(inserted))

        matched = self._matched(rows)
        if self._operation == "update":
            updated = [
                self.client.update_row(self.table_name, row["id"], self._payload or {})
                for row in matched
            ]
            return _MemoryResponse(self._project(updated))

        if self._operation == "delete":
            deleted = [self.client.delete_row(self.table_name, row["id"]) for row in matched]
            return _MemoryResponse([row for row in deleted if row is not None])

        return _MemoryResponse(self._project(self._page(matched)))

    def _matched(self, rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
        matched = rows
        for column, value in self._filters:
            matched = [row for row in matched if str(row.get(column)) == str(value)]
        if self._order:
            column, descending = self._order
            matched = sorted(matched, key=lambda row: row.get(column) or "", reverse=descending)
        return matched

    def _page(self, rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
        if self._range:
            start, end = self._range
            rows = rows[start : end + 1]
        if self._limit is not None:
            rows = rows[: self._limit]
        return rows

    def _project(self, rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
        if not self._columns:
            return [deepcopy(row) for row in rows]
        return [
            {column: deepcopy(row.get(column)) for column in self._columns}
            for row in rows
        ]


class _MemorySupabaseClient:
    def __init__(self):
        self._tables: dict[str, dict[str, dict[str, Any]]] = {}

    def table(self, table_name: str) -> _MemoryTableQuery:
        return _MemoryTableQuery(self, table_name)

    def rpc(self, _name: str, _params: dict[str, Any]) -> _MemoryTableQuery:
        return _MemoryTableQuery(self, "__empty_rpc__")

    def table_rows(self, table_name: str) -> list[dict[str, Any]]:
        return list(self._tables.setdefault(table_name, {}).values())

    def insert_row(self, table_name: str, payload: dict[str, Any]) -> dict[str, Any]:
        now = datetime.now(timezone.utc).isoformat()
        row = deepcopy(payload)
        row.setdefault("id", str(uuid4()))
        row.setdefault("created_at", now)
        row.setdefault("updated_at", now)
        self._normalize_row(table_name, row)
        self._tables.setdefault(table_name, {})[str(row["id"])] = row
        return deepcopy(row)

    def update_row(self, table_name: str, row_id: str, payload: dict[str, Any]) -> dict[str, Any]:
        row = self._tables.setdefault(table_name, {})[str(row_id)]
        row.update(deepcopy(payload))
        row["updated_at"] = datetime.now(timezone.utc).isoformat()
        self._normalize_row(table_name, row)
        return deepcopy(row)

    def delete_row(self, table_name: str, row_id: str) -> dict[str, Any] | None:
        return self._tables.setdefault(table_name, {}).pop(str(row_id), None)

    def inventory_summary(self) -> dict[str, Any]:
        rows = self.table_rows("inventory")
        total_items = len(rows)
        total_sold = sum(int(row.get("sold") or 0) for row in rows)
        total_revenue = sum(Decimal(str(row.get("revenue") or 0)) for row in rows)
        total_profit = sum(Decimal(str(row.get("profit") or 0)) for row in rows)
        margin_pct = Decimal("0")
        if total_revenue > 0:
            margin_pct = (total_profit / total_revenue) * Decimal("100")
        return {
            "total_items": total_items,
            "total_sold": total_sold,
            "total_revenue": total_revenue,
            "total_profit": total_profit,
            "margin_pct": margin_pct,
        }

    def _normalize_row(self, table_name: str, row: dict[str, Any]) -> None:
        if table_name != "inventory":
            return
        price = Decimal(str(row.get("price") or 0))
        product_cost = Decimal(str(row.get("product_cost") or 0))
        sold = Decimal(str(row.get("sold") or 0))
        row["revenue"] = price * sold
        row["profit"] = (price - product_cost) * sold


@lru_cache
def get_supabase() -> Client:
    """Get cached Supabase client, or a deterministic in-memory dev client."""
    settings = get_settings()
    if create_client and settings.supabase_url.startswith(("http://", "https://")):
        return create_client(settings.supabase_url, settings.supabase_service_key)
    return _MemorySupabaseClient()
