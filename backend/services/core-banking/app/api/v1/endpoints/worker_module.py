"""
Layer 1 — 9-5 Worker Module endpoints.

Prefix: /v1/worker
Tags:   worker-module
"""
from __future__ import annotations

import functools
import hashlib
import hmac
import logging
from datetime import date, datetime, timedelta
from decimal import Decimal, ROUND_HALF_UP
from typing import Literal, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import settings
from app.infrastructure.database import supabase_db_session as db_session
from app.infrastructure.auth import get_current_user_id

router = APIRouter()
logger = logging.getLogger(__name__)

MONTHLY_RATE_PCT = Decimal("1.0000")
EARLY_WITHDRAWAL_PENALTY_PCT = Decimal("3.5000")


def _guard(fn):
    """Convert unhandled DB/connectivity errors into a clean 503 instead of
    a raw 500 stack trace or (worse) a silently-empty 200. HTTPExceptions
    raised deliberately by the handler (404, 400, etc.) pass through as-is.
    """

    @functools.wraps(fn)
    def wrapper(*args, **kwargs):
        try:
            return fn(*args, **kwargs)
        except HTTPException:
            raise
        except Exception:
            logger.exception("worker_module.%s failed", fn.__name__)
            raise HTTPException(status_code=503, detail="Worker service temporarily unavailable")

    return wrapper

# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class SavingsPlanOut(BaseModel):
    id: str
    target_name: str
    target_amount: float
    current_balance: float
    automated_rule: str
    rule_amount: float
    is_achieved: bool
    next_collection_date: Optional[str] = None

    model_config = {"from_attributes": True}


class InvestmentOut(BaseModel):
    id: str
    cluster_id: str
    business_name: str
    principal_amount: float
    dividends_earned: float
    status: str
    current_yield_pct: float
    created_at: str

    model_config = {"from_attributes": True}


class DashboardSummaryOut(BaseModel):
    user_id: str
    full_name: str
    bvn_verified: bool
    virtual_account_number: Optional[str]
    virtual_account_bank: Optional[str]
    total_savings_balance: float
    total_invested_principal: float
    total_dividends_earned: float
    net_portfolio_value: float
    cumulative_monthly_dividends: float
    active_savings_plans: list[SavingsPlanOut]
    active_investments: list[InvestmentOut]


class MarketplaceItemOut(BaseModel):
    rank: int
    cluster_id: str
    business_name: str
    category: str
    risk_rating: str
    rolling_30_day_turnover: float
    projected_monthly_roi: float
    last_updated_at: str


class ConfigureRulesIn(BaseModel):
    plan_id: str
    automated_rule: Literal["manual", "salary_direct", "round_up"]
    rule_amount: float = Field(..., ge=0)

    @field_validator("rule_amount")
    @classmethod
    def amount_required_for_non_manual(cls, v: float, info: any) -> float:
        rule = info.data.get("automated_rule")
        if rule in ("salary_direct", "round_up") and v <= 0:
            raise ValueError("rule_amount must be > 0 for salary_direct and round_up rules")
        return v


class ConfigureRulesOut(BaseModel):
    plan_id: str
    automated_rule: str
    rule_amount: float
    message: str


class WebhookPayloadIn(BaseModel):
    event: str
    amount_kobo: int = Field(..., ge=1)
    destination_account: str
    reference: str
    narration: Optional[str] = None


class WebhookAckOut(BaseModel):
    received: bool
    user_id: Optional[str]
    credited_amount_naira: float
    message: str


# ---------------------------------------------------------------------------
# Investment Term models
# ---------------------------------------------------------------------------

class CreateInvestmentIn(BaseModel):
    cluster_id: str
    amount: float = Field(..., ge=10000, le=5000000)
    term_months: Literal[6, 12]


class DividendRecordOut(BaseModel):
    id: str
    period_date: str
    amount: float
    status: str
    collected_at: Optional[str] = None

    model_config = {"from_attributes": True}


class InvestmentDetailOut(BaseModel):
    id: str
    cluster_id: str
    business_name: str
    principal_amount: float
    dividends_earned: float
    total_collected: float
    status: str
    term_months: int
    monthly_rate_pct: float
    start_date: str
    maturity_date: str
    penalty_rate_pct: float
    current_yield_pct: float
    created_at: str
    days_remaining: int
    is_matured: bool
    available_dividends: float
    dividend_records: list[DividendRecordOut]


