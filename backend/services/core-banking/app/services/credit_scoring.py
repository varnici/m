






"""
Trust Score Service
All scoring logic lives here. The service pulls from the existing Sales, Loan,
Wallet, and Repayment models and produces a 0–100 composite score.

Weights (must sum to 1.0):
  - Sales velocity:       35%
  - Repayment history:    30%
  - Savings behavior:     20%
  - Pool participation:   15%
"""

from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.trust_score import TrustScore
from app.models.inventory import SalesTransaction
from app.models.loan import Loan
from app.models.repayment import Repayment
from app.models.wallet import Wallet
from app.schemas.trust_score_schemas import (
    TrustScoreResponse,
    TrustScoreBreakdown,
    TrustScoreComponentDetail,
    TrustScoreSnapshot,
    TrustScoreRefreshResponse,
)

# ── Tier thresholds ────────────────────────────────────────────────────────────
TIERS = [
    (0,  "Emerging"),
    (40, "Trusted"),
    (65, "Established"),
    (85, "Elite"),
]

# How long a cached score stays valid before recomputation is triggered
CACHE_TTL_MINUTES = 60

# ── Component weights (must sum to 1.0) ────────────────────────────────────────
WEIGHTS = {
    "sales_velocity":    0.35,
    "repayment_history": 0.30,
    "savings_behavior":  0.20,
    "pool_participation": 0.15,
}


def _tier_for_score(score: float) -> str:
    tier = TIERS[0][1]
    for threshold, label in TIERS:
        if score >= threshold:
            tier = label
    return tier


def _next_tier(current_tier: str) -> Optional[str]:
    names = [t[1] for t in TIERS]
    idx = names.index(current_tier)
    return names[idx + 1] if idx + 1 < len(names) else None


def _points_to_next(score: float, current_tier: str) -> Optional[float]:
    for threshold, label in TIERS:
        if label == current_tier:
            # Find the next threshold
            idx = TIERS.index((threshold, label))
            if idx + 1 < len(TIERS):
                return round(TIERS[idx + 1][0] - score, 1)
    return None


def _component_label(score: float) -> str:
    if score >= 85:
        return "Excellent"
    if score >= 65:
        return "Strong"
    if score >= 40:
        return "Growing"
    return "Needs work"


def _build_component(raw_score: float, weight: float) -> TrustScoreComponentDetail:
    clamped = max(0.0, min(100.0, raw_score))
    return TrustScoreComponentDetail(
        score=round(clamped, 1),
        weight=weight,
        weighted_contribution=round(clamped * weight, 2),
        label=_component_label(clamped),
    )


# ── Sub-score calculators ──────────────────────────────────────────────────────

async def _score_sales_velocity(user_id: UUID, db: AsyncSession) -> tuple[float, int]:
    """
    Score based on:
      - Number of sales in the last 30 days  (volume)
      - Consistency: at least 1 sale per day in the last 7 days  (streak bonus)
    Max raw score: 100
    """
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    seven_days_ago = datetime.utcnow() - timedelta(days=7)

    result = await db.execute(
        select(func.count(SalesTransaction.id)).where(
            SalesTransaction.owner_id == str(user_id),
            SalesTransaction.transaction_date >= thirty_days_ago,
        )
    )
    total_sales: int = result.scalar() or 0

    # Volume score: caps at 90 after 60 sales in 30 days
    volume_score = min(90.0, (total_sales / 60) * 90)

    # Streak bonus: check last 7 days
    result7 = await db.execute(
        select(func.count(func.distinct(func.date(SalesTransaction.transaction_date)))).where(
            SalesTransaction.owner_id == str(user_id),
            SalesTransaction.transaction_date >= seven_days_ago,
        )
    )
    active_days: int = result7.scalar() or 0
    streak_bonus = (active_days / 7) * 10  # up to 10 bonus points

    return min(100.0, volume_score + streak_bonus), total_sales


async def _score_repayment_history(user_id: UUID, db: AsyncSession) -> tuple[float, int]:
    """
    Score based on:
      - On-time repayments vs total due repayments
      - Penalty for missed repayments
    """
    result = await db.execute(
        select(Repayment).where(Repayment.user_id == user_id)
    )
    repayments = result.scalars().all()

    if not repayments:
        # New user — neutral score, not penalised
        return 50.0, 0

    total = len(repayments)
    on_time = sum(1 for r in repayments if getattr(r, "status", None) == "paid" and not getattr(r, "is_late", False))
    missed = sum(1 for r in repayments if getattr(r, "status", None) == "missed")

    on_time_ratio = (on_time / total) if total else 0
    base_score = on_time_ratio * 100

    # Each missed repayment subtracts 15 points, floor at 0
    penalty = missed * 15
    score = max(0.0, base_score - penalty)

    return min(100.0, score), on_time


async def _score_savings_behavior(user_id: UUID, db: AsyncSession) -> tuple[float, int]:
    """
    Score based on:
      - Number of active savings goals in the wallet
      - Average progress toward goals
    """
    result = await db.execute(
        select(Wallet).where(Wallet.user_id == user_id)
    )
    wallet = result.scalar_one_or_none()

    if not wallet:
        return 0.0, 0

    # Pull savings goals if stored as a JSON column or related table
    # Using wallet.savings_goals_count and wallet.savings_progress_pct as example fields
    goals_count: int = getattr(wallet, "savings_goals_count", 0) or 0
    avg_progress: float = getattr(wallet, "savings_avg_progress", 0.0) or 0.0

    # Score: 20 pts per active goal (cap at 3 goals = 60), plus progress ratio
    goal_score = min(60.0, goals_count * 20)
    progress_score = avg_progress * 40  # progress ratio × 40 pts

    return min(100.0, goal_score + progress_score), goals_count


async def _score_pool_participation(user_id: UUID, db: AsyncSession) -> tuple[float, int]:
    """
    Score based on:
      - Number of pool contributions made
      - Whether any pool contribution was missed
    """
    result = await db.execute(
        select(func.count(Repayment.id)).where(
            Repayment.user_id == user_id,
            Repayment.repayment_type == "pool",  # distinguish pool vs loan repayments
        )
    )
    pool_contributions: int = result.scalar() or 0

    # 10 pts per contribution, caps at 100 after 10 contributions
    score = min(100.0, pool_contributions * 10)
    return score, pool_contributions


# ── Insight generator ─────────────────────────────────────────────────────────

def _generate_insight(
    total_score: float,
    sales_score: float,
    repayment_score: float,
    savings_score: float,
    pool_score: float,
) -> str:
    """
    Rule-based coaching tip. Replace with RAG-service call for richer insights.
    """
    weakest = min(
        ("sales", sales_score),
        ("repayment", repayment_score),
        ("savings", savings_score),
        ("pool", pool_score),
        key=lambda x: x[1],
    )

    tips = {
        "sales": "Recording more daily sales is the fastest way to grow your trust score — even small transactions count.",
        "repayment": "Consistent on-time repayments are your most powerful lever. Each missed payment costs 15 points.",
        "savings": "Set at least one savings goal in your wallet to unlock the savings score component.",
        "pool": "Joining a pool and making consistent contributions adds up to 15% to your total score.",
    }

    if total_score >= 85:
        return "You have reached Elite status — maintain your streak to stay here."
    if total_score >= 65:
        return f"You're Established. Focus on {weakest[0].replace('_', ' ')} to reach Elite tier."
    if total_score >= 40:
        return f"You're Trusted. {tips[weakest[0]]}"
    return f"You're Emerging. {tips[weakest[0]]}"


# ── Public API ─────────────────────────────────────────────────────────────────

async def get_trust_score(user_id: UUID, db: AsyncSession) -> TrustScoreResponse:
    """
    Returns a trust score for the given user.
    Uses cached value if it was computed within CACHE_TTL_MINUTES.
    """
    result = await db.execute(
        select(TrustScore).where(TrustScore.user_id == user_id)
    )
    cached: Optional[TrustScore] = result.scalar_one_or_none()

    cache_valid = (
        cached is not None
        and (datetime.utcnow() - cached.computed_at) < timedelta(minutes=CACHE_TTL_MINUTES)
    )

    if cache_valid:
        return _build_response(cached, is_cached=True)

    return await _compute_and_save(user_id, db, existing=cached)


async def refresh_trust_score(user_id: UUID, db: AsyncSession) -> TrustScoreRefreshResponse:
    """
    Forces a fresh recomputation regardless of cache age.
    Called by POST /trust-score/{user_id}/refresh.
    """
    result = await db.execute(
        select(TrustScore).where(TrustScore.user_id == user_id)
    )
    existing: Optional[TrustScore] = result.scalar_one_or_none()
    previous_score = existing.total_score if existing else 0.0
    previous_tier = existing.tier if existing else "Emerging"

    updated = await _compute_and_save(user_id, db, existing=existing)

    return TrustScoreRefreshResponse(
        user_id=user_id,
        previous_score=previous_score,
        new_score=updated.total_score,
        delta=round(updated.total_score - previous_score, 1),
        tier_changed=updated.tier != previous_tier,
        new_tier=updated.tier,
        computed_at=updated.computed_at,
    )


# ── Internal helpers ───────────────────────────────────────────────────────────

async def _compute_and_save(
    user_id: UUID,
    db: AsyncSession,
    existing: Optional[TrustScore],
) -> TrustScoreResponse:
    sales_raw, total_sales = await _score_sales_velocity(user_id, db)
    repay_raw, total_repaid = await _score_repayment_history(user_id, db)
    savings_raw, active_goals = await _score_savings_behavior(user_id, db)
    pool_raw, pool_count = await _score_pool_participation(user_id, db)

    total = (
        sales_raw   * WEIGHTS["sales_velocity"]
        + repay_raw * WEIGHTS["repayment_history"]
        + savings_raw * WEIGHTS["savings_behavior"]
        + pool_raw  * WEIGHTS["pool_participation"]
    )
    total = round(min(100.0, max(0.0, total)), 1)
    tier = _tier_for_score(total)
    insight = _generate_insight(total, sales_raw, repay_raw, savings_raw, pool_raw)

    now = datetime.utcnow()

    if existing:
        existing.total_score = total
        existing.sales_velocity_score = round(sales_raw, 1)
        existing.repayment_history_score = round(repay_raw, 1)
        existing.savings_behavior_score = round(savings_raw, 1)
        existing.pool_participation_score = round(pool_raw, 1)
        existing.tier = tier
        existing.total_sales_recorded = total_sales
        existing.total_loans_repaid = total_repaid
        existing.active_savings_goals = active_goals
        existing.pool_contributions_count = pool_count
        existing.insight = insight
        existing.computed_at = now
        record = existing
    else:
        record = TrustScore(
            user_id=user_id,
            total_score=total,
            sales_velocity_score=round(sales_raw, 1),
            repayment_history_score=round(repay_raw, 1),
            savings_behavior_score=round(savings_raw, 1),
            pool_participation_score=round(pool_raw, 1),
            tier=tier,
            total_sales_recorded=total_sales,
            total_loans_repaid=total_repaid,
            active_savings_goals=active_goals,
            pool_contributions_count=pool_count,
            insight=insight,
            computed_at=now,
        )
        db.add(record)

    await db.commit()
    await db.refresh(record)
    return _build_response(record, is_cached=False)


def _build_response(record: TrustScore, is_cached: bool) -> TrustScoreResponse:
    breakdown = TrustScoreBreakdown(
        sales_velocity=_build_component(record.sales_velocity_score, WEIGHTS["sales_velocity"]),
        repayment_history=_build_component(record.repayment_history_score, WEIGHTS["repayment_history"]),
        savings_behavior=_build_component(record.savings_behavior_score, WEIGHTS["savings_behavior"]),
        pool_participation=_build_component(record.pool_participation_score, WEIGHTS["pool_participation"]),
    )
    snapshot = TrustScoreSnapshot(
        total_sales_recorded=record.total_sales_recorded,
        total_loans_repaid=record.total_loans_repaid,
        active_savings_goals=record.active_savings_goals,
        pool_contributions_count=record.pool_contributions_count,
    )
    return TrustScoreResponse(
        user_id=record.user_id,
        total_score=record.total_score,
        tier=record.tier,
        tier_next=_next_tier(record.tier),
        points_to_next_tier=_points_to_next(record.total_score, record.tier),
        breakdown=breakdown,
        snapshot=snapshot,
        insight=record.insight,
        computed_at=record.computed_at,
        is_cached=is_cached,
    )



















