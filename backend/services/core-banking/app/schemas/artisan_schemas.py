"""Artisan and service booking schemas."""
from __future__ import annotations

from datetime import datetime
from pydantic import BaseModel, Field
from typing import Optional


class ArtisanCreate(BaseModel):
    """Schema for creating an artisan profile."""
    user_id: str
    trade_category: str = Field(..., min_length=1)
    years_experience: int = Field(..., ge=0)
    service_area: Optional[str] = None
    estate: Optional[str] = None
    city: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class ArtisanOut(BaseModel):
    """Response schema for artisan."""
    id: str
    user_id: str
    trade_category: str
    years_experience: int
    service_area: Optional[str]
    estate: Optional[str]
    city: Optional[str]
    latitude: Optional[float]
    longitude: Optional[float]
    rating: float
    rating_count: int
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class ArtisanBookingCreate(BaseModel):
    """Schema for creating a service booking."""
    artisan_id: str
    client_user_id: str
    service_category: str = Field(..., min_length=1)
    problem_description: str = Field(..., min_length=1)
    address: str = Field(..., min_length=1)
    scheduled_at: Optional[datetime] = None


class ArtisanBookingOut(BaseModel):
    """Response schema for artisan booking."""
    id: str
    artisan_id: str
    client_user_id: str
    service_category: str
    problem_description: str
    address: str
    scheduled_at: Optional[datetime]
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class ArtisanRatingCreate(BaseModel):
    """Schema for rating an artisan service."""
    booking_id: str
    goods_condition_ok: bool = True
    on_time: str = Field(..., pattern=r"^(yes|partial|no)$")
    communication_ok: bool = True
    correct_address: bool = True
    score: float = Field(..., ge=0, le=5)


class ArtisanRatingOut(BaseModel):
    """Response schema for artisan rating."""
    id: str
    booking_id: str
    goods_condition_ok: bool
    on_time: str
    communication_ok: bool
    correct_address: bool
    score: float
    created_at: datetime

    class Config:
        from_attributes = True