class PortfolioInvestmentOut(BaseModel):
    id: str
    cluster_id: str
    business_name: str
    principal_amount: float
    dividends_earned: float
    total_collected: float
    status: str
    term_months: int
    monthly_rate_pct: float
    start_date: str
    maturity_date: str
    days_remaining: int
    is_matured: bool
    progress_pct: float
    available_dividends: float


class PortfolioSummaryOut(BaseModel):
    total_principal: float
    total_dividends_earned: float
    total_collected: float
    total_available: float
    active_count: int
    matured_count: int
    investments: list[PortfolioInvestmentOut]


class CollectDividendOut(BaseModel):
    investment_id: str
    collected_amount: float
    records_collected: int
    message: str


class WithdrawOut(BaseModel):
    investment_id: str
    principal_returned: float
    uncollected_dividends: float
    penalty_pct: float
    penalty_amount: float
    net_amount: float
    is_early: bool
    message: str


# ---------------------------------------------------------------------------
# Helpers: raw SQL via db_session (no ORM models — tables live in Supabase)
# ---------------------------------------------------------------------------

def _fetch_profile(db: Session, user_id: str) -> dict:
    try:
        row = db.execute(
            text(
                "SELECT id, full_name, bvn_verified, virtual_account_number, virtual_account_bank "
                "FROM public.profiles WHERE id = :uid"
            ),
            {"uid": user_id},
        ).mappings().one_or_none()
    except Exception:
        row = None
    if row is None:
        return {
            "id": user_id,
            "full_name": None,
            "bvn_verified": False,
            "virtual_account_number": None,
            "virtual_account_bank": None,
        }
    return dict(row)


def _fetch_savings_plans(db: Session, user_id: str) -> list[dict]:
    try:
        rows = db.execute(
            text(
                "SELECT id, target_name, target_amount, current_balance, automated_rule, "
                "rule_amount, is_achieved FROM public.savings_plans WHERE user_id = :uid"
            ),
            {"uid": user_id},
        ).mappings().all()
        return [dict(r) for r in rows]
    except Exception:
        return []


def _fetch_investments(db: Session, user_id: str) -> list[dict]:
    try:
        rows = db.execute(
            text(
                "SELECT i.id, i.cluster_id, bc.business_name, i.principal_amount, "
                "i.dividends_earned, i.status, i.created_at, "
                "COALESCE(cs.projected_monthly_roi, 0) AS projected_monthly_roi "
                "FROM public.investments i "
                "JOIN public.business_clusters bc ON bc.id = i.cluster_id "
                "LEFT JOIN public.cluster_snapshots cs ON cs.cluster_id = i.cluster_id "
                "WHERE i.investor_id = :uid AND i.status = 'active'"
            ),
            {"uid": user_id},
        ).mappings().all()
        return [dict(r) for r in rows]
    except Exception:
        return []


# ---------------------------------------------------------------------------
# GET /worker/dashboard/summary
# ---------------------------------------------------------------------------

@router.get("/dashboard/summary", response_model=DashboardSummaryOut)
def get_dashboard_summary(user_id: str = Depends(get_current_user_id)):
    with db_session() as db:
        profile = _fetch_profile(db, user_id)
        plans_raw = _fetch_savings_plans(db, user_id)
        invests_raw = _fetch_investments(db, user_id)

        total_savings = sum(float(p["current_balance"]) for p in plans_raw)
        total_principal = sum(float(i["principal_amount"]) for i in invests_raw)
        total_dividends = sum(float(i["dividends_earned"]) for i in invests_raw)
        cumulative_monthly = sum(
            float(i["principal_amount"]) * float(i["projected_monthly_roi"]) / 100
            for i in invests_raw
        )

        savings_plans_out = [
            SavingsPlanOut(
                id=str(p["id"]),
                target_name=p["target_name"],
                target_amount=float(p["target_amount"]),
                current_balance=float(p["current_balance"]),
                automated_rule=p["automated_rule"],
                rule_amount=float(p["rule_amount"]),
                is_achieved=bool(p["is_achieved"]),
            )
            for p in plans_raw
        ]

        investments_out = [
            InvestmentOut(
                id=str(i["id"]),
                cluster_id=str(i["cluster_id"]),
                business_name=i["business_name"],
                principal_amount=float(i["principal_amount"]),
                dividends_earned=float(i["dividends_earned"]),
                status=i["status"],
                current_yield_pct=float(i["projected_monthly_roi"]),
                created_at=str(i["created_at"]),
            )
            for i in invests_raw
        ]

        return DashboardSummaryOut(
            user_id=str(profile["id"]),
            full_name=profile["full_name"] or "",
            bvn_verified=bool(profile["bvn_verified"]),
            virtual_account_number=profile["virtual_account_number"],
            virtual_account_bank=profile["virtual_account_bank"],
            total_savings_balance=total_savings,
            total_invested_principal=total_principal,
            total_dividends_earned=total_dividends,
            net_portfolio_value=total_savings + total_principal + total_dividends,
            cumulative_monthly_dividends=cumulative_monthly,
            active_savings_plans=savings_plans_out,
            active_investments=investments_out,
        )


