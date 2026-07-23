from __future__ import annotations

from datetime import date, datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.inventory import Product, SalesTransaction, SalesTransactionItem
from app.models.loan_application import LoanApplication
from app.models.loan_repayment_schedule import LoanRepaymentSchedule
from app.models.loan_transaction import LoanTransaction
from app.models.user import User
from app.services import wallet_service

# Account categories eligible for inventory-financing loans — the same set
# used to gate Inventory access on the frontend (retail/distributor/logistics
# /manufactural all run physical stock and real sales).
ELIGIBLE_CATEGORIES = ("retail", "distributor", "logistics", "manufactural")

# Business owners in the top (1 - this) fraction of 30-day sales volume
# qualify for financing. Self-adjusting as the platform grows — no fixed
# naira threshold to maintain.
LOAN_ELIGIBILITY_PERCENTILE = 0.80

# Credit ceiling at the 100th percentile; scales down linearly with rank.
BASE_CREDIT_LIMIT_KOBO = 50_000_000  # NGN 500,000

# Trust-tier progression: promoted purely on repayment track record (a
# distinct signal from sales volume, which already gates the credit limit).
# A late payment simply pauses further promotion rather than demoting — the
# overdue-block in _has_overdue_installment already blocks new borrowing
# while delinquent, so a tier reset on top of that would double-punish.
_TRUST_LEVEL_ORDER = ["bronze", "silver", "gold", "platinum"]
_PROMOTION_THRESHOLDS = {"silver": 3, "gold": 6, "platinum": 12}  # on-time closed loans required

# Per-annum interest rate by trust tier, prorated by term in _generate_schedule
# (a 1-month loan costs 1/12th of this; a 12-month loan costs the full rate).
# Previously this was applied once regardless of term, which made every term
# length cost the same total naira amount — a rational borrower would always
# pick the longest term for free, collapsing the platform's effective yield
# toward the shortest-term rate and destroying capital velocity.
_ANNUAL_RATE_BY_TRUST_LEVEL = {"bronze": 0.36, "silver": 0.30, "gold": 0.24, "platinum": 0.18}


