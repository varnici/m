from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


VALID_VEHICLE_TYPES = {"motorcycle", "car", "bus", "truck"}


class DriverProfileCreate(BaseModel):
    user_id: str
    full_name: str
    phone: str
    vehicle_type: str
    vehicle_plate: str
    certifications: list[str] = Field(default_factory=list)


class DriverProfileOut(BaseModel):
    id: str
    user_id: str
    full_name: str
    phone: str
    vehicle_type: str
    vehicle_plate: str
    certifications_json: str
    nin_verified: bool
    vehicle_docs_verified: bool
    is_active: bool
    is_online: bool
    current_lat: float | None
    current_lng: float | None
    rating: float
    total_jobs: int
    created_at: datetime

    class Config:
        from_attributes = True


class TransportBookingCreate(BaseModel):
    client_user_id: str
    vehicle_type: str
    pickup_address: str
    pickup_lat: float
    pickup_lng: float
    delivery_address: str
    delivery_lat: float
    delivery_lng: float
    item_description: str
    item_weight_kg: float = Field(..., gt=0)
    declared_goods_value_kobo: int = Field(..., gt=0)


class TransportBookingOut(BaseModel):
    id: str
    client_user_id: str
    driver_user_id: str | None
    vehicle_type: str
    status: str
    pickup_address: str
    pickup_lat: float
    pickup_lng: float
    delivery_address: str
    delivery_lat: float
    delivery_lng: float
    item_description: str
    item_weight_kg: float
    declared_goods_value_kobo: int
    delivery_fee_kobo: int
    created_at: datetime

    class Config:
        from_attributes = True


class AssignDriverPayload(BaseModel):
    driver_user_id: str


class DriverLocationUpdate(BaseModel):
    lat: float
    lng: float


class TrackingPointOut(BaseModel):
    id: str
    booking_id: str
    driver_user_id: str
    lat: float
    lng: float
    created_at: datetime

    class Config:
        from_attributes = True

