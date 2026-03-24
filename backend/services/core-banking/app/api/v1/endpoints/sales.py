from __future__ import annotations

from fastapi import APIRouter
from sqlalchemy import select

from app.infrastructure.database import db_session
from app.models.sales import Sale
from app.schemas.sales_schemas import SaleCreate, SaleOut
from app.services.sales_service import record_sale

router = APIRouter()


@router.post("", response_model=SaleOut)
def create_sale(payload: SaleCreate):
    with db_session() as db:
        sale = record_sale(
            db,
            user_id=payload.user_id,
            product_sku=payload.product_sku,
            quantity=payload.quantity,
            unit_price_kobo=payload.unit_price_kobo,
            channel=payload.channel,
        )
        return sale


@router.get("", response_model=list[SaleOut])
def list_sales(user_id: str):
    with db_session() as db:
        q = select(Sale).where(Sale.user_id == user_id).order_by(Sale.sold_at.desc())
        return list(db.execute(q).scalars().all())

