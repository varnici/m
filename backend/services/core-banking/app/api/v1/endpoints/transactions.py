from __future__ import annotations

from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy import select

from app.infrastructure.database import db_session
from app.models.wallet import Wallet
from app.models.transaction import Transaction

router = APIRouter()


class TransactionOut(BaseModel):
    id: str
    wallet_id: str
    type: str
    amount_kobo: int
    running_balance_kobo: int
    description: str | None = None
    reference_id: str | None = None
    created_at: datetime

    model_config = {
        "from_attributes": True
    }


@router.get("/{user_id}/recent", response_model=list[TransactionOut])
def get_recent_transactions(user_id: str, limit: int = 10):
    """
    Fetch the recent ledger transactions for a user's wallet.
    Queries the live database, raising a 404 error if the wallet does not exist.
    """
    with db_session() as db:
        wallet = db.execute(select(Wallet).where(Wallet.user_id == user_id)).scalar_one_or_none()
        if not wallet:
            raise HTTPException(status_code=404, detail="Wallet not found")
        
        q = (
            select(Transaction)
            .where(Transaction.wallet_id == wallet.id)
            .order_by(Transaction.created_at.desc())
            .limit(limit)
        )
        return list(db.execute(q).scalars().all())
