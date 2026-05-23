from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, model_validator


class ProductCreate(BaseModel):
    name: str
    description: str | None = None
    sku: str | None = None
    category: str | None = None
    unit_price_kobo: int
    estate: str | None = None
    city: str | None = None
    latitude: float | None = None
    longitude: float | None = None


class ProductOut(BaseModel):
    id: str
    owner_id: str
    name: str
    description: str | None
    sku: str | None
    category: str | None
    unit_price_kobo: int
    estate: str | None
    city: str | None
    latitude: float | None
    longitude: float | None
    is_active: bool
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
    product_id: str
    price_kobo: int
    available_quantity: int


class ListingOut(BaseModel):
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
    estate: str | None = None
    city: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    radius_km: float | None = None

