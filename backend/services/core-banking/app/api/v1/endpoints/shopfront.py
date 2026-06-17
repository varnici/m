"""
Virtual Shopfront — shareable storefront link per user.

Prefix: /v1/shopfront
Tags:   shopfront

Public endpoints (no auth): GET /{slug} — view storefront, POST /{slug}/order — place order
Private endpoints (authed): GET /me — get own shopfront config, PUT /me — update config
"""
from __future__ import annotations

import hashlib
import uuid
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import select, func, update
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.infrastructure.auth import get_current_user_id
from app.models.inventory import Product, StockLevel, Store, SalesTransaction, SalesTransactionItem
from app.models.user import User

router = APIRouter()


def _generate_slug(user_id: str) -> str:
    return hashlib.sha256(user_id.encode()).hexdigest()[:12]


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class ShopfrontProduct(BaseModel):
    product_id: str
    name: str
    description: Optional[str] = None
    unit_of_measure: str
    selling_price_kobo: int
    image_url: Optional[str] = None
    available_quantity: int
    category_name: Optional[str] = None


class ShopfrontView(BaseModel):
    slug: str
    store_name: str
    store_city: Optional[str] = None
    store_state: Optional[str] = None
    products: List[ShopfrontProduct]


class ShopfrontConfigOut(BaseModel):
    slug: str
    share_url: str
    is_active: bool
    product_count: int


class OrderItemIn(BaseModel):
    product_id: str
    quantity: int = Field(..., gt=0)


class OrderIn(BaseModel):
    customer_name: str
    customer_phone: str
    items: List[OrderItemIn] = Field(..., min_length=1)


class OrderOut(BaseModel):
    order_id: str
    total_amount_kobo: int
    item_count: int
    message: str


# ---------------------------------------------------------------------------
# Private: GET /shopfront/me
# ---------------------------------------------------------------------------

@router.get("/me", response_model=ShopfrontConfigOut)
def get_my_shopfront(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    store = db.execute(
        select(Store).where(Store.owner_id == user_id, Store.is_primary == True)
    ).scalars().first()

    if not store:
        store = db.execute(
            select(Store).where(Store.owner_id == user_id)
        ).scalars().first()

    slug = _generate_slug(user_id)
    product_count = 0

    if store:
        product_count = db.execute(
            select(func.count(Product.id)).where(
                Product.owner_id == user_id, Product.is_active == True
            )
        ).scalar() or 0

    return ShopfrontConfigOut(
        slug=slug,
        share_url=f"/shopfront/{slug}",
        is_active=store is not None,
        product_count=product_count,
    )


# ---------------------------------------------------------------------------
# Public: GET /shopfront/{slug}
# ---------------------------------------------------------------------------

@router.get("/{slug}", response_model=ShopfrontView)
def view_shopfront(slug: str, db: Session = Depends(get_db)):
    users = db.execute(select(User)).scalars().all()
    owner = None
    for u in users:
        if _generate_slug(u.id) == slug:
            owner = u
            break

    if not owner:
        raise HTTPException(status_code=404, detail="Shopfront not found")

    store = db.execute(
        select(Store).where(Store.owner_id == owner.id)
    ).scalars().first()

    store_name = store.name if store else (owner.trading_name or owner.business_name or "Shop")
    store_city = store.city if store else None
    store_state = store.state if store else None

    products_query = (
        select(Product, StockLevel.quantity_on_hand)
        .outerjoin(StockLevel, StockLevel.product_id == Product.id)
        .where(
            Product.owner_id == owner.id,
            Product.is_active == True,
        )
    )

    rows = db.execute(products_query).all()

    products = []
    seen = set()
    for product, qty in rows:
        if product.id in seen:
            continue
        seen.add(product.id)
        available = qty or 0
        if available <= 0:
            continue
        products.append(ShopfrontProduct(
            product_id=product.id,
            name=product.name,
            description=product.description,
            unit_of_measure=product.unit_of_measure,
            selling_price_kobo=product.selling_price_kobo,
            image_url=product.image_url,
            available_quantity=available,
        ))

    return ShopfrontView(
        slug=slug,
        store_name=store_name,
        store_city=store_city,
        store_state=store_state,
        products=products,
    )


# ---------------------------------------------------------------------------
# Public: POST /shopfront/{slug}/order
# ---------------------------------------------------------------------------

@router.post("/{slug}/order", response_model=OrderOut)
def place_order(slug: str, order: OrderIn, db: Session = Depends(get_db)):
    users = db.execute(select(User)).scalars().all()
    owner = None
    for u in users:
        if _generate_slug(u.id) == slug:
            owner = u
            break

    if not owner:
        raise HTTPException(status_code=404, detail="Shopfront not found")

    store = db.execute(
        select(Store).where(Store.owner_id == owner.id)
    ).scalars().first()

    total_kobo = 0
    sale_items = []

    for item in order.items:
        product = db.get(Product, item.product_id)
        if not product or product.owner_id != owner.id or not product.is_active:
            raise HTTPException(status_code=400, detail=f"Product {item.product_id} not available")

        stock = db.execute(
            select(StockLevel).where(StockLevel.product_id == product.id)
        ).scalars().first()

        available = stock.quantity_on_hand if stock else 0
        if available < item.quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient stock for {product.name}: requested {item.quantity}, available {available}",
            )

        line_total = product.selling_price_kobo * item.quantity
        total_kobo += line_total

        sale_items.append((product, stock, item.quantity, line_total))

    sale_id = str(uuid.uuid4())
    sale = SalesTransaction(
        id=sale_id,
        owner_id=owner.id,
        store_id=store.id if store else None,
        customer_name=order.customer_name,
        customer_phone=order.customer_phone,
        total_amount_kobo=total_kobo,
        payment_method="online",
        status="pending",
        order_type="online",
    )
    db.add(sale)

    for product, stock, qty, line_total in sale_items:
        db.add(SalesTransactionItem(
            id=str(uuid.uuid4()),
            sale_id=sale_id,
            product_id=product.id,
            quantity_sold=qty,
            unit_price_kobo=product.selling_price_kobo,
            line_total_kobo=line_total,
        ))
        if stock:
            stock.quantity_on_hand -= qty
            stock.last_movement_at = datetime.now(timezone.utc)

    db.commit()

    return OrderOut(
        order_id=sale_id,
        total_amount_kobo=total_kobo,
        item_count=len(sale_items),
        message="Order placed successfully. Seller will contact you to arrange payment and delivery.",
    )
