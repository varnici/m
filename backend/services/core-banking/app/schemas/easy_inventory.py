"""app/schemas/easy_inventory.py — request/response schemas (Pydantic v2)."""
from __future__ import annotations
from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field, field_validator, model_validator


# ── Request ───────────────────────────────────────────────────────────────────
class InventoryCreate(BaseModel):
    product_name: str  = Field(..., min_length=1, max_length=255)
    customer_id:  str  = Field(..., min_length=1, max_length=100)
    quantity:     int  = Field(..., ge=0)
    pack_quantity: int = Field(0, ge=0, description="Units per pack (0 = not sold in packs)")
    product_cost: Decimal = Field(..., ge=0, decimal_places=2)
    price:        Decimal = Field(..., ge=0, decimal_places=2)
    sold:         int     = Field(..., ge=0)

    @field_validator("product_name")
    @classmethod
    def title_case(cls, v: str) -> str:
        return v.strip().title()

    @field_validator("customer_id")
    @classmethod
    def upper_case(cls, v: str) -> str:
        return v.strip().upper()

    @model_validator(mode="after")
    def sold_le_quantity(self) -> "InventoryCreate":
        if self.sold > self.quantity:
            raise ValueError("sold cannot exceed quantity in stock")
        return self


class InventoryUpdate(BaseModel):
    product_name:  str     | None = Field(None, min_length=1, max_length=255)
    customer_id:   str     | None = Field(None, min_length=1, max_length=100)
    quantity:      int     | None = Field(None, ge=0)
    pack_quantity: int     | None = Field(None, ge=0)
    product_cost:  Decimal | None = Field(None, ge=0, decimal_places=2)
    price:         Decimal | None = Field(None, ge=0, decimal_places=2)
    sold:          int     | None = Field(None, ge=0)


# ── Response ──────────────────────────────────────────────────────────────────
class InventoryRecord(BaseModel):
    id:            UUID
    product_name:  str
    customer_id:   str
    quantity:      int
    pack_quantity: int
    product_cost:  Decimal
    price:         Decimal
    sold:          int
    profit:        Decimal   # server-generated
    revenue:       Decimal   # server-generated
    created_at:    datetime
    updated_at:    datetime

    model_config = {"from_attributes": True}


class SummaryResponse(BaseModel):
    total_items:   int
    total_sold:    int
    total_revenue: Decimal
    total_profit:  Decimal
    margin_pct:    Decimal


class VoiceTranscribeResponse(BaseModel):
    text:           str
    extracted_number: str | None = None
    field_type:     str           # 'text' | 'number'
