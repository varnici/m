from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, field_validator


class DistributorProfileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    company_name: Optional[str] = None
    cac_reg_number: Optional[str] = None
    cac_verified: bool
    warehouse_address: Optional[str] = None
    warehouse_lat: Optional[float] = None
    warehouse_lng: Optional[float] = None
    product_categories: Optional[str] = None
    min_order_value_kobo: Optional[int] = None
    verified: bool
    created_at: datetime

    @field_validator("id", "user_id", mode="before")
    @classmethod
    def _coerce_str(cls, v):
        return str(v) if v is not None else v


class DistributorDirectoryEntryOut(DistributorProfileOut):
    """DistributorProfileOut plus the user's display name, for browsing."""
    business_name: Optional[str] = None


class DistributorListOut(BaseModel):
    items: List[DistributorDirectoryEntryOut]
    total: int
