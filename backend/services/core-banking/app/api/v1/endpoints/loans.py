from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select

from app.core.rate_limit import limiter
from app.infrastructure.database import db_session
from app.infrastructure.auth import get_current_user_id
from app.models.loan_application import LoanApplication
from app.schemas.loan_schemas import (
    LoanApplicationCreate,
    LoanApplicationOut,
    LoanTransactionOut,
    RepaymentCreate,
)
from app.services import loan_application_service

router = APIRouter()


@router.post("", response_model=LoanApplicationOut)
@limiter.limit("10/hour")
def create(request: Request, payload: LoanApplicationCreate, user_id: str = Depends(get_current_user_id)):
    with db_session() as db:
        try:
            return loan_application_service.create_application(
                db,
                user_id=user_id,
                amount_kobo=payload.amount_kobo,
                purpose=payload.purpose,
                term_months=payload.term_months,
            )
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))


@router.get("", response_model=list[LoanApplicationOut])
def list_loans(user_id: str = Depends(get_current_user_id)):
    with db_session() as db:
        q = (
            select(LoanApplication)
            .where(LoanApplication.user_id == user_id)
            .order_by(LoanApplication.applied_at.desc())
        )
        return list(db.execute(q).scalars().all())


@router.get("/dashboard", response_model=dict)
def get_loan_dashboard(user_id: str = Depends(get_current_user_id)):
    with db_session() as db:
        return loan_application_service.get_dashboard(db, user_id)


@router.post("/{loan_id}/repay", response_model=LoanTransactionOut)
@limiter.limit("20/hour")
def repay(request: Request, loan_id: str, payload: RepaymentCreate, user_id: str = Depends(get_current_user_id)):
    with db_session() as db:
        application = db.get(LoanApplication, loan_id)
        if not application:
            raise HTTPException(status_code=404, detail="Loan not found")
        if application.user_id != user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        try:
            return loan_application_service.apply_repayment(
                db, application=application, amount_kobo=payload.amount_kobo
            )
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
