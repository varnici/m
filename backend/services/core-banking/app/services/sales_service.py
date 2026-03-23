from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.sales import Sale


def record_sale(
    db: Session,
    *,
    user_id: str,
    product_sku: str,
    quantity: int,
    unit_price_kobo: int,
    channel: str,
) -> Sale:
    sale = Sale(user_id=user_id, product_sku=product_sku, quantity=quantity, unit_price_kobo=unit_price_kobo, channel=channel)
    db.add(sale)
    db.flush()
    return sale


def units_sold_last_30d(db: Session, *, user_id: str) -> int:
    # MVP: no window filter; keep simple until you add timestamps filtering
    q = select(func.coalesce(func.sum(Sale.quantity), 0)).where(Sale.user_id == user_id)
    return int(db.execute(q).scalar_one())