def _sales_percentile_rank(db: Session, user_id: str) -> float:
    """
    This user's percentile rank (0.0-1.0) of 30-day GROSS PROFIT among all
    business-owner-category users. 1.0 = highest, 0.0 = lowest/none.

    Ranks on profit (unit_price - cost_price) rather than raw revenue —
    otherwise a 2%-margin reseller and a 40%-margin business with identical
    revenue would rank identically, despite very different real ability to
    service debt. cost_price_kobo is NOT NULL on Product, but it's
    self-reported at listing time and unverified, so this is only as honest
    as what merchants enter — a lender-grade version would need some way to
    audit or corroborate cost data, which doesn't exist yet.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(days=30)

    sales_by_user = (
        select(
            User.id.label("user_id"),
            func.coalesce(
                func.sum(
                    (SalesTransactionItem.unit_price_kobo - Product.cost_price_kobo)
                    * SalesTransactionItem.quantity_sold
                ),
                0,
            ).label("total_sales"),
        )
        .select_from(User)
        .outerjoin(
            SalesTransaction,
            (SalesTransaction.owner_id == User.id) & (SalesTransaction.transaction_date >= cutoff),
        )
        .outerjoin(SalesTransactionItem, SalesTransactionItem.sale_id == SalesTransaction.id)
        .outerjoin(Product, Product.id == SalesTransactionItem.product_id)
        .where(User.category.in_(ELIGIBLE_CATEGORIES))
        .group_by(User.id)
        .subquery()
    )

    ranked = select(
        sales_by_user.c.user_id,
        func.percent_rank().over(order_by=sales_by_user.c.total_sales).label("pct_rank"),
    )

    for row in db.execute(ranked).mappings().all():
        if row["user_id"] == user_id:
            return float(row["pct_rank"])
    return 0.0


def check_eligibility(db: Session, user_id: str) -> dict:
    percentile = _sales_percentile_rank(db, user_id)
    eligible = percentile >= LOAN_ELIGIBILITY_PERCENTILE
    credit_limit_kobo = int(BASE_CREDIT_LIMIT_KOBO * percentile) if eligible else 0
    return {
        "eligible": eligible,
        "sales_percentile": round(percentile, 4),
        "credit_limit_kobo": credit_limit_kobo,
    }


def _outstanding_kobo(application: LoanApplication) -> int:
    return sum(
        s.amount_kobo for s in application.repayment_schedules if s.status != "paid"
    )


def _active_loans(db: Session, user_id: str) -> list[LoanApplication]:
    return list(
        db.execute(
            select(LoanApplication).where(
                LoanApplication.user_id == user_id,
                LoanApplication.status == "disbursed",
            )
        ).scalars().all()
    )


def _credit_in_use(db: Session, user_id: str) -> int:
    return sum(_outstanding_kobo(a) for a in _active_loans(db, user_id))


def _has_overdue_installment(db: Session, user_id: str, grace_days: int = 7) -> bool:
    """A repayment more than `grace_days` past its due date blocks new lending
    until it's cleared — otherwise a defaulted borrower could keep borrowing
    as long as their sales volume still ranks highly."""
    cutoff = date.today() - timedelta(days=grace_days)
    overdue = db.execute(
        select(LoanRepaymentSchedule)
        .join(LoanApplication, LoanApplication.id == LoanRepaymentSchedule.loan_application_id)
        .where(
            LoanApplication.user_id == user_id,
            LoanRepaymentSchedule.status != "paid",
            LoanRepaymentSchedule.due_date < cutoff,
        )
        .limit(1)
    ).first()
    return overdue is not None


def _reject(db: Session, *, user_id: str, amount_kobo: int, purpose: str, term_months: int, reason: str) -> LoanApplication:
    application = LoanApplication(
        user_id=user_id,
        amount_kobo=amount_kobo,
        purpose=purpose,
        term_months=term_months,
        interest_rate=0.0,
        status="rejected",
        rejection_reason=reason,
    )
    db.add(application)
    db.flush()
    return application


def create_application(
    db: Session,
    *,
    user_id: str,
    amount_kobo: int,
    purpose: str,
    term_months: int = 1,
) -> LoanApplication:
    # Lock the user row for the duration of this transaction. Without this,
    # two concurrent applications from the same user could both read the same
    # credit_in_use before either commits, both pass the headroom check below,
    # and jointly disburse more than the user's credit limit.
    user = db.execute(
        select(User).where(User.id == user_id).with_for_update()
    ).scalar_one_or_none()
    if not user:
        raise ValueError("User not found")

    if _has_overdue_installment(db, user_id):
        return _reject(
            db,
            user_id=user_id,
            amount_kobo=amount_kobo,
            purpose=purpose,
            term_months=term_months,
            reason="You have an overdue repayment on an existing loan. Clear it before applying for new financing.",
        )

    eligibility = check_eligibility(db, user_id)

    if not eligibility["eligible"]:
        return _reject(
            db,
            user_id=user_id,
            amount_kobo=amount_kobo,
            purpose=purpose,
            term_months=term_months,
            reason=(
                f"Your sales volume over the last 30 days ranks in the "
                f"{round(eligibility['sales_percentile'] * 100)}th percentile among business owners; "
                f"the top {round((1 - LOAN_ELIGIBILITY_PERCENTILE) * 100)}% currently qualifies for financing."
            ),
        )

    # credit_limit_kobo is the user's TOTAL ceiling, not what's left to
    # borrow — it must be reduced by whatever's already outstanding, or a
    # user could take their full limit repeatedly with no cap.
    in_use_kobo = _credit_in_use(db, user_id)
    available_kobo = eligibility["credit_limit_kobo"] - in_use_kobo
    if amount_kobo > available_kobo:
        return _reject(
            db,
            user_id=user_id,
            amount_kobo=amount_kobo,
            purpose=purpose,
            term_months=term_months,
            reason=(
                f"Requested amount exceeds your available credit of NGN {max(0, available_kobo) / 100:,.0f} "
                f"(limit NGN {eligibility['credit_limit_kobo'] / 100:,.0f}, "
                f"already borrowed NGN {in_use_kobo / 100:,.0f})."
            ),
        )

    application = LoanApplication(
        user_id=user_id,
        amount_kobo=amount_kobo,
        purpose=purpose,
        term_months=term_months,
        interest_rate=_ANNUAL_RATE_BY_TRUST_LEVEL.get(user.trust_level, 0.36),
        status="approved",
        approved_at=datetime.now(timezone.utc),
    )
    db.add(application)
    db.flush()

    _generate_schedule(db, application)
    disburse(db, application)

    return application


def _generate_schedule(db: Session, application: LoanApplication) -> None:
    # interest_rate is a per-annum rate; prorate by the actual term so a
    # 1-month loan costs 1/12th of it and a 12-month loan costs the full
    # rate, instead of every term length costing the same flat amount.
    total_interest = int(
        application.amount_kobo * application.interest_rate * application.term_months / 12
    )
    total_due = application.amount_kobo + total_interest
    installment_count = max(1, application.term_months)
    base_installment = total_due // installment_count
    remainder = total_due - base_installment * installment_count

    today = date.today()
    for i in range(1, installment_count + 1):
        amount = base_installment + (remainder if i == installment_count else 0)
        principal_share = int(amount * application.amount_kobo / total_due) if total_due else 0
        db.add(
            LoanRepaymentSchedule(
                loan_application_id=application.id,
                installment_number=i,
                due_date=today + timedelta(days=30 * i),
                amount_kobo=amount,
                principal_kobo=principal_share,
                interest_kobo=amount - principal_share,
                status="pending",
            )
        )
    db.flush()


def disburse(db: Session, application: LoanApplication) -> LoanTransaction:
    wallet_service.process_loan_disbursement(
        db,
        user_id=application.user_id,
        amount_kobo=application.amount_kobo,
        loan_application_id=application.id,
    )
    application.status = "disbursed"
    application.disbursed_at = datetime.now(timezone.utc)

    txn = LoanTransaction(
        loan_application_id=application.id,
        type="disbursement",
        amount_kobo=application.amount_kobo,
        description=f"Disbursement for {application.purpose}",
    )
    db.add(txn)
    db.flush()
    return txn


def _maybe_promote_trust_level(db: Session, user: User) -> None:
    closed = db.execute(
        select(LoanApplication).where(
            LoanApplication.user_id == user.id,
            LoanApplication.status == "closed",
        )
    ).scalars().all()

    on_time_count = sum(
        1 for app in closed
        if all(
            s.paid_at is not None and s.paid_at.date() <= s.due_date
            for s in app.repayment_schedules
        )
    )

    earned_level = "bronze"
    for level, threshold in _PROMOTION_THRESHOLDS.items():
        if on_time_count >= threshold:
            earned_level = level

    if _TRUST_LEVEL_ORDER.index(earned_level) > _TRUST_LEVEL_ORDER.index(user.trust_level):
        user.trust_level = earned_level


def _split_repayment(schedules: list[LoanRepaymentSchedule], amount_kobo: int) -> tuple[int, int]:
    """How much of a repayment recovers principal vs interest, walking the
    same oldest-first order apply_repayment uses to actually clear
    installments. Read-only — used only to feed the ledger's revenue
    recognition, doesn't mutate any schedule."""
    remaining = amount_kobo
    principal_recovered = 0
    for schedule in schedules:
        if remaining <= 0:
            break
        applied = min(remaining, schedule.amount_kobo)
        installment_total = schedule.principal_kobo + schedule.interest_kobo
        if installment_total > 0:
            principal_recovered += int(applied * schedule.principal_kobo / installment_total)
        remaining -= applied
    interest_recovered = amount_kobo - principal_recovered
    return principal_recovered, interest_recovered


