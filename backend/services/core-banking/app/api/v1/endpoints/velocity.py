"""
Sales Velocity Score — rule-based, auditable scoring.

Formula (all weights sum to 100):
  - Units sold per day, 30-day rolling average (40%)
  - Restock consistency: days with stock movement / 30 (30%)
  - On-time repayment ratio (30%)

Score range: 0–100, stored with history for future retraining.

Prefix: /v1/velocity
Tags:   velocity
"""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select, func, BigInteger, cast
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.infrastructure.auth import get_current_user_id
from app.models.inventory import SalesTransaction, SalesTransactionItem, StockMovement
from app.models.loan_application import LoanApplication
from app.models.loan_repayment_schedule import LoanRepaymentSchedule
from app.models.wallet import Wallet
from app.models.velocity_score import VelocityScore
from app.services import loan_application_service


router = APIRouter()

WEIGHT_SALES = 0.40
WEIGHT_RESTOCK = 0.30
WEIGHT_REPAYMENT = 0.30


class VelocityScoreOut(BaseModel):
    score: float
    credit_limit_kobo: int
    credit_limit_naira: float
    units_per_day: float
    restock_consistency_pct: float
    repayment_ratio_pct: float
    breakdown: dict
    calculated_at: datetime
    model_config = ConfigDict(from_attributes=True)


class VelocityHistoryOut(BaseModel):
    scores: List[VelocityScoreOut]


def _calc_units_per_day(db: Session, user_id: str, window_days: int = 30) -> float:
    cutoff = datetime.now(timezone.utc) - timedelta(days=window_days)
    result = db.execute(
        select(func.coalesce(func.sum(SalesTransactionItem.quantity_sold), 0))
        .join(SalesTransaction, SalesTransaction.id == SalesTransactionItem.sale_id)
        .where(
            SalesTransaction.owner_id == user_id,
            SalesTransaction.status.in_(["completed", "delivered"]),
            SalesTransaction.transaction_date >= cutoff,
        )
    ).scalar()
    return round(float(result) / window_days, 2)


def _calc_restock_consistency(db: Session, user_id: str, window_days: int = 30) -> float:
    cutoff = datetime.now(timezone.utc) - timedelta(days=window_days)
    distinct_days = db.execute(
        select(func.count(func.distinct(func.date(StockMovement.created_at))))
        .where(
            StockMovement.owner_id == user_id,
            StockMovement.movement_type.in_(["purchase", "restock", "stock_in", "adjustment"]),
            StockMovement.created_at >= cutoff,
        )
    ).scalar() or 0
    return round(min(float(distinct_days) / window_days, 1.0), 4)


def _calc_repayment_ratio(db: Session, user_id: str) -> float:
    """On-time ratio across installments that have reached their due date —
    future installments haven't had a chance to be on-time or late yet."""
    today = datetime.now(timezone.utc).date()
    schedules = db.execute(
        select(LoanRepaymentSchedule)
        .join(LoanApplication, LoanApplication.id == LoanRepaymentSchedule.loan_application_id)
        .where(LoanApplication.user_id == user_id, LoanRepaymentSchedule.due_date <= today)
    ).scalars().all()

    if not schedules:
        return 1.0

    on_time = sum(
        1 for s in schedules
        if s.status == "paid" and s.paid_at is not None and s.paid_at.date() <= s.due_date
    )
    return round(on_time / len(schedules), 4)


def _compute_score(db: Session, user_id: str) -> dict:
    upd = _calc_units_per_day(db, user_id)
    restock = _calc_restock_consistency(db, user_id)
    repayment = _calc_repayment_ratio(db, user_id)

    upd_normalized = min(upd / 50.0, 1.0)

    raw_score = (
        upd_normalized * WEIGHT_SALES * 100
        + restock * WEIGHT_RESTOCK * 100
        + repayment * WEIGHT_REPAYMENT * 100
    )
    score = round(min(raw_score, 100.0), 1)

    # credit_limit_kobo used to be derived independently from this score
    # (score * 5,000 naira/point) — a different formula from, and often a
    # different number than, what actually gates loan disbursement. Now
    # sourced from the same percentile-rank eligibility check loans.py uses,
    # so this card and the loan application flow can't show conflicting
    # numbers for the same thing.
    credit_limit_kobo = loan_application_service.check_eligibility(db, user_id)["credit_limit_kobo"]

    return {
        "score": score,
        "units_per_day": upd,
        "restock_consistency": restock,
        "repayment_ratio": repayment,
        "credit_limit_kobo": credit_limit_kobo,
        "breakdown": {
            "sales_velocity_component": round(upd_normalized * WEIGHT_SALES * 100, 1),
            "restock_component": round(restock * WEIGHT_RESTOCK * 100, 1),
            "repayment_component": round(repayment * WEIGHT_REPAYMENT * 100, 1),
            "weights": {"sales": WEIGHT_SALES, "restock": WEIGHT_RESTOCK, "repayment": WEIGHT_REPAYMENT},
            "explanation": (
                f"Score of {score}/100. "
                f"You sell ~{upd} units/day (30d avg). "
                f"Restocked on {round(restock*100)}% of days. "
                f"Repayment rate: {round(repayment*100)}%."
            ),
        },
    }


@router.get("/score", response_model=VelocityScoreOut)
def get_velocity_score(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    data = _compute_score(db, user_id)

    record = VelocityScore(
        user_id=user_id,
        score=data["score"],
        units_per_day=data["units_per_day"],
        restock_consistency=data["restock_consistency"],
        repayment_ratio=data["repayment_ratio"],
        credit_limit_kobo=data["credit_limit_kobo"],
        breakdown=data["breakdown"],
    )
    db.add(record)
    db.commit()

    return VelocityScoreOut(
        score=data["score"],
        credit_limit_kobo=data["credit_limit_kobo"],
        credit_limit_naira=data["credit_limit_kobo"] / 100,
        units_per_day=data["units_per_day"],
        restock_consistency_pct=round(data["restock_consistency"] * 100, 1),
        repayment_ratio_pct=round(data["repayment_ratio"] * 100, 1),
        breakdown=data["breakdown"],
        calculated_at=record.calculated_at,
    )


@router.get("/history", response_model=VelocityHistoryOut)
def get_velocity_history(
    limit: int = 30,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    rows = db.execute(
        select(VelocityScore)
        .where(VelocityScore.user_id == user_id)
        .order_by(VelocityScore.calculated_at.desc())
        .limit(limit)
    ).scalars().all()

    return VelocityHistoryOut(
        scores=[
            VelocityScoreOut(
                score=r.score,
                credit_limit_kobo=r.credit_limit_kobo,
                credit_limit_naira=r.credit_limit_kobo / 100,
                units_per_day=r.units_per_day,
                restock_consistency_pct=round(r.restock_consistency * 100, 1),
                repayment_ratio_pct=round(r.repayment_ratio * 100, 1),
                breakdown=r.breakdown,
                calculated_at=r.calculated_at,
            )
            for r in rows
        ]
    )
