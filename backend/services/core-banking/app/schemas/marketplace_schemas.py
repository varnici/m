"""Marketplace and product listing schemas."""
from __future__ import annotations

from datetime import datetime
<<<<<<< HEAD

from pydantic import BaseModel, model_validator
=======
from pydantic import BaseModel, Field
from typing import Optional
>>>>>>> 28426ae5 (ai asistance ui and update)


class ProductCreate(BaseModel):
    """Schema for creating a product."""
    name: str = Field(..., min_length=1)
    sku: str = Field(..., min_length=1)
    description: Optional[str] = None


class ProductOut(BaseModel):
    """Response schema for product."""
    id: str
    name: str
    sku: str
    description: Optional[str]
    created_at: datetime

    @model_validator(mode="before")
    @classmethod
    def map_db_fields(cls, data):
        if not isinstance(data, dict):
            category_name = None
            if hasattr(data, "category") and data.category:
                category_name = data.category.name
            
            return {
                "id": getattr(data, "id", None),
                "owner_id": getattr(data, "owner_id", None),
                "name": getattr(data, "name", None),
                "description": getattr(data, "description", None),
                "sku": getattr(data, "sku", None),
                "category": category_name,
                "unit_price_kobo": getattr(data, "selling_price_kobo", 0),
                "estate": getattr(data, "estate", None),
                "city": getattr(data, "city", None),
                "latitude": getattr(data, "latitude", None),
                "longitude": getattr(data, "longitude", None),
                "is_active": getattr(data, "is_active", True),
                "created_at": getattr(data, "created_at", None),
            }
        return data

    class Config:
        from_attributes = True


class ListingCreate(BaseModel):
    """Schema for creating a marketplace listing."""
    product_id: str
    price_kobo: int = Field(..., ge=0)
    available_quantity: int = Field(..., ge=0)


class ListingOut(BaseModel):
    """Response schema for listing."""
    id: str
    product_id: str
    price_kobo: int
    available_quantity: int
    slug: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class NearbyListingsQuery(BaseModel):
    """Query schema for nearby listings."""
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    radius_km: float = Field(default=5.0, ge=0.1)
    limit: int = Field(default=20, ge=1, le=100)
