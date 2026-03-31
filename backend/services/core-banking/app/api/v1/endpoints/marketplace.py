from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import and_, select

from app.infrastructure.database import db_session
from app.models.marketplace import Listing, Product
from app.schemas.marketplace_schemas import (
    ListingCreate,
    ListingOut,
    NearbyListingsQuery,
    ProductCreate,
    ProductOut,
)

router = APIRouter()


def _generate_slug(name: str, product_id: str) -> str:
    base = "-".join(name.lower().split())
    short_id = product_id.split("-", 1)[0]
    return f"{base}-{short_id}"


@router.post("/products", response_model=ProductOut)
def create_product(owner_id: str, payload: ProductCreate):
    with db_session() as db:
        product = Product(
            owner_id=owner_id,
            name=payload.name,
            description=payload.description,
            sku=payload.sku,
            category=payload.category,
            unit_price_kobo=payload.unit_price_kobo,
            estate=payload.estate,
            city=payload.city,
            latitude=payload.latitude,
            longitude=payload.longitude,
        )
        db.add(product)
        db.flush()
        return product


@router.get("/products", response_model=list[ProductOut])
def list_my_products(owner_id: str):
    with db_session() as db:
        q = select(Product).where(Product.owner_id == owner_id, Product.is_active.is_(True))
        return list(db.execute(q).scalars().all())


@router.post("/listings", response_model=ListingOut)
def create_listing(payload: ListingCreate):
    with db_session() as db:
        product = db.get(Product, payload.product_id)
        if not product or not product.is_active:
            raise HTTPException(status_code=404, detail="Product not found")
        listing = Listing(
            product_id=product.id,
            price_kobo=payload.price_kobo,
            available_quantity=payload.available_quantity,
            slug=_generate_slug(product.name, product.id),
        )
        db.add(listing)
        db.flush()
        return listing


@router.get("/listings/nearby", response_model=list[ListingOut])
def list_nearby_listings(
    estate: str | None = Query(None),
    city: str | None = Query(None),
):
    """
    Simple geo-personalised marketplace:
    - If estate provided, match by estate.
    - Else if city provided, match by city.
    - Else return empty list.
    """
    with db_session() as db:
        if estate:
            cond = and_(Product.estate == estate, Listing.is_active.is_(True))
        elif city:
            cond = and_(Product.city == city, Listing.is_active.is_(True))
        else:
            return []

        q = (
            select(Listing)
            .join(Product, Listing.product_id == Product.id)
            .where(cond)
            .order_by(Listing.created_at.desc())
        )
        return list(db.execute(q).scalars().all())


@router.get("/shopfront/{slug}", response_model=ListingOut)
def get_shopfront_listing(slug: str):
    """
    Public Virtual Shopfront entrypoint for a single listing.
    """
    with db_session() as db:
        q = select(Listing).where(Listing.slug == slug, Listing.is_active.is_(True))
        listing = db.execute(q).scalars().first()
        if not listing:
            raise HTTPException(status_code=404, detail="Listing not found")
        return listing

