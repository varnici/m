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
        category_id = None
        if payload.category:
            from app.models.inventory import Category
            slug = payload.category.lower().replace(" ", "-")
            category = db.query(Category).filter(
                Category.owner_id == owner_id,
                Category.slug == slug
            ).first()
            if not category:
                category = Category(
                    owner_id=owner_id,
                    name=payload.category,
                    slug=slug
                )
                db.add(category)
                db.flush()
            category_id = category.id

        product = Product(
            owner_id=owner_id,
            name=payload.name,
            description=payload.description,
            sku=payload.sku,
            category_id=category_id,
            selling_price_kobo=payload.unit_price_kobo,
            cost_price_kobo=payload.unit_price_kobo,
            unit_price_kobo=payload.unit_price_kobo,
            estate=payload.estate,
            city=payload.city,
            latitude=payload.latitude,
            longitude=payload.longitude,
        )
        db.add(product)
        db.flush()
        
        # Build serializable dictionary while session is open to avoid DetachedInstanceError
        category_name = product.category.name if product.category else None
        return {
            "id": product.id,
            "owner_id": product.owner_id,
            "name": product.name,
            "description": product.description,
            "sku": product.sku,
            "category": category_name,
            "unit_price_kobo": product.selling_price_kobo,
            "estate": product.estate,
            "city": product.city,
            "latitude": product.latitude,
            "longitude": product.longitude,
            "is_active": product.is_active,
            "created_at": product.created_at,
        }


@router.get("/products", response_model=list[ProductOut])
def list_my_products(owner_id: str):
    with db_session() as db:
        q = select(Product).where(Product.owner_id == owner_id, Product.is_active.is_(True))
        products = db.execute(q).scalars().all()
        return [
            {
                "id": p.id,
                "owner_id": p.owner_id,
                "name": p.name,
                "description": p.description,
                "sku": p.sku,
                "category": p.category.name if p.category else None,
                "unit_price_kobo": p.selling_price_kobo,
                "estate": p.estate,
                "city": p.city,
                "latitude": p.latitude,
                "longitude": p.longitude,
                "is_active": p.is_active,
                "created_at": p.created_at,
            }
            for p in products
        ]



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

