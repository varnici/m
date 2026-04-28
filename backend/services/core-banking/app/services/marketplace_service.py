from __future__ import annotations

import logging
from typing import List, Optional
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models import Product, Listing
from app.schemas.inventory_schemas import ListingCreate, ListingUpdate, ListingOut, MarketplaceProductOut

logger = logging.getLogger(__name__)


class MarketplaceService:
    """
    Service for managing marketplace listings and public product views.
    Extracted from InventoryServiceV2 to adhere to SRP.
    """

    def __init__(self, db: Session, owner_id: str):
        self.db = db
        self.owner_id = owner_id

    def create_listing(self, payload: ListingCreate) -> ListingOut:
        product = self.db.query(Product).filter(
            Product.id == payload.product_id,
            Product.owner_id == self.owner_id
        ).first()
        if not product:
            raise ValueError(f"Product {payload.product_id} not found")

        existing = self.db.query(Listing).filter(Listing.product_id == payload.product_id).first()
        if existing:
            raise ValueError(f"Listing already exists for product {payload.product_id}")

        listing = Listing(
            product_id=payload.product_id,
            price_kobo=payload.price_kobo,
            available_quantity=payload.available_quantity,
            slug=payload.slug,
            is_active=payload.is_active
        )
        self.db.add(listing)
        self.db.commit()
        self.db.refresh(listing)
        return ListingOut.model_validate(listing)

    def update_listing(self, listing_id: str, payload: ListingUpdate) -> ListingOut:
        listing = self.db.query(Listing).join(Product).filter(
            Listing.id == listing_id,
            Product.owner_id == self.owner_id
        ).first()
        if not listing:
            raise ValueError(f"Listing {listing_id} not found")

        for field, value in payload.model_dump(exclude_unset=True).items():
            setattr(listing, field, value)

        self.db.commit()
        self.db.refresh(listing)
        return ListingOut.model_validate(listing)

    def get_marketplace_products(
        self,
        category_id: Optional[str] = None,
        search: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[MarketplaceProductOut]:
        """Get all active marketplace products (public view)."""
        query = self.db.query(Product, Listing).join(Listing, Product.id == Listing.product_id).filter(
            Listing.is_active == True,
            Product.is_active == True
        )

        if category_id:
            query = query.filter(Product.category_id == category_id)
        
        if search:
            search_term = f"%{search}%"
            query = query.filter(or_(
                Product.name.ilike(search_term),
                Product.description.ilike(search_term)
            ))

        results = query.order_by(Listing.created_at.desc()).offset(skip).limit(limit).all()
        
        marketplace_products = []
        for product, listing in results:
            p_out = MarketplaceProductOut.model_validate(product)
            p_out.listing_id = listing.id
            p_out.marketplace_price_kobo = listing.price_kobo
            p_out.marketplace_available_quantity = listing.available_quantity
            p_out.marketplace_slug = listing.slug
            marketplace_products.append(p_out)
            
        return marketplace_products