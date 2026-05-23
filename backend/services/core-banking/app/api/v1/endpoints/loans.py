from __future__ import annotations

from typing import List

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


@router.get("/{user_id}/dashboard", response_model=dict)
def get_loan_dashboard(user_id: str):
    """
    Get loan dashboard data for a user.
    Returns active loans, loan history, and credit information.
    """
    with db_session() as db:
        # Verify user exists
        user = db.get(User, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        # Get wallet for credit information
        from app.models.wallet import Wallet
        wallet = db.execute(
            select(Wallet).where(Wallet.user_id == user_id)
        ).scalar_one_or_none()

        available_credit = wallet.available_credit_kobo if wallet and wallet.available_credit_kobo else 0
        credit_in_use = wallet.total_debt_kobo if wallet else 0

        # Get active loans
        active_loans_query = select(Loan).where(
            Loan.user_id == user_id,
            Loan.status.in_(['active', 'pending'])
        ).order_by(Loan.created_at.desc())

        active_loans = db.execute(active_loans_query).scalars().all()
        active_loans_data = []

        for loan in active_loans:
            active_loans_data.append({
                "id": loan.id,
                "product_name": loan.product_sku,  # TODO: Map to actual product name
                "loan_amount": loan.principal_kobo,
                "outstanding": loan.total_due_kobo - loan.repaid_kobo,
                "status": loan.status,
                "due_date": loan.next_repayment_date.isoformat() if loan.next_repayment_date else None,
                "insured": False,  # TODO: Add insurance flag to loan model
                "icon": "💰"  # TODO: Add icon mapping
            })

        # Get loan history (closed loans)
        history_loans_query = select(Loan).where(
            Loan.user_id == user_id,
            Loan.status.in_(['closed', 'paid', 'defaulted'])
        ).order_by(Loan.created_at.desc()).limit(10)

        history_loans = db.execute(history_loans_query).scalars().all()
        loan_history = []

        for loan in history_loans:
            from datetime import datetime
            loan_history.append({
                "id": loan.id,
                "product_name": loan.product_sku,
                "month": loan.created_at.strftime("%b %Y"),
                "amount": loan.principal_kobo,
                "status": "Paid" if loan.status == "closed" else loan.status.title()
            })

        return {
            "available_credit": available_credit,
            "credit_in_use": credit_in_use,
            "active_loans": active_loans_data,
            "loan_history": loan_history
        }


@router.get("/{loan_id}/contract")
def get_loan_contract(loan_id: str):
    """
    Get loan contract document.
    Returns PDF or document data for the loan contract.
    """
    with db_session() as db:
        loan = db.get(Loan, loan_id)
        if not loan:
            raise HTTPException(status_code=404, detail="Loan not found")

        # TODO: Generate or retrieve actual contract PDF
        # For now, return a placeholder response
        return {
            "loan_id": loan_id,
            "contract_url": f"/contracts/{loan_id}.pdf",
            "status": "Contract generation pending",
            "message": "Contract PDF will be available soon"
        }


@router.post("/{loan_id}/repay", response_model=RepaymentOut)
def repay(loan_id: str, payload: RepaymentCreate):
    with db_session() as db:
        loan = db.get(Loan, loan_id)
        if not loan:
            raise HTTPException(status_code=404, detail="Loan not found")
        try:
            rep = apply_repayment(db, loan=loan, amount_kobo=payload.amount_kobo)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        return rep