# ---------------------------------------------------------------------------
# GET /worker/marketplace/top-10
# ---------------------------------------------------------------------------

@router.get("/marketplace/top-10", response_model=list[MarketplaceItemOut])
@_guard
def get_top10_marketplace(
    category: Optional[str] = Query(None, description="Filter by category e.g. FMCG, Retail, Agriculture"),
):
    with db_session() as db:
        sql = (
            "SELECT bc.id AS cluster_id, bc.business_name, bc.category, bc.risk_rating, "
            "cs.rolling_30_day_turnover, cs.projected_monthly_roi, cs.last_updated_at "
            "FROM public.cluster_snapshots cs "
            "JOIN public.business_clusters bc ON bc.id = cs.cluster_id "
            "WHERE bc.is_active_for_investment = TRUE"
        )
        params: dict = {}
        if category and category.lower() != "all":
            sql += " AND LOWER(bc.category) = :cat"
            params["cat"] = category.lower()

        sql += " ORDER BY cs.rolling_30_day_turnover DESC LIMIT 10"

        rows = db.execute(text(sql), params).mappings().all()

        return [
            MarketplaceItemOut(
                rank=idx + 1,
                cluster_id=str(r["cluster_id"]),
                business_name=r["business_name"],
                category=r["category"],
                risk_rating=r["risk_rating"],
                rolling_30_day_turnover=float(r["rolling_30_day_turnover"]),
                projected_monthly_roi=float(r["projected_monthly_roi"]),
                last_updated_at=str(r["last_updated_at"]),
            )
            for idx, r in enumerate(rows)
        ]


# ---------------------------------------------------------------------------
# POST /worker/savings/configure-rules
# ---------------------------------------------------------------------------

@router.post("/savings/configure-rules", response_model=ConfigureRulesOut)
@_guard
def configure_savings_rules(payload: ConfigureRulesIn, user_id: str = Depends(get_current_user_id)):
    with db_session() as db:
        result = db.execute(
            text(
                "UPDATE public.savings_plans SET automated_rule = :rule, rule_amount = :amount "
                "WHERE id = :plan_id AND user_id = :uid RETURNING id"
            ),
            {
                "rule": payload.automated_rule,
                "amount": payload.rule_amount,
                "plan_id": payload.plan_id,
                "uid": user_id,
            },
        ).mappings().one_or_none()

        if result is None:
            raise HTTPException(status_code=404, detail="Savings plan not found")

        db.commit()

    return ConfigureRulesOut(
        plan_id=payload.plan_id,
        automated_rule=payload.automated_rule,
        rule_amount=payload.rule_amount,
        message=f"Rule '{payload.automated_rule}' applied successfully.",
    )


# ---------------------------------------------------------------------------
# POST /worker/savings/create
# ---------------------------------------------------------------------------

class CreateSavingsPlanIn(BaseModel):
    target_name: str = Field(..., min_length=1, max_length=120)
    target_amount: float = Field(..., gt=0)
    automated_rule: Literal["manual", "salary_direct", "round_up"] = "manual"
    rule_amount: float = Field(0, ge=0)


