"""Sales transaction schemas."""
from __future__ import annotations

from datetime import datetime
from pydantic import BaseModel, Field
from typing import Optional


class SaleCreate(BaseModel):
    """Schema for creating a sale."""
    user_id: str
    product_sku: str = Field(..., min_length=1)
    quantity: int = Field(..., ge=1)
    unit_price_kobo: int = Field(..., ge=0)
    channel: str = Field(default="manual")


class SaleOut(BaseModel):
    """Response schema for a sale."""
    id: str
    user_id: str
    product_sku: str
    quantity: int
    unit_price_kobo: int
    total_kobo: int
    channel: str
    created_at: datetime

    class Config:
        from_attributes = True
