from __future__ import annotations

from datetime import datetime
from typing import List
from pydantic import BaseModel, ConfigDict


class BusinessStarterKitItem(BaseModel):
    name: str
    quantity: int
    estimated_cost_kobo: int


class BusinessStarterKitOut(BaseModel):
    id: str
    slug: str
    name: str
    description: str
    business_category: str
    icon_name: str
    total_cost_kobo: int
    suggested_duration_months: int
    items: List[BusinessStarterKitItem]
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
