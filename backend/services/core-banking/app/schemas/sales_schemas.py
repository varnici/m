from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class SaleCreate(BaseModel):
    user_id: str
    product_sku: str
    quantity: int = Field(..., ge=1)
    unit_price_kobo: int = Field(..., ge=0)
    channel: str = "manual"


class SaleOut(BaseModel):
    id: str
    user_id: str
    product_sku: str
    quantity: int
    unit_price_kobo: int
    channel: str
    sold_at: datetime

    class Config:
        from_attributes = True

