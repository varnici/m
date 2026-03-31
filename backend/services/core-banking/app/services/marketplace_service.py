"""
VentureRoot — Marketplace Service
Public shopfronts, in-app marketplace, geo-personalisation,
flash sales, group buying aggregation, B2B sub-distribution.
"""

from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime, timedelta
import math

from .core.config import settings
from .models.listing import Listing, ListingStatus
from .models.order   import Order, OrderStatus
from .models.group_buy import GroupBuy, GroupBuyMember
from .services.geo_service import GeoService
from .infrastructure.database import get_db

app = FastAPI(title="VentureRoot Marketplace Service", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

geo = GeoService()

# Conversion guest → registered user prompt shown after first guest purchase
GUEST_CONVERT_PROMPT = "Join VentureRoot to track orders, get stock alerts, and access wholesale prices."


# ── Schemas ───────────────────────────────────────────────────────────────────

class ListingCreate(BaseModel):
    product_name: str
    sku: str
    category: str
    description: str
    image_urls: list[str]
    price_per_unit: float
    b2b_price_per_unit: Optional[float] = None
    quantity_available: int
    minimum_order_quantity: int = 1
    fulfilment_options: list[str]
    location_estate_id: str
    location_city: str
    bundle_offers: Optional[list[dict]] = None

class OrderCreate(BaseModel):
    listing_id: str
    quantity: int
    fulfilment_option: str   # 'collection' | 'seller_delivery' | 'platform_logistics'
    delivery_address: Optional[str] = None
    is_guest: bool = False
    guest_phone: Optional[str] = None

class FlashSaleRequest(BaseModel):
    flash_price: float
    duration_hours: int


# ── Listings ──────────────────────────────────────────────────────────────────

@app.get("/marketplace/listings")
async def get_listings(
    city:     Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    lat:      Optional[float] = Query(None),
    lng:      Optional[float] = Query(None),
    page:     int = Query(1),
    limit:    int = Query(20),
    b2b_only: bool = Query(False),
    db: Session = Depends(get_db),
    user_id: Optional[str] = Depends(get_current_user_id_optional),
):
    """
    Geo-personalised listing feed.
    Default: shows closest listings first.
    Registered users: personalised via purchase history + savings goals.
    Flash sales: pinned to top of feed for 24h.
    """
    query = db.query(Listing).filter(Listing.is_active == True)

    if city:
        query = query.filter(Listing.location_city == city)
    if category:
        query = query.filter(Listing.category == category)
    if b2b_only:
        query = query.filter(Listing.b2b_price_per_unit.isnot(None))

    # Flash sales first
    now = datetime.utcnow()
    active_flash = query.filter(
        Listing.flash_sale_ends_at > now,
        Listing.flash_sale_ends_at.isnot(None),
    ).all()
    regular = query.filter(
        (Listing.flash_sale_ends_at.is_(None)) | (Listing.flash_sale_ends_at <= now)
    ).all()

    # Attach distance if coordinates provided
    all_listings = active_flash + regular
    if lat and lng:
        for listing in all_listings:
            listing.distance_km = _haversine(lat, lng, listing.location_lat, listing.location_lng)
        # Sort regular listings by distance (flash sales stay pinned)
        regular.sort(key=lambda l: l.distance_km or 9999)

    combined = active_flash + regular
    start = (page - 1) * limit
    return {"items": combined[start:start + limit], "total": len(combined)}


@app.get("/marketplace/listings/{listing_id}")
async def get_listing(listing_id: str, db: Session = Depends(get_db)):
    listing = db.query(Listing).filter(Listing.id == listing_id, Listing.is_active == True).first()
    if not listing:
        raise HTTPException(404, "Listing not found")
    return listing


@app.post("/marketplace/listings")
async def create_listing(
    payload: ListingCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """
    Creating a listing auto-generates the Virtual Shopfront link.
    Price is validated against platform market average.
    """
    # Validate price against platform average
    price_validation = await _validate_listing_price(payload.sku, payload.price_per_unit)

    listing = Listing(
        seller_id=user_id,
        **payload.dict(),
        status=ListingStatus.ACTIVE,
        is_active=True,
        shopfront_url=f"https://shop.ventureroot.ng/{user_id}",
    )
    db.add(listing)
    db.commit()
    db.refresh(listing)

    # Update sales velocity tracking — listing = business activity signal
    background_tasks.add_task(_update_velocity_signal, user_id, "listing_created")

    return {
        **listing.__dict__,
        "shopfront_url": listing.shopfront_url,
        "price_suggestion": price_validation.get("suggestion"),
    }


@app.put("/marketplace/listings/{listing_id}")
async def update_listing(
    listing_id: str,
    payload: dict,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    listing = db.query(Listing).filter(
        Listing.id == listing_id,
        Listing.seller_id == user_id,
    ).first()
    if not listing:
        raise HTTPException(404, "Listing not found or access denied")
    for k, v in payload.items():
        if hasattr(listing, k):
            setattr(listing, k, v)
    db.commit()
    db.refresh(listing)
    return listing


@app.post("/marketplace/listings/{listing_id}/flash-sale")
async def start_flash_sale(
    listing_id: str,
    payload: FlashSaleRequest,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """
    Flash sales: time-limited promotions for clearing slow-moving stock.
    Pinned prominently in the feed for 24h with countdown timer.
    """
    listing = db.query(Listing).filter(
        Listing.id == listing_id,
        Listing.seller_id == user_id,
    ).first()
    if not listing:
        raise HTTPException(404, "Listing not found or access denied")
    if payload.flash_price >= listing.price_per_unit:
        raise HTTPException(400, "Flash sale price must be below regular price")
    if payload.duration_hours > 24:
        raise HTTPException(400, "Flash sale duration cannot exceed 24 hours")

    listing.flash_sale_price    = payload.flash_price
    listing.flash_sale_ends_at  = datetime.utcnow() + timedelta(hours=payload.duration_hours)
    db.commit()
    db.refresh(listing)
    return listing


# ── Orders ────────────────────────────────────────────────────────────────────

@app.post("/marketplace/orders")
async def create_order(
    payload: OrderCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    user_id: Optional[str] = Depends(get_current_user_id_optional),
):
    """
    Supports both registered users and guest buyers.
    Guest: phone only required. After purchase, prompt to register.
    Payment held in escrow until delivery/collection confirmed.
    """
    listing = db.query(Listing).filter(
        Listing.id == payload.listing_id,
        Listing.is_active == True,
    ).first()
    if not listing:
        raise HTTPException(404, "Listing not found or no longer available")
    if listing.quantity_available < payload.quantity:
        raise HTTPException(400, f"Only {listing.quantity_available} units available")
    if payload.quantity < listing.minimum_order_quantity:
        raise HTTPException(400, f"Minimum order is {listing.minimum_order_quantity} units")

    # Determine effective price (flash sale or regular)
    now = datetime.utcnow()
    unit_price = (
        listing.flash_sale_price
        if listing.flash_sale_price and listing.flash_sale_ends_at and listing.flash_sale_ends_at > now
        else listing.price_per_unit
    )

    subtotal      = unit_price * payload.quantity
    delivery_fee  = await _calculate_delivery_fee(payload, listing)
    total_amount  = subtotal + delivery_fee

    order = Order(
        buyer_id=user_id or f"guest_{payload.guest_phone}",
        seller_id=listing.seller_id,
        listing_id=payload.listing_id,
        quantity=payload.quantity,
        unit_price=unit_price,
        subtotal=subtotal,
        delivery_fee=delivery_fee,
        total_amount=total_amount,
        fulfilment_option=payload.fulfilment_option,
        delivery_address=payload.delivery_address,
        status=OrderStatus.PENDING_PAYMENT,
        collection_qr_code=_generate_qr_code(payload.listing_id) if payload.fulfilment_option == "collection" else None,
    )
    db.add(order)

    # Reserve inventory
    listing.quantity_available -= payload.quantity
    db.commit()
    db.refresh(order)

    # Background: initiate payment hold, notify seller, book platform logistics if selected
    background_tasks.add_task(_process_order_payment, order.id, total_amount, user_id or payload.guest_phone)
    background_tasks.add_task(_notify_seller, listing.seller_id, order)
    if payload.fulfilment_option == "platform_logistics":
        background_tasks.add_task(_book_platform_logistics, order.id, payload, listing)

    # Guest conversion prompt
    guest_prompt = GUEST_CONVERT_PROMPT if payload.is_guest else None

    return {**order.__dict__, "guest_join_prompt": guest_prompt}


@app.get("/marketplace/orders/mine")
async def get_my_orders(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    return db.query(Order).filter(Order.buyer_id == user_id).order_by(Order.created_at.desc()).all()


@app.get("/marketplace/orders/sold")
async def get_my_sales(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    return db.query(Order).filter(Order.seller_id == user_id).order_by(Order.created_at.desc()).all()


# ── Shopfront ─────────────────────────────────────────────────────────────────

@app.get("/marketplace/shopfront/{user_id}")
async def get_shopfront(user_id: str, db: Session = Depends(get_db)):
    """
    Public shopfront — accessible without login.
    Every business owner's Virtual Shopfront URL opens this.
    Guest purchases possible from here.
    """
    listings = db.query(Listing).filter(
        Listing.seller_id == user_id,
        Listing.is_active == True,
        Listing.quantity_available > 0,
    ).order_by(Listing.created_at.desc()).all()

    seller_info = await _get_seller_public_profile(user_id)

    return {
        "seller": seller_info,
        "listings": listings,
        "shopfront_url": f"https://shop.ventureroot.ng/{user_id}",
    }


@app.get("/marketplace/shopfront/analytics")
async def get_shopfront_analytics(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    return await _calculate_shopfront_analytics(user_id, db)


# ── Trending ──────────────────────────────────────────────────────────────────

@app.get("/marketplace/trending")
async def get_trending_in_area(
    lat: float = Query(...),
    lng: float = Query(...),
    radius_km: float = Query(5.0),
    db: Session = Depends(get_db),
):
    """
    Shows products selling fastest within the user's neighbourhood.
    Social proof mechanism — drives organic demand.
    """
    return await _get_trending_products(lat, lng, radius_km, db)


# ── Group Buying ──────────────────────────────────────────────────────────────

@app.post("/marketplace/group-buy")
async def create_group_buy(
    payload: dict,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """
    Community group buying — same demand aggregation as manufacturer pools,
    applied at community level. 10+ buyers → shared delivery at reduced price.
    """
    listing = db.query(Listing).filter(Listing.id == payload["listing_id"]).first()
    if not listing:
        raise HTTPException(404, "Listing not found")

    target_qty = payload.get("target_quantity", 10)
    group = GroupBuy(
        listing_id=payload["listing_id"],
        initiator_id=user_id,
        target_quantity=target_qty,
        current_quantity=0,
        group_price_per_unit=listing.price_per_unit * 0.90,  # 10% discount at target
        deadline=datetime.utcnow() + timedelta(hours=48),
        status="open",
    )
    db.add(group)
    db.commit()
    db.refresh(group)
    return group


@app.post("/marketplace/group-buy/{group_id}/join")
async def join_group_buy(
    group_id: str,
    payload: dict,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    group = db.query(GroupBuy).filter(GroupBuy.id == group_id, GroupBuy.status == "open").first()
    if not group:
        raise HTTPException(404, "Group buy not found or already closed")

    member = GroupBuyMember(group_id=group_id, user_id=user_id, quantity_committed=payload.get("quantity", 1))
    db.add(member)
    group.current_quantity += payload.get("quantity", 1)

    # Check if target reached — auto-trigger consolidated order
    if group.current_quantity >= group.target_quantity:
        group.status = "threshold_met"
        await _trigger_consolidated_group_order(group, db)

    db.commit()
    db.refresh(group)
    return group


# ── Helpers ───────────────────────────────────────────────────────────────────

def _haversine(lat1, lon1, lat2, lon2) -> float:
    R = 6371
    φ1, φ2 = math.radians(lat1), math.radians(lat2)
    Δφ = math.radians(lat2 - lat1)
    Δλ = math.radians(lon2 - lon1)
    a = math.sin(Δφ/2)**2 + math.cos(φ1)*math.cos(φ2)*math.sin(Δλ/2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

def _generate_qr_code(listing_id: str) -> str:
    return f"VR-COLLECT-{listing_id[:8].upper()}"

async def _validate_listing_price(sku: str, price: float) -> dict: ...
async def _calculate_delivery_fee(payload: OrderCreate, listing: Listing) -> float: ...
async def _process_order_payment(order_id: str, amount: float, payer_id: str): ...
async def _notify_seller(seller_id: str, order: Order): ...
async def _book_platform_logistics(order_id: str, payload: OrderCreate, listing: Listing): ...
async def _get_seller_public_profile(user_id: str) -> dict: ...
async def _calculate_shopfront_analytics(user_id: str, db: Session) -> dict: ...
async def _get_trending_products(lat: float, lng: float, radius_km: float, db: Session) -> list: ...
async def _trigger_consolidated_group_order(group: GroupBuy, db: Session): ...
async def _update_velocity_signal(user_id: str, event: str): ...

def get_current_user_id() -> str: ...
def get_current_user_id_optional() -> Optional[str]: ...