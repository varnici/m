from __future__ import annotations

from fastapi import APIRouter, HTTPException
from sqlalchemy import select

from app.infrastructure.database import db_session
from app.models.loan import Loan
from app.models.user import User
from app.schemas.loan_schemas import LoanCreate, LoanOut, RepaymentCreate, RepaymentOut
from app.services.loan_service import apply_repayment, create_loan

router = APIRouter()


@router.post("", response_model=LoanOut)
def create(payload: LoanCreate):
    with db_session() as db:
        user = db.get(User, payload.user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        loan = create_loan(
            db,
            user_id=payload.user_id,
            product_sku=payload.product_sku,
            product_qty=payload.product_qty,
            principal_kobo=payload.principal_kobo,
            trust_level=user.trust_level,
        )
        return loan


@router.get("", response_model=list[LoanOut])
def list_loans(user_id: str):
    with db_session() as db:
        q = select(Loan).where(Loan.user_id == user_id).order_by(Loan.created_at.desc())
        return list(db.execute(q).scalars().all())


@router.post("/{loan_id}/repay", response_model=RepaymentOut)
def repay(loan_id: str, payload: RepaymentCreate):
    with db_session() as db:
        loan = db.get(Loan, loan_id)
        if not loan:
            raise HTTPException(status_code=404, detail="Loan not found")
        rep = apply_repayment(db, loan=loan, amount_kobo=payload.amount_kobo)
        return rep

