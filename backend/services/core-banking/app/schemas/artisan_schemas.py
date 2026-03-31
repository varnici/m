from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class ArtisanCreate(BaseModel):
    user_id: str
    trade_category: str
    years_experience: int = 0
    service_area: str | None = None
    estate: str | None = None
    city: str | None = None
    latitude: float | None = None
    longitude: float | None = None


class ArtisanOut(BaseModel):
    id: str
    user_id: str
    trade_category: str
    years_experience: int
    service_area: str | None
    estate: str | None
    city: str | None
    latitude: float | None
    longitude: float | None
    rating: float
    rating_count: int
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class ArtisanBookingCreate(BaseModel):
    artisan_id: str
    client_user_id: str
    service_category: str
    problem_description: str
    address: str
    scheduled_at: datetime | None = None


class ArtisanBookingOut(BaseModel):
    id: str
    artisan_id: str
    client_user_id: str
    service_category: str
    problem_description: str
    address: str
    scheduled_at: datetime | None
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class ArtisanRatingCreate(BaseModel):
    booking_id: str
    goods_condition_ok: bool = True
    on_time: str = "yes"  # yes/partial/no
    communication_ok: bool = True
    correct_address: bool = True


class ArtisanRatingOut(BaseModel):
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

