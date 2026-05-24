"""Transport and delivery schemas."""
from __future__ import annotations

from datetime import datetime
from pydantic import BaseModel, Field
from typing import Optional, List

VALID_VEHICLE_TYPES = ["motorcycle", "car", "bus", "truck"]


class DriverProfileCreate(BaseModel):
    """Schema for creating a driver profile."""
    user_id: str
    full_name: str = Field(..., min_length=1)
    phone: str = Field(..., min_length=10)
    vehicle_type: str = Field(..., pattern=r"^(motorcycle|car|bus|truck)$")
    vehicle_plate: str = Field(..., min_length=1)
    certifications: List[str] = Field(default_factory=list)


class DriverProfileOut(BaseModel):
    """Response schema for driver profile."""
    id: str
    user_id: str
    full_name: str
    phone: str
    vehicle_type: str
    vehicle_plate: str
    nin_verified: bool
    vehicle_docs_verified: bool
    is_active: bool
    is_online: bool
    current_lat: Optional[float]
    current_lng: Optional[float]
    rating: float
    total_jobs: int
    created_at: datetime

    class Config:
        from_attributes = True


class TransportBookingCreate(BaseModel):
    """Schema for creating a transport booking."""
    client_user_id: str
    vehicle_type: str = Field(..., pattern=r"^(motorcycle|car|bus|truck)$")
    pickup_address: str = Field(..., min_length=1)
    pickup_lat: float = Field(..., ge=-90, le=90)
    pickup_lng: float = Field(..., ge=-180, le=180)
    delivery_address: str = Field(..., min_length=1)
    delivery_lat: float = Field(..., ge=-90, le=90)
    delivery_lng: float = Field(..., ge=-180, le=180)
    item_description: str = Field(..., min_length=1)
    item_weight_kg: float = Field(..., gt=0)
    declared_goods_value_kobo: int = Field(..., ge=0)


class TransportBookingOut(BaseModel):
    """Response schema for transport booking."""
    id: str
    client_user_id: str
    driver_user_id: Optional[str]
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


class DriverLocationUpdate(BaseModel):
    """Schema for updating driver location."""
    user_id: str
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)


class TrackingPointOut(BaseModel):
    """Response schema for tracking point."""
    id: str
    booking_id: str
    driver_user_id: str
    lat: float
    lng: float
    created_at: datetime

    class Config:
        from_attributes = True


class AssignDriverPayload(BaseModel):
    """Schema for assigning a driver to a booking."""
    booking_id: str
    driver_user_id: str