@router.post("/savings/create", response_model=SavingsPlanOut)
@_guard
def create_savings_plan(payload: CreateSavingsPlanIn, user_id: str = Depends(get_current_user_id)):
    with db_session() as db:
        row = db.execute(
            text(
                "INSERT INTO public.savings_plans "
                "(user_id, target_name, target_amount, automated_rule, rule_amount) "
                "VALUES (:uid, :name, :amount, :rule, :rule_amt) "
                "RETURNING id, target_name, target_amount, current_balance, "
                "automated_rule, rule_amount, is_achieved"
            ),
            {
                "uid": user_id,
                "name": payload.target_name,
                "amount": payload.target_amount,
                "rule": payload.automated_rule,
                "rule_amt": payload.rule_amount,
            },
        ).mappings().one()
        db.commit()

    return SavingsPlanOut(
        id=str(row["id"]),
        target_name=row["target_name"],
        target_amount=float(row["target_amount"]),
        current_balance=float(row["current_balance"]),
        automated_rule=row["automated_rule"],
        rule_amount=float(row["rule_amount"]),
        is_achieved=bool(row["is_achieved"]),
    )


# ---------------------------------------------------------------------------
# POST /worker/payments/webhook
# ---------------------------------------------------------------------------

DEFAULT_SAVINGS_PLAN_NAME = "General Savings"


def _verify_signature(payload_bytes: bytes, signature_header: str) -> bool:
    expected = hmac.new(
        settings.payment_webhook_secret.encode(), payload_bytes, hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature_header)


@router.post("/payments/webhook", response_model=WebhookAckOut)
@_guard
async def payments_webhook(
    payload: WebhookPayloadIn,
    x_webhook_signature: str = Header(..., alias="X-Webhook-Signature"),
):
    import json

    if not settings.payment_webhook_secret:
        # Fail closed: no configured secret means no way to trust a caller.
        # Never fall back to a guessable committed default.
        raise HTTPException(status_code=503, detail="Webhook not configured")

    raw_body = json.dumps(payload.model_dump(), default=str).encode()
    if not _verify_signature(raw_body, x_webhook_signature):
        raise HTTPException(status_code=401, detail="Invalid webhook signature")

    with db_session() as db:
        # Idempotency: refuse to process the same provider event twice
        # (retried/replayed deliveries would otherwise double-credit).
        already_processed = db.execute(
            text("SELECT id FROM public.payment_webhook_events WHERE reference = :ref"),
            {"ref": payload.reference},
        ).mappings().one_or_none()

        if already_processed:
            return WebhookAckOut(
                received=True,
                user_id=None,
                credited_amount_naira=0,
                message="Event already processed — ignored duplicate delivery.",
            )

        profile_row = db.execute(
            text("SELECT id FROM public.profiles WHERE virtual_account_number = :acct"),
            {"acct": payload.destination_account},
        ).mappings().one_or_none()

        if profile_row is None:
            db.execute(
                text(
                    "INSERT INTO public.payment_webhook_events (reference, user_id, amount_kobo) "
                    "VALUES (:ref, NULL, :amt)"
                ),
                {"ref": payload.reference, "amt": payload.amount_kobo},
            )
            db.commit()
            return WebhookAckOut(
                received=True,
                user_id=None,
                credited_amount_naira=0,
                message="No profile matched this virtual account — event acknowledged.",
            )

        user_id = str(profile_row["id"])
        amount_naira = payload.amount_kobo / 100

        # Credit the first non-achieved savings plan. If the worker has none
        # yet, open a default one instead of dropping the money — real funds
        # received must always land somewhere real, never vanish silently.
        plan_row = db.execute(
            text(
                "SELECT id FROM public.savings_plans "
                "WHERE user_id = :uid AND is_achieved = FALSE "
                "ORDER BY created_at ASC LIMIT 1"
            ),
            {"uid": user_id},
        ).mappings().one_or_none()

        if plan_row is None:
            plan_row = db.execute(
                text(
                    "INSERT INTO public.savings_plans (user_id, target_name, target_amount) "
                    "VALUES (:uid, :name, :amount) RETURNING id"
                ),
                {
                    "uid": user_id,
                    "name": DEFAULT_SAVINGS_PLAN_NAME,
                    "amount": max(amount_naira * 10, 100_000.0),
                },
            ).mappings().one()

        db.execute(
            text(
                "UPDATE public.savings_plans "
                "SET current_balance = current_balance + :amt "
                "WHERE id = :plan_id"
            ),
            {"amt": amount_naira, "plan_id": str(plan_row["id"])},
        )

        db.execute(
            text(
                "INSERT INTO public.payment_webhook_events (reference, user_id, amount_kobo) "
                "VALUES (:ref, :uid, :amt)"
            ),
            {"ref": payload.reference, "uid": user_id, "amt": payload.amount_kobo},
        )

        db.commit()

    return WebhookAckOut(
        received=True,
        user_id=user_id,
        credited_amount_naira=amount_naira,
        message=f"₦{amount_naira:,.2f} credited to savings plan.",
    )


