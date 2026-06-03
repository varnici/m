from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List, Dict, Any

from app.infrastructure.database import get_db
from app.infrastructure.auth import get_current_user_id
from app.services.credit_service import CreditService

router = APIRouter()

@router.get("/trust-score")
def get_trust_score(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    """
    Calculate and return the user's trust score and credit limit.
    """
    service = CreditService(db, user_id)
    return service.calculate_trust_score()

@router.get("/offers")
def get_credit_offers(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    """
    Generate and return credit offers for the user.
    """
    service = CreditService(db, user_id)
    return service.generate_credit_offers()
