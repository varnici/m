"""
Layer 1 — 9-5 Worker Module endpoints.

Prefix: /v1/worker
Tags:   worker-module
"""
from __future__ import annotations

import hashlib
import hmac
import os
from decimal import Decimal
from typing import Literal, Optional

from fastapi import APIRouter, Header, HTTPException, Query
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import select, func, update
from sqlalchemy.orm import Session

from app.infrastructure.database import db_session

router = APIRouter()

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
# Helpers: raw SQL via db_session (no ORM models — tables live in Supabase)
# ---------------------------------------------------------------------------

def _fetch_profile(db: Session, user_id: str) -> dict:
    row = db.execute(
        "SELECT id, full_name, bvn_verified, virtual_account_number, virtual_account_bank "
        "FROM public.profiles WHERE id = :uid",
        {"uid": user_id},
    ).mappings().one_or_none()
    if row is None:
        raise HTTPException(status_code=404, detail="Profile not found")
    return dict(row)


def _fetch_savings_plans(db: Session, user_id: str) -> list[dict]:
    rows = db.execute(
        "SELECT id, target_name, target_amount, current_balance, automated_rule, "
        "rule_amount, is_achieved FROM public.savings_plans WHERE user_id = :uid",
        {"uid": user_id},
    ).mappings().all()
    return [dict(r) for r in rows]


def _fetch_investments(db: Session, user_id: str) -> list[dict]:
    rows = db.execute(
        "SELECT i.id, i.cluster_id, bc.business_name, i.principal_amount, "
        "i.dividends_earned, i.status, i.created_at, "
        "COALESCE(cs.projected_monthly_roi, 0) AS projected_monthly_roi "
        "FROM public.investments i "
        "JOIN public.business_clusters bc ON bc.id = i.cluster_id "
        "LEFT JOIN public.cluster_snapshots cs ON cs.cluster_id = i.cluster_id "
        "WHERE i.investor_id = :uid AND i.status = 'active'",
        {"uid": user_id},
    ).mappings().all()
    return [dict(r) for r in rows]


# ---------------------------------------------------------------------------
# GET /worker/dashboard/summary
# ---------------------------------------------------------------------------

@router.get("/dashboard/summary", response_model=DashboardSummaryOut)
def get_dashboard_summary(user_id: str = Query(..., description="Authenticated user UUID")):
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

        rows = db.execute(sql, params).mappings().all()

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
def configure_savings_rules(payload: ConfigureRulesIn):
    with db_session() as db:
        result = db.execute(
            "UPDATE public.savings_plans SET automated_rule = :rule, rule_amount = :amount "
            "WHERE id = :plan_id RETURNING id",
            {
                "rule": payload.automated_rule,
                "amount": payload.rule_amount,
                "plan_id": payload.plan_id,
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
# POST /worker/payments/webhook
# ---------------------------------------------------------------------------

_WEBHOOK_SECRET = os.getenv("PAYMENT_WEBHOOK_SECRET", "dev-secret-change-in-prod")


def _verify_signature(payload_bytes: bytes, signature_header: str) -> bool:
    expected = hmac.new(
        _WEBHOOK_SECRET.encode(), payload_bytes, hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature_header)


@router.post("/payments/webhook", response_model=WebhookAckOut)
async def payments_webhook(
    payload: WebhookPayloadIn,
    x_webhook_signature: str = Header(..., alias="X-Webhook-Signature"),
):
    import json

    raw_body = json.dumps(payload.model_dump(), default=str).encode()
    if not _verify_signature(raw_body, x_webhook_signature):
        raise HTTPException(status_code=401, detail="Invalid webhook signature")

    with db_session() as db:
        profile_row = db.execute(
            "SELECT id FROM public.profiles WHERE virtual_account_number = :acct",
            {"acct": payload.destination_account},
        ).mappings().one_or_none()

        if profile_row is None:
            return WebhookAckOut(
                received=True,
                user_id=None,
                credited_amount_naira=0,
                message="No profile matched this virtual account — event acknowledged.",
            )

        user_id = str(profile_row["id"])
        amount_naira = payload.amount_kobo / 100

        # Atomically credit the first non-achieved savings plan, else wallet
        plan_row = db.execute(
            "SELECT id FROM public.savings_plans "
            "WHERE user_id = :uid AND is_achieved = FALSE "
            "ORDER BY created_at ASC LIMIT 1",
            {"uid": user_id},
        ).mappings().one_or_none()

        if plan_row:
            db.execute(
                "UPDATE public.savings_plans "
                "SET current_balance = current_balance + :amt "
                "WHERE id = :plan_id",
                {"amt": amount_naira, "plan_id": str(plan_row["id"])},
            )
            target_table = "savings_plan"
        else:
            target_table = "wallet (no active plan)"

        db.commit()

    return WebhookAckOut(
        received=True,
        user_id=user_id,
        credited_amount_naira=amount_naira,
        message=f"₦{amount_naira:,.2f} credited to {target_table}.",
    )
