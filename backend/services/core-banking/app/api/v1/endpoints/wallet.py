from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.infrastructure.auth import get_current_user_id
from app.models.wallet import Wallet
from app.services.wallet_service import process_transaction

router = APIRouter()


class WalletOut(BaseModel):
    user_id: str
    balance_kobo: int

    model_config = {
        "from_attributes": True
    }


class WalletTopUp(BaseModel):
    amount_kobo: int = Field(..., ge=1)


@router.get("", response_model=WalletOut)
def get_wallet(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    wallet = db.execute(select(Wallet).where(Wallet.user_id == user_id)).scalar_one_or_none()
    if not wallet:
        raise HTTPException(status_code=404, detail="Wallet not found")
    return wallet


@router.post("/topup", response_model=WalletOut)
def topup_wallet(
    payload: WalletTopUp,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    try:
        process_transaction(
            db,
            user_id=user_id,
            type="topup",
            amount_kobo=payload.amount_kobo,
            description="Wallet top-up",
        )
        db.commit()

        wallet = db.execute(select(Wallet).where(Wallet.user_id == user_id)).scalar_one_or_none()
        return wallet
    except ValueError as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(exc)) from exc