# ---------------------------------------------------------------------------
# POST /worker/investments/create
# ---------------------------------------------------------------------------

@router.post("/investments/create", response_model=InvestmentDetailOut)
@_guard
def create_investment(payload: CreateInvestmentIn, user_id: str = Depends(get_current_user_id)):
    with db_session() as db:
        # An investment must be funded from the worker's own accumulated
        # savings balance — it cannot be minted from nothing. Debit the
        # oldest plans first until the requested amount is covered.
        plans = db.execute(
            text(
                "SELECT id, current_balance FROM public.savings_plans "
                "WHERE user_id = :uid AND current_balance > 0 "
                "ORDER BY created_at ASC FOR UPDATE"
            ),
            {"uid": user_id},
        ).mappings().all()

        available = sum(float(p["current_balance"]) for p in plans)
        if payload.amount > available:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient available balance. You have ₦{available:,.2f} available.",
            )

        remaining = payload.amount
        for p in plans:
            if remaining <= 0:
                break
            debit = min(remaining, float(p["current_balance"]))
            db.execute(
                text("UPDATE public.savings_plans SET current_balance = current_balance - :amt WHERE id = :pid"),
                {"amt": debit, "pid": str(p["id"])},
            )
            remaining -= debit

        cluster = db.execute(
            text(
                "SELECT bc.id, bc.business_name, bc.is_active_for_investment, "
                "COALESCE(cs.projected_monthly_roi, 0) AS projected_monthly_roi "
                "FROM public.business_clusters bc "
                "LEFT JOIN public.cluster_snapshots cs ON cs.cluster_id = bc.id "
                "WHERE bc.id = :cid"
            ),
            {"cid": payload.cluster_id},
        ).mappings().one_or_none()

        if not cluster:
            raise HTTPException(status_code=404, detail="Business cluster not found")
        if not cluster["is_active_for_investment"]:
            raise HTTPException(status_code=400, detail="This business is not accepting investments")

        start = date.today()
        maturity = start + timedelta(days=payload.term_months * 30)

        row = db.execute(
            text(
                "INSERT INTO public.investments "
                "(investor_id, cluster_id, principal_amount, term_months, monthly_rate_pct, "
                " start_date, maturity_date, penalty_rate_pct, status) "
                "VALUES (:uid, :cid, :amt, :term, :rate, :start, :mat, :pen, 'active') "
                "RETURNING id, created_at"
            ),
            {
                "uid": user_id,
                "cid": payload.cluster_id,
                "amt": payload.amount,
                "term": payload.term_months,
                "rate": float(MONTHLY_RATE_PCT),
                "start": start,
                "mat": maturity,
                "pen": float(EARLY_WITHDRAWAL_PENALTY_PCT),
            },
        ).mappings().one()
        db.commit()

        inv_id = str(row["id"])
        today = date.today()
        days_total = (maturity - start).days
        days_elapsed = (today - start).days
        days_remaining = max(0, (maturity - today).days)

        return InvestmentDetailOut(
            id=inv_id,
            cluster_id=payload.cluster_id,
            business_name=cluster["business_name"],
            principal_amount=payload.amount,
            dividends_earned=0.0,
            total_collected=0.0,
            status="active",
            term_months=payload.term_months,
            monthly_rate_pct=float(MONTHLY_RATE_PCT),
            start_date=str(start),
            maturity_date=str(maturity),
            penalty_rate_pct=float(EARLY_WITHDRAWAL_PENALTY_PCT),
            current_yield_pct=float(cluster["projected_monthly_roi"]),
            created_at=str(row["created_at"]),
            days_remaining=days_remaining,
            is_matured=today >= maturity,
            available_dividends=0.0,
            dividend_records=[],
        )


# ---------------------------------------------------------------------------
# GET /worker/investments/portfolio
# ---------------------------------------------------------------------------

