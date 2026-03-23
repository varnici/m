from __future__ import annotations

from sqlalchemy.orm import Session

from app.models.loan import Loan
from app.models.repayment import Repayment


def compute_service_fee_kobo(principal_kobo: int, trust_level: str) -> int:
    # MVP fee table: 3% bronze, 2% silver, 1.5% gold, 1% platinum
    pct = {"bronze": 0.03, "silver": 0.02, "gold": 0.015, "platinum": 0.01}.get(trust_level, 0.03)
    return int(principal_kobo * pct)


def create_loan(
    db: Session,
    *,
    user_id: str,
    product_sku: str,
    product_qty: int,
    principal_kobo: int,
    trust_level: str,
) -> Loan:
    fee = compute_service_fee_kobo(principal_kobo, trust_level)
    total = principal_kobo + fee
    loan = Loan(
        user_id=user_id,
        product_sku=product_sku,
        product_qty=product_qty,
        principal_kobo=principal_kobo,
        service_fee_kobo=fee,
        total_due_kobo=total,
        repaid_kobo=0,
        status="active",
    )
    db.add(loan)
    db.flush()
    return loan


def apply_repayment(db: Session, *, loan: Loan, amount_kobo: int) -> Repayment:
    loan.repaid_kobo = min(loan.total_due_kobo, loan.repaid_kobo + amount_kobo)
    if loan.repaid_kobo >= loan.total_due_kobo:
        loan.status = "closed"
    repayment = Repayment(loan_id=loan.id, amount_kobo=amount_kobo)
    db.add(repayment)
    db.flush()
    return repayment

