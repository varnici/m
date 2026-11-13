from __future__ import annotations

from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.infrastructure.auth import get_current_user_id
from app.models.business_starter_kit import BusinessStarterKit
from app.schemas.business_starter_kit_schemas import BusinessStarterKitOut

router = APIRouter()


@router.get("", response_model=List[BusinessStarterKitOut])
def list_business_starter_kits(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    query = (
        select(BusinessStarterKit)
        .where(BusinessStarterKit.is_active == True)
        .order_by(BusinessStarterKit.display_order)
    )
    return db.execute(query).scalars().all()


@router.get("/{kit_id}", response_model=BusinessStarterKitOut)
def get_business_starter_kit(
    kit_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    kit = db.get(BusinessStarterKit, kit_id)
    if not kit or not kit.is_active:
        raise HTTPException(status_code=404, detail="Business starter kit not found")
    return kit
