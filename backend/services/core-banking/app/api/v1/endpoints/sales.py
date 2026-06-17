from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.infrastructure.auth import get_current_user_id
from app.schemas.sales_schemas import SaleCreate, SaleOut
from app.services.sales_service import list_sales_legacy, record_sale

router = APIRouter()


@router.post("", response_model=SaleOut)
def create_sale(
    payload: SaleCreate,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    try:
        return record_sale(
            db,
            user_id=user_id,
            product_sku=payload.product_sku,
            quantity=payload.quantity,
            unit_price_kobo=payload.unit_price_kobo,
            channel=payload.channel,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("", response_model=list[SaleOut])
def list_sales(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    return list_sales_legacy(db, user_id)
