"""
VentureRoot — Transport Service
Handles: bookings, provider matching, geofencing, VOC ratings, transit insurance
"""

from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import Optional
import math

from .core.config import settings
from .models.booking  import Booking, BookingStatus
from .models.provider import Provider, ProviderBadge
from .schemas.transport_schemas import (
    BookingCreate, BookingResponse,
    QuoteRequest, QuoteResponse,
    VocSubmit, VocResponse,
    ProviderRegister, ProviderResponse,
    LocationUpdate,
)
from .services.matching_engine  import MatchingEngine
from .services.geofence_service import GeofenceService
from .services.voc_engine        import VoteOfConfidenceEngine
from .services.insurance_service import TransitInsuranceService
from ..infrastructure.database  import get_db

app = FastAPI(title="VentureRoot Transport Service", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

matcher   = MatchingEngine()
geofence  = GeofenceService()
voc_engine = VoteOfConfidenceEngine()
insurance = TransitInsuranceService()


# ── Quote ─────────────────────────────────────────────────────────────────────

@app.post("/transport/quote", response_model=QuoteResponse)
async def get_quote(req: QuoteRequest, db: Session = Depends(get_db)):
    """
    Returns pricing estimate and vehicle tier recommendation.
    Automatically excludes bikes from Lagos ban zones.
    """
    # Geofence check: are pickup or delivery in a bike-ban zone?
    pickup_banned   = geofence.is_in_bike_ban_zone(req.pickup_lat, req.pickup_lng)
    delivery_banned = geofence.is_in_bike_ban_zone(req.delivery_lat, req.delivery_lng)
    bike_eligible = not (pickup_banned or delivery_banned)

    tier = matcher.recommend_tier(
        weight_kg=req.weight_kg,
        distance_km=_haversine(req.pickup_lat, req.pickup_lng, req.delivery_lat, req.delivery_lng),
        bike_eligible=bike_eligible,
    )

    base_fee = matcher.calculate_base_fee(tier, req.weight_kg,
        _haversine(req.pickup_lat, req.pickup_lng, req.delivery_lat, req.delivery_lng))

    insurance_premium = insurance.calculate_premium(req.declared_value)

    available = matcher.count_available_providers(tier, req.pickup_lat, req.pickup_lng, db)

    return QuoteResponse(
        tier=tier,
        fee=base_fee,
        insurance_premium=insurance_premium,
        total=base_fee + insurance_premium,
        available_providers=available,
        bike_eligible=bike_eligible,
    )


# ── Bookings ──────────────────────────────────────────────────────────────────

@app.post("/transport/bookings", response_model=BookingResponse)
async def create_booking(
    payload: BookingCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id),
):
    """
    Creates a booking, holds payment in escrow, notifies matched providers.
    Payment is HELD — released only on confirmed delivery.
    """
    # Validate geofence
    if geofence.is_in_bike_ban_zone(payload.pickup_lat, payload.pickup_lng) or \
       geofence.is_in_bike_ban_zone(payload.delivery_lat, payload.delivery_lng):
        if payload.vehicle_tier == "dispatch_bike":
            raise HTTPException(400, "Bikes are not permitted in this zone. Please select a higher tier.")

    # Calculate final amounts
    base_fee = matcher.calculate_base_fee(
        payload.vehicle_tier, payload.item_weight_kg,
        _haversine(payload.pickup_lat, payload.pickup_lng, payload.delivery_lat, payload.delivery_lng),
    )
    insurance_premium = insurance.calculate_premium(payload.declared_goods_value)

    booking = Booking(
        client_id=current_user_id,
        vehicle_tier=payload.vehicle_tier,
        pickup_address=payload.pickup_address,
        pickup_lat=payload.pickup_lat, pickup_lng=payload.pickup_lng,
        delivery_address=payload.delivery_address,
        delivery_lat=payload.delivery_lat, delivery_lng=payload.delivery_lng,
        item_description=payload.item_description,
        item_weight_kg=payload.item_weight_kg,
        declared_goods_value=payload.declared_goods_value,
        delivery_fee=base_fee,
        insurance_premium=insurance_premium,
        total_charge=base_fee + insurance_premium,
        status=BookingStatus.PENDING,
    )
    db.add(booking)
    db.commit()
    db.refresh(booking)

    # Background: deduct from wallet escrow + notify nearby providers
    background_tasks.add_task(hold_escrow, booking.id, booking.total_charge, current_user_id)
    background_tasks.add_task(notify_providers, booking, db)

    return booking