@router.get("/investments/portfolio", response_model=PortfolioSummaryOut)
@_guard
def get_investment_portfolio(user_id: str = Depends(get_current_user_id)):
    with db_session() as db:
        rows = db.execute(
            text(
                "SELECT i.id, i.cluster_id, bc.business_name, i.principal_amount, "
                "i.dividends_earned, i.total_collected, i.status, i.term_months, "
                "i.monthly_rate_pct, i.start_date, i.maturity_date, "
                "COALESCE(("
                "  SELECT SUM(dr.amount) FROM public.dividend_records dr "
                "  WHERE dr.investment_id = i.id AND dr.status = 'available'"
                "), 0) AS available_dividends "
                "FROM public.investments i "
                "JOIN public.business_clusters bc ON bc.id = i.cluster_id "
                "WHERE i.investor_id = :uid AND i.status IN ('active', 'matured') "
                "ORDER BY i.created_at DESC"
            ),
            {"uid": user_id},
        ).mappings().all()

        today = date.today()
        investments = []
        total_principal = 0.0
        total_earned = 0.0
        total_collected = 0.0
        total_available = 0.0
        active_count = 0
        matured_count = 0

        for r in rows:
            start_d = r["start_date"] if isinstance(r["start_date"], date) else date.fromisoformat(str(r["start_date"]))
            mat_d = r["maturity_date"] if isinstance(r["maturity_date"], date) else date.fromisoformat(str(r["maturity_date"]))
            days_total = max(1, (mat_d - start_d).days)
            days_elapsed = min(days_total, (today - start_d).days)
            days_remaining = max(0, (mat_d - today).days)
            is_matured = today >= mat_d
            progress = min(100.0, (days_elapsed / days_total) * 100)
            avail = float(r["available_dividends"])

            principal = float(r["principal_amount"])
            earned = float(r["dividends_earned"])
            collected = float(r["total_collected"])

            total_principal += principal
            total_earned += earned
            total_collected += collected
            total_available += avail

            if is_matured:
                matured_count += 1
            else:
                active_count += 1

            investments.append(PortfolioInvestmentOut(
                id=str(r["id"]),
                cluster_id=str(r["cluster_id"]),
                business_name=r["business_name"],
                principal_amount=principal,
                dividends_earned=earned,
                total_collected=collected,
                status="matured" if is_matured else r["status"],
                term_months=int(r["term_months"]),
                monthly_rate_pct=float(r["monthly_rate_pct"]),
                start_date=str(start_d),
                maturity_date=str(mat_d),
                days_remaining=days_remaining,
                is_matured=is_matured,
                progress_pct=round(progress, 1),
                available_dividends=avail,
            ))

        return PortfolioSummaryOut(
            total_principal=total_principal,
            total_dividends_earned=total_earned,
            total_collected=total_collected,
            total_available=total_available,
            active_count=active_count,
            matured_count=matured_count,
            investments=investments,
        )


# ---------------------------------------------------------------------------
# GET /worker/investments/{investment_id}/details
# ---------------------------------------------------------------------------

@router.get("/investments/{investment_id}/details", response_model=InvestmentDetailOut)
@_guard
def get_investment_details(investment_id: str, user_id: str = Depends(get_current_user_id)):
    with db_session() as db:
        inv = db.execute(
            text(
                "SELECT i.*, bc.business_name, "
                "COALESCE(cs.projected_monthly_roi, 0) AS projected_monthly_roi "
                "FROM public.investments i "
                "JOIN public.business_clusters bc ON bc.id = i.cluster_id "
                "LEFT JOIN public.cluster_snapshots cs ON cs.cluster_id = i.cluster_id "
                "WHERE i.id = :iid AND i.investor_id = :uid"
            ),
            {"iid": investment_id, "uid": user_id},
        ).mappings().one_or_none()

        if not inv:
            raise HTTPException(status_code=404, detail="Investment not found")

        dividends = db.execute(
            text(
                "SELECT id, period_date, amount, status, collected_at "
                "FROM public.dividend_records "
                "WHERE investment_id = :iid "
                "ORDER BY period_date DESC"
            ),
            {"iid": investment_id},
        ).mappings().all()

        today = date.today()
        start_d = inv["start_date"] if isinstance(inv["start_date"], date) else date.fromisoformat(str(inv["start_date"]))
        mat_d = inv["maturity_date"] if isinstance(inv["maturity_date"], date) else date.fromisoformat(str(inv["maturity_date"]))
        days_remaining = max(0, (mat_d - today).days)

        available_divs = sum(
            float(d["amount"]) for d in dividends if d["status"] == "available"
        )

        return InvestmentDetailOut(
            id=str(inv["id"]),
            cluster_id=str(inv["cluster_id"]),
            business_name=inv["business_name"],
            principal_amount=float(inv["principal_amount"]),
            dividends_earned=float(inv["dividends_earned"]),
            total_collected=float(inv["total_collected"]),
            status=inv["status"],
            term_months=int(inv["term_months"]),
            monthly_rate_pct=float(inv["monthly_rate_pct"]),
            start_date=str(start_d),
            maturity_date=str(mat_d),
            penalty_rate_pct=float(inv["penalty_rate_pct"]),
            current_yield_pct=float(inv["projected_monthly_roi"]),
            created_at=str(inv["created_at"]),
            days_remaining=days_remaining,
            is_matured=today >= mat_d,
            available_dividends=available_divs,
            dividend_records=[
                DividendRecordOut(
                    id=str(d["id"]),
                    period_date=str(d["period_date"]),
                    amount=float(d["amount"]),
                    status=d["status"],
                    collected_at=str(d["collected_at"]) if d["collected_at"] else None,
                )
                for d in dividends
            ],
        )


