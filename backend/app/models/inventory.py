"""Inventory models."""
from pydantic import BaseModel, Field
from decimal import Decimal
from uuid import UUID
from datetime import datetime


class InventoryCreate(BaseModel):
    """Request schema for inventory creation."""
    product_name: str = Field(..., min_length=1, max_length=255)
    customer_id: str = Field(..., min_length=1, max_length=100)
    quantity: int = Field(..., ge=0)
    pack_quantity: int = Field(0, ge=0)
    product_cost: Decimal = Field(..., ge=0, decimal_places=2)
    price: Decimal = Field(..., ge=0, decimal_places=2)
    sold: int = Field(..., ge=0)


class InventoryUpdate(BaseModel):
    """Request schema for inventory updates."""
    product_name: str | None = Field(None, min_length=1, max_length=255)
    customer_id: str | None = Field(None, min_length=1, max_length=100)
    quantity: int | None = Field(None, ge=0)
    pack_quantity: int | None = Field(None, ge=0)
    product_cost: Decimal | None = Field(None, ge=0, decimal_places=2)
    price: Decimal | None = Field(None, ge=0, decimal_places=2)
    sold: int | None = Field(None, ge=0)


class InventoryRecord(BaseModel):
    """Response schema for inventory record."""
    id: UUID
    product_name: str
    customer_id: str
    quantity: int
    pack_quantity: int
    product_cost: Decimal
    price: Decimal
    sold: int
    profit: Decimal
    revenue: Decimal
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class SummaryResponse(BaseModel):
    """Response schema for inventory summary."""
    total_items: int
    total_sold: int
    total_revenue: Decimal
    total_profit: Decimal
    margin_pct: Decimal