@app.get("/transport/bookings/{booking_id}", response_model=BookingResponse)
async def get_booking(booking_id: str, db: Session = Depends(get_db)):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(404, "Booking not found")
    return booking


@app.get("/transport/bookings/mine", response_model=list[BookingResponse])
async def get_my_bookings(
    db: Session = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id),
):
    return db.query(Booking).filter(Booking.client_id == current_user_id)\
        .order_by(Booking.created_at.desc()).all()


@app.post("/transport/bookings/{booking_id}/accept", response_model=BookingResponse)
async def accept_booking(
    booking_id: str,
    db: Session = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id),
):
    """Provider accepts a matched booking."""
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking or booking.status != BookingStatus.PENDING:
        raise HTTPException(400, "Booking not available for acceptance")

    # Check provider rating — below 3.5 cannot be assigned
    provider = db.query(Provider).filter(Provider.user_id == current_user_id).first()
    if not provider or provider.rating < 3.5:
        raise HTTPException(403, "Your current rating does not qualify for new bookings")

    booking.provider_id = current_user_id
    booking.status = BookingStatus.MATCHED
    db.commit()
    db.refresh(booking)
    return booking


@app.get("/transport/bookings/{booking_id}/track")
async def track_booking(booking_id: str, db: Session = Depends(get_db)):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(404, "Booking not found")
    return {"lat": booking.tracking_lat, "lng": booking.tracking_lng, "updated_at": booking.tracking_updated_at}


@app.post("/transport/bookings/{booking_id}/confirm", response_model=BookingResponse)
async def confirm_delivery(
    booking_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id),
):
    """Client confirms receipt — releases escrow to provider."""
    booking = db.query(Booking).filter(
        Booking.id == booking_id,
        Booking.client_id == current_user_id,
    ).first()
    if not booking or booking.status != BookingStatus.IN_TRANSIT:
        raise HTTPException(400, "Cannot confirm at this stage")

    if not booking.delivery_photo_url:
        raise HTTPException(400, "Delivery photo not yet uploaded by provider")

    booking.status = BookingStatus.CONFIRMED
    db.commit()

    # Release escrow to provider
    background_tasks.add_task(release_escrow, booking.id, booking.provider_id, booking.delivery_fee)
    # Pay insurance commission
    background_tasks.add_task(settle_insurance_premium, booking.id, booking.insurance_premium)

    return booking


# ── Vote of Confidence ────────────────────────────────────────────────────────

@app.post("/transport/bookings/{booking_id}/voc", response_model=VocResponse)
async def submit_voc(
    booking_id: str,
    payload: VocSubmit,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id),
):
    """
    Weighted binary VOC:
      goods_condition 40% | on_time 30% | communication 20% | correct_delivery 10%
    Includes outlier protection: anomaly flag for provider with 4.5+ avg getting < 2.0
    """
    booking = db.query(Booking).filter(
        Booking.id == booking_id,
        Booking.client_id == current_user_id,
    ).first()
    if not booking or booking.status != BookingStatus.CONFIRMED:
        raise HTTPException(400, "VOC can only be submitted after confirmed delivery")

    score = voc_engine.calculate_score(
        goods_condition=payload.goods_condition,
        on_time=payload.on_time,
        communication=payload.communication,
        correct_delivery=payload.correct_delivery,
    )

    provider = db.query(Provider).filter(Provider.user_id == booking.provider_id).first()

    # Outlier protection: flag anomalous negative ratings
    is_anomaly = (provider.rating >= 4.5 and score < 2.0)

    if not is_anomaly:
        new_rating = voc_engine.update_provider_rating(
            current_rating=provider.rating,
            total_jobs=provider.total_jobs,
            new_score=score,
        )
        provider.rating = new_rating
        provider.total_jobs += 1

        # Update badge based on new rating
        provider.badge = _get_badge(new_rating)
        db.commit()
    else:
        # Quarantine for 48h manual review
        background_tasks.add_task(flag_anomalous_rating, booking_id, score, provider.user_id)

    return VocResponse(
        score=score,
        provider_new_rating=provider.rating,
        is_anomaly=is_anomaly,
    )