def apply_repayment(db: Session, *, application: LoanApplication, amount_kobo: int) -> LoanTransaction:
    if application.status != "disbursed":
        raise ValueError(f"Cannot repay a loan in status '{application.status}'")

    schedules = sorted(
        (s for s in application.repayment_schedules if s.status != "paid"),
        key=lambda s: s.installment_number,
    )
    principal_kobo, interest_kobo = _split_repayment(schedules, amount_kobo)

    wallet_service.process_repayment_sweep(
        db,
        user_id=application.user_id,
        amount_kobo=amount_kobo,
        principal_kobo=principal_kobo,
        interest_kobo=interest_kobo,
        loan_id=application.id,
    )

    remaining = amount_kobo
    for schedule in schedules:
        if remaining <= 0:
            break
        if remaining >= schedule.amount_kobo:
            remaining -= schedule.amount_kobo
            schedule.status = "paid"
            schedule.paid_at = datetime.now(timezone.utc)
        else:
            schedule.amount_kobo -= remaining
            remaining = 0

    if all(s.status == "paid" for s in application.repayment_schedules):
        application.status = "closed"
        _maybe_promote_trust_level(db, application.user)

    txn = LoanTransaction(
        loan_application_id=application.id,
        type="repayment",
        amount_kobo=amount_kobo,
        description=f"Repayment for {application.purpose}",
    )
    db.add(txn)
    db.flush()
    return txn


def get_dashboard(db: Session, user_id: str) -> dict:
    eligibility = check_eligibility(db, user_id)

    active = sorted(
        _active_loans(db, user_id),
        key=lambda a: a.disbursed_at or datetime.min.replace(tzinfo=timezone.utc),
        reverse=True,
    )

    active_loans_data = []
    credit_in_use = 0
    for application in active:
        outstanding = _outstanding_kobo(application)
        credit_in_use += outstanding
        next_due = next(
            (
                s.due_date
                for s in sorted(application.repayment_schedules, key=lambda s: s.installment_number)
                if s.status != "paid"
            ),
            None,
        )
        active_loans_data.append(
            {
                "id": application.id,
                "product_name": application.purpose,
                "loan_amount": application.amount_kobo,
                "outstanding": outstanding,
                "status": application.status,
                "due_date": next_due.isoformat() if next_due else None,
                "insured": False,
                "icon": "\U0001F4B0",
            }
        )

    history = (
        db.execute(
            select(LoanApplication)
            .where(LoanApplication.user_id == user_id, LoanApplication.status.in_(["closed", "rejected"]))
            .order_by(LoanApplication.applied_at.desc())
            .limit(10)
        )
        .scalars()
        .all()
    )

    loan_history = [
        {
            "id": application.id,
            "product_name": application.purpose,
            "month": application.applied_at.strftime("%b %Y"),
            "amount": application.amount_kobo,
            "status": "Paid" if application.status == "closed" else "Rejected",
        }
        for application in history
    ]

    return {
        "available_credit": max(0, eligibility["credit_limit_kobo"] - credit_in_use),
        "credit_in_use": credit_in_use,
        "active_loans": active_loans_data,
        "loan_history": loan_history,
    }
