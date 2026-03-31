from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import and_, select

from app.infrastructure.database import db_session
from app.models.artisan import Artisan, ArtisanBooking, ArtisanRating
from app.schemas.artisan_schemas import (
    ArtisanBookingCreate,
    ArtisanBookingOut,
    ArtisanCreate,
    ArtisanOut,
    ArtisanRatingCreate,
    ArtisanRatingOut,
)

router = APIRouter()


@router.post("", response_model=ArtisanOut)
def register_artisan(payload: ArtisanCreate):
    with db_session() as db:
        artisan = Artisan(
            user_id=payload.user_id,
            trade_category=payload.trade_category,
            years_experience=payload.years_experience,
            service_area=payload.service_area,
            estate=payload.estate,
            city=payload.city,
            latitude=payload.latitude,
            longitude=payload.longitude,
        )
        db.add(artisan)
        db.flush()
        return artisan


@router.get("", response_model=list[ArtisanOut])
def list_artisans(
    trade_category: str | None = Query(None),
    estate: str | None = Query(None),
    city: str | None = Query(None),
):
    with db_session() as db:
        conds = [Artisan.status != "suspended"]
        if trade_category:
            conds.append(Artisan.trade_category == trade_category)
        if estate:
            conds.append(Artisan.estate == estate)
        elif city:
            conds.append(Artisan.city == city)

        q = select(Artisan).where(and_(*conds)).order_by(Artisan.rating.desc())
        return list(db.execute(q).scalars().all())


@router.post("/bookings", response_model=ArtisanBookingOut)
def create_booking(payload: ArtisanBookingCreate):
    with db_session() as db:
        artisan = db.get(Artisan, payload.artisan_id)
        if not artisan or artisan.status == "suspended":
            raise HTTPException(status_code=404, detail="Artisan not found")
        booking = ArtisanBooking(
            artisan_id=payload.artisan_id,
            client_user_id=payload.client_user_id,
            service_category=payload.service_category,
            problem_description=payload.problem_description,
            address=payload.address,
            scheduled_at=payload.scheduled_at,
        )
        db.add(booking)
        db.flush()
        return booking


@router.get("/bookings", response_model=list[ArtisanBookingOut])
def list_bookings(client_user_id: str):
    with db_session() as db:
        q = (
            select(ArtisanBooking)
            .where(ArtisanBooking.client_user_id == client_user_id)
            .order_by(ArtisanBooking.created_at.desc())
        )
        return list(db.execute(q).scalars().all())


def _compute_rating_score(goods_ok: bool, on_time: str, comm_ok: bool, correct_addr: bool) -> float:
    score = 0.0
    # Map to 0–5 as per weightings in doc (40/30/20/10)
    score += 2.0 if goods_ok else 0.0  # 40% of 5
    if on_time == "yes":
        score += 1.5
    elif on_time == "partial":
        score += 0.75
    score += 1.0 if comm_ok else 0.0
    score += 0.5 if correct_addr else 0.0
    return round(score, 2)


@router.post("/ratings", response_model=ArtisanRatingOut)
def rate_booking(payload: ArtisanRatingCreate):
    with db_session() as db:
        booking = db.get(ArtisanBooking, payload.booking_id)
        if not booking:
            raise HTTPException(status_code=404, detail="Booking not found")
        if booking.status != "completed":
            # allow rating only after completion
            raise HTTPException(status_code=400, detail="Cannot rate an incomplete booking")

        existing = db.execute(
            select(ArtisanRating).where(ArtisanRating.booking_id == payload.booking_id)
        ).scalars().first()
        if existing:
            raise HTTPException(status_code=400, detail="Booking already rated")

        score = _compute_rating_score(
            payload.goods_condition_ok,
            payload.on_time,
            payload.communication_ok,
            payload.correct_address,
        )

        rating = ArtisanRating(
            booking_id=payload.booking_id,
            goods_condition_ok=payload.goods_condition_ok,
            on_time=payload.on_time,
            communication_ok=payload.communication_ok,
            correct_address=payload.correct_address,
            score=score,
        )
        db.add(rating)

        artisan = booking.artisan
        # update aggregate rating
        total = artisan.rating * artisan.rating_count + score
        artisan.rating_count += 1
        artisan.rating = total / artisan.rating_count

        db.flush()
        return rating

