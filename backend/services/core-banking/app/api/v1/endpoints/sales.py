from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.infrastructure.database import db_session
from app.schemas.sales_schemas import SaleCreate, SaleOut
from app.services.sales_service import list_sales_legacy, record_sale

router = APIRouter()


@router.post("", response_model=SaleOut)
def create_sale(payload: SaleCreate):
    with db_session() as db:
        try:
            return record_sale(
                db,
                user_id=payload.user_id,
                product_sku=payload.product_sku,
                quantity=payload.quantity,
                unit_price_kobo=payload.unit_price_kobo,
                channel=payload.channel,
            )
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("", response_model=list[SaleOut])
def list_sales(user_id: str):
    with db_session() as db:
        return list_sales_legacy(db, user_id)