# ---------------------------------------------------------------------------
# GET /worker/dividends/history — all dividend records across every
# investment a worker holds, for the Dividend History screen. Avoids an
# N+1 client-side fetch-per-investment pattern.
# ---------------------------------------------------------------------------

class DividendHistoryItemOut(BaseModel):
    id: str
    investment_id: str
    business_name: str
    period_date: str
    amount: float
    status: str
    collected_at: Optional[str] = None


@router.get("/dividends/history", response_model=list[DividendHistoryItemOut])
@_guard
def get_dividend_history(user_id: str = Depends(get_current_user_id)):
    with db_session() as db:
        rows = db.execute(
            text(
                "SELECT dr.id, dr.investment_id, bc.business_name, dr.period_date, "
                "dr.amount, dr.status, dr.collected_at "
                "FROM public.dividend_records dr "
                "JOIN public.investments i ON i.id = dr.investment_id "
                "JOIN public.business_clusters bc ON bc.id = i.cluster_id "
                "WHERE i.investor_id = :uid "
                "ORDER BY dr.period_date DESC"
            ),
            {"uid": user_id},
        ).mappings().all()

        return [
            DividendHistoryItemOut(
                id=str(r["id"]),
                investment_id=str(r["investment_id"]),
                business_name=r["business_name"],
                period_date=str(r["period_date"]),
                amount=float(r["amount"]),
                status=r["status"],
                collected_at=str(r["collected_at"]) if r["collected_at"] else None,
            )
            for r in rows
        ]


# ---------------------------------------------------------------------------
# POST /worker/investments/{investment_id}/collect-dividends
# ---------------------------------------------------------------------------

@router.post("/investments/{investment_id}/collect-dividends", response_model=CollectDividendOut)
@_guard
def collect_dividends(investment_id: str, user_id: str = Depends(get_current_user_id)):
    with db_session() as db:
        inv = db.execute(
            text(
                "SELECT id, investor_id FROM public.investments "
                "WHERE id = :iid AND investor_id = :uid"
            ),
            {"iid": investment_id, "uid": user_id},
        ).mappings().one_or_none()

        if not inv:
            raise HTTPException(status_code=404, detail="Investment not found")

        available = db.execute(
            text(
                "SELECT id, amount FROM public.dividend_records "
                "WHERE investment_id = :iid AND status = 'available' "
                "ORDER BY period_date ASC"
            ),
            {"iid": investment_id},
        ).mappings().all()

        if not available:
            raise HTTPException(status_code=400, detail="No dividends available to collect")

        total = sum(float(d["amount"]) for d in available)
        record_ids = [str(d["id"]) for d in available]

        for rid in record_ids:
            db.execute(
                text(
                    "UPDATE public.dividend_records "
                    "SET status = 'collected', collected_at = NOW() "
                    "WHERE id = :rid"
                ),
                {"rid": rid},
            )

        db.execute(
            text(
                "UPDATE public.investments "
                "SET total_collected = total_collected + :amt "
                "WHERE id = :iid"
            ),
            {"amt": total, "iid": investment_id},
        )

        db.commit()

    return CollectDividendOut(
        investment_id=investment_id,
        collected_amount=total,
        records_collected=len(record_ids),
        message=f"₦{total:,.2f} in dividends collected successfully.",
    )


