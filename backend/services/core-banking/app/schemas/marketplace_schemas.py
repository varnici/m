from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


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

