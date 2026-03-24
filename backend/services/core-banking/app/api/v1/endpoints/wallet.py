from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select

from app.infrastructure.database import db_session
from app.models.wallet import Wallet

router = APIRouter()


class WalletOut(BaseModel):
    user_id: str
    balance_kobo: int

    class Config:
        from_attributes = True


class WalletTopUp(BaseModel):
    amount_kobo: int = Field(..., ge=1)


@router.get("/{user_id}", response_model=WalletOut)
def get_wallet(user_id: str):
    with db_session() as db:
        wallet = db.execute(select(Wallet).where(Wallet.user_id == user_id)).scalar_one_or_none()
        if not wallet:
            raise HTTPException(status_code=404, detail="Wallet not found")
        return wallet


@router.post("/{user_id}/topup", response_model=WalletOut)
def topup_wallet(user_id: str, payload: WalletTopUp):
    with db_session() as db:
        wallet = db.execute(select(Wallet).where(Wallet.user_id == user_id)).scalar_one_or_none()
        if not wallet:
            raise HTTPException(status_code=404, detail="Wallet not found")
        wallet.balance_kobo += payload.amount_kobo
        db.flush()
        return wallet