# ---------------------------------------------------------------------------
# POST /worker/investments/{investment_id}/withdraw
# ---------------------------------------------------------------------------

@router.post("/investments/{investment_id}/withdraw", response_model=WithdrawOut)
@_guard
def withdraw_investment(investment_id: str, user_id: str = Depends(get_current_user_id)):
    with db_session() as db:
        inv = db.execute(
            text(
                "SELECT i.id, i.principal_amount, i.dividends_earned, i.total_collected, "
                "i.penalty_rate_pct, i.maturity_date, i.status, i.start_date "
                "FROM public.investments i "
                "WHERE i.id = :iid AND i.investor_id = :uid AND i.status = 'active'"
            ),
            {"iid": investment_id, "uid": user_id},
        ).mappings().one_or_none()

        if not inv:
            raise HTTPException(status_code=404, detail="Active investment not found")

        today = date.today()
        mat_d = inv["maturity_date"] if isinstance(inv["maturity_date"], date) else date.fromisoformat(str(inv["maturity_date"]))
        is_early = today < mat_d

        principal = float(inv["principal_amount"])
        penalty_pct = float(inv["penalty_rate_pct"]) if is_early else 0.0

        uncollected = db.execute(
            text(
                "SELECT COALESCE(SUM(amount), 0) AS total "
                "FROM public.dividend_records "
                "WHERE investment_id = :iid AND status = 'available'"
            ),
            {"iid": investment_id},
        ).mappings().one()
        uncollected_amt = float(uncollected["total"])

        gross = principal + uncollected_amt
        penalty_amount = round(gross * penalty_pct / 100, 2) if is_early else 0.0
        net_amount = round(gross - penalty_amount, 2)

        if is_early:
            db.execute(
                text(
                    "INSERT INTO public.withdrawal_records "
                    "(investment_id, requested_amount, penalty_pct, penalty_amount, net_amount) "
                    "VALUES (:iid, :req, :ppct, :pamt, :net)"
                ),
                {
                    "iid": investment_id,
                    "req": gross,
                    "ppct": penalty_pct,
                    "pamt": penalty_amount,
                    "net": net_amount,
                },
            )

        db.execute(
            text(
                "UPDATE public.dividend_records "
                "SET status = 'collected', collected_at = NOW() "
                "WHERE investment_id = :iid AND status = 'available'"
            ),
            {"iid": investment_id},
        )

        db.execute(
            text(
                "UPDATE public.investments "
                "SET status = 'closed', withdrawn_at = NOW(), "
                "    total_collected = total_collected + :uncollected "
                "WHERE id = :iid"
            ),
            {"uncollected": uncollected_amt, "iid": investment_id},
        )

        db.commit()

    return WithdrawOut(
        investment_id=investment_id,
        principal_returned=principal,
        uncollected_dividends=uncollected_amt,
        penalty_pct=penalty_pct,
        penalty_amount=penalty_amount,
        net_amount=net_amount,
        is_early=is_early,
        message=(
            f"Early withdrawal: ₦{net_amount:,.2f} returned (₦{penalty_amount:,.2f} penalty applied)."
            if is_early
            else f"Investment matured! ₦{net_amount:,.2f} returned in full."
        ),
    )


# ---------------------------------------------------------------------------
# POST /worker/investments/accrue-dividends  (cron trigger — not a user action)
# ---------------------------------------------------------------------------

@router.post("/investments/accrue-dividends")
@_guard
def trigger_dividend_accrual(x_cron_secret: str = Header(default="", alias="X-Cron-Secret")):
    if not settings.worker_cron_secret or not hmac.compare_digest(
        x_cron_secret, settings.worker_cron_secret
    ):
        # Fail closed: this runs platform-wide for every investor, so it must
        # never be reachable by an ordinary authenticated mobile session.
        raise HTTPException(status_code=403, detail="Not authorized to trigger accrual")

    with db_session() as db:
        result = db.execute(text("SELECT public.accrue_monthly_dividends() AS cnt"))
        count = result.scalar()
        db.commit()
    return {"accrued_count": count, "message": f"Accrued dividends for {count} investments."}
