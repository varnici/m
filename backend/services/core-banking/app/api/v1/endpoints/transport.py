from __future__ import annotations

import json
import math

from fastapi import APIRouter, HTTPException
from sqlalchemy import select

from app.infrastructure.database import db_session
from app.models.transport import BookingTrackingPoint, DriverProfile, TransportBooking
from app.schemas.transport_schemas import (
    AssignDriverPayload,
    DriverLocationUpdate,
    DriverProfileCreate,
    DriverProfileOut,
    TrackingPointOut,
    TransportBookingCreate,
    TransportBookingOut,
    VALID_VEHICLE_TYPES,
)
from app.services.geofence_service import GeofenceService

router = APIRouter()
geofence = GeofenceService()


def _distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371.0
    p1 = math.radians(lat1)
    p2 = math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return r * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _delivery_fee_kobo(vehicle_type: str, distance_km: float, weight_kg: float) -> int:
    # Nigeria-focused simple pricing baseline for MVP
    base = {
        "motorcycle": 80000,
        "car": 150000,
        "bus": 250000,
        "truck": 500000,
    }[vehicle_type]
    distance_component = int(distance_km * 12000)
    weight_component = int(weight_kg * 1500)
    return base + distance_component + weight_component


@router.post("/drivers", response_model=DriverProfileOut)
def register_driver(payload: DriverProfileCreate):
    if payload.vehicle_type not in VALID_VEHICLE_TYPES:
        raise HTTPException(status_code=400, detail="Invalid vehicle_type. Use motorcycle, car, bus, or truck.")

    with db_session() as db:
        existing = db.execute(select(DriverProfile).where(DriverProfile.user_id == payload.user_id)).scalars().first()
        if existing:
            raise HTTPException(status_code=400, detail="Driver profile already exists for this user")

        profile = DriverProfile(
            user_id=payload.user_id,
            full_name=payload.full_name,
            phone=payload.phone,
            vehicle_type=payload.vehicle_type,
            vehicle_plate=payload.vehicle_plate,
            certifications_json=json.dumps(payload.certifications),
        )
        db.add(profile)
        db.flush()
        return profile


@router.get("/drivers/{user_id}", response_model=DriverProfileOut)
def get_driver_profile(user_id: str):
    with db_session() as db:
        profile = db.execute(select(DriverProfile).where(DriverProfile.user_id == user_id)).scalars().first()
        if not profile:
            raise HTTPException(status_code=404, detail="Driver profile not found")
        return profile


@router.post("/drivers/{user_id}/activate", response_model=DriverProfileOut)
def activate_driver(user_id: str):
    with db_session() as db:
        profile = db.execute(select(DriverProfile).where(DriverProfile.user_id == user_id)).scalars().first()
        if not profile:
            raise HTTPException(status_code=404, detail="Driver profile not found")
        profile.nin_verified = True
        profile.vehicle_docs_verified = True
        profile.is_active = True
        db.flush()
        return profile


@router.post("/bookings", response_model=TransportBookingOut)
def create_transport_booking(payload: TransportBookingCreate):
    if payload.vehicle_type not in VALID_VEHICLE_TYPES:
        raise HTTPException(status_code=400, detail="Invalid vehicle_type. Use motorcycle, car, bus, or truck.")

    # Lagos bike-ban enforcement for motorcycle
    if payload.vehicle_type == "motorcycle":
        pickup_banned = geofence.is_in_bike_ban_zone(payload.pickup_lat, payload.pickup_lng)
        delivery_banned = geofence.is_in_bike_ban_zone(payload.delivery_lat, payload.delivery_lng)
        if pickup_banned or delivery_banned:
            raise HTTPException(status_code=400, detail="Motorcycle not allowed in this zone. Choose car, bus, or truck.")

    distance_km = _distance_km(payload.pickup_lat, payload.pickup_lng, payload.delivery_lat, payload.delivery_lng)
    fee_kobo = _delivery_fee_kobo(payload.vehicle_type, distance_km, payload.item_weight_kg)

    with db_session() as db:
        booking = TransportBooking(
            client_user_id=payload.client_user_id,
            vehicle_type=payload.vehicle_type,
            pickup_address=payload.pickup_address,
            pickup_lat=payload.pickup_lat,
            pickup_lng=payload.pickup_lng,
            delivery_address=payload.delivery_address,
            delivery_lat=payload.delivery_lat,
            delivery_lng=payload.delivery_lng,
            item_description=payload.item_description,
            item_weight_kg=payload.item_weight_kg,
            declared_goods_value_kobo=payload.declared_goods_value_kobo,
            delivery_fee_kobo=fee_kobo,
            status="pending",
        )
        db.add(booking)
        db.flush()
        return booking


@router.get("/bookings/{booking_id}", response_model=TransportBookingOut)
def get_transport_booking(booking_id: str):
    with db_session() as db:
        booking = db.get(TransportBooking, booking_id)
        if not booking:
            raise HTTPException(status_code=404, detail="Booking not found")
        return booking


@router.post("/bookings/{booking_id}/assign", response_model=TransportBookingOut)
def assign_driver_to_booking(booking_id: str, payload: AssignDriverPayload):
    with db_session() as db:
        booking = db.get(TransportBooking, booking_id)
        if not booking:
            raise HTTPException(status_code=404, detail="Booking not found")
        if booking.status != "pending":
            raise HTTPException(status_code=400, detail="Booking is not pending")

        driver = db.execute(select(DriverProfile).where(DriverProfile.user_id == payload.driver_user_id)).scalars().first()
        if not driver:
            raise HTTPException(status_code=404, detail="Driver profile not found")
        if not driver.is_active:
            raise HTTPException(status_code=400, detail="Driver is not active")
        if driver.vehicle_type != booking.vehicle_type:
            raise HTTPException(status_code=400, detail="Driver vehicle type does not match booking vehicle type")

        booking.driver_user_id = payload.driver_user_id
        booking.status = "matched"
        db.flush()
        return booking


@router.post("/bookings/{booking_id}/tracking", response_model=TrackingPointOut)
def update_booking_tracking(booking_id: str, payload: DriverLocationUpdate, driver_user_id: str):
    """
    User tracking for agreed transport:
    only the assigned driver can push tracking points for this booking.
    """
    with db_session() as db:
        booking = db.get(TransportBooking, booking_id)
        if not booking:
            raise HTTPException(status_code=404, detail="Booking not found")
        if booking.driver_user_id != driver_user_id:
            raise HTTPException(status_code=403, detail="Only assigned driver can update tracking")
        if booking.status not in {"matched", "in_transit"}:
            raise HTTPException(status_code=400, detail="Tracking not allowed in current booking status")

        booking.status = "in_transit"
        point = BookingTrackingPoint(
            booking_id=booking.id,
            driver_user_id=driver_user_id,
            lat=payload.lat,
            lng=payload.lng,
        )
        db.add(point)
        db.flush()
        return point


@router.get("/bookings/{booking_id}/tracking", response_model=list[TrackingPointOut])
def get_booking_tracking(booking_id: str):
    with db_session() as db:
        booking = db.get(TransportBooking, booking_id)
        if not booking:
            raise HTTPException(status_code=404, detail="Booking not found")
        q = (
            select(BookingTrackingPoint)
            .where(BookingTrackingPoint.booking_id == booking_id)
            .order_by(BookingTrackingPoint.created_at.asc())
        )
        return list(db.execute(q).scalars().all())