# ── Provider Management ───────────────────────────────────────────────────────

@app.post("/transport/providers/register", response_model=ProviderResponse)
async def register_provider(
    payload: ProviderRegister,
    db: Session = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id),
):
    existing = db.query(Provider).filter(Provider.user_id == current_user_id).first()
    if existing:
        raise HTTPException(400, "Already registered as a provider")

    provider = Provider(
        user_id=current_user_id,
        full_name=payload.full_name,
        phone=payload.phone,
        vehicle_tier=payload.vehicle_tier,
        vehicle_plate=payload.vehicle_plate,
        nin_verified=False,  # triggered separately via KYC service
        guarantor_verified=False,
        rating=0.0,
        total_jobs=0,
        is_active=False,  # activated after NIN + guarantor verification
        is_online=False,
        badge=ProviderBadge.STANDARD,
    )
    db.add(provider)
    db.commit()
    db.refresh(provider)
    return provider


@app.put("/transport/providers/me/online")
async def set_online_status(
    payload: dict,
    db: Session = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id),
):
    provider = db.query(Provider).filter(Provider.user_id == current_user_id).first()
    if not provider:
        raise HTTPException(404, "Provider profile not found")
    provider.is_online = payload.get("is_online", False)
    db.commit()
    return {"status": "updated"}


@app.put("/transport/providers/me/location")
async def update_location(
    payload: LocationUpdate,
    db: Session = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id),
):
    provider = db.query(Provider).filter(Provider.user_id == current_user_id).first()
    if not provider:
        raise HTTPException(404, "Provider profile not found")
    provider.current_lat = payload.lat
    provider.current_lng = payload.lng

    # Also update tracking on any active booking
    active_booking = db.query(Booking).filter(
        Booking.provider_id == current_user_id,
        Booking.status.in_([BookingStatus.MATCHED, BookingStatus.AT_PICKUP, BookingStatus.IN_TRANSIT]),
    ).first()
    if active_booking:
        active_booking.tracking_lat = payload.lat
        active_booking.tracking_lng = payload.lng

    db.commit()
    return {"status": "updated"}


# ── Helpers ───────────────────────────────────────────────────────────────────

def _haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Distance in km between two GPS coordinates."""
    R = 6371
    φ1, φ2 = math.radians(lat1), math.radians(lat2)
    Δφ = math.radians(lat2 - lat1)
    Δλ = math.radians(lon2 - lon1)
    a = math.sin(Δφ/2)**2 + math.cos(φ1) * math.cos(φ2) * math.sin(Δλ/2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _get_badge(rating: float) -> ProviderBadge:
    if rating >= 4.5: return ProviderBadge.ELITE
    if rating >= 4.0: return ProviderBadge.VERIFIED
    if rating >= 3.5: return ProviderBadge.STANDARD
    if rating >= 3.0: return ProviderBadge.UNDER_REVIEW
    return ProviderBadge.SUSPENDED


async def hold_escrow(booking_id: str, amount: float, user_id: str): ...
async def release_escrow(booking_id: str, provider_id: str, amount: float): ...
async def settle_insurance_premium(booking_id: str, premium: float): ...
async def notify_providers(booking: Booking, db: Session): ...
async def flag_anomalous_rating(booking_id: str, score: float, provider_id: str): ...


def get_current_user_id() -> str:
    """JWT token extraction — implemented in api-gateway middleware."""
    ...