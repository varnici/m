from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class CreditDecision:
    velocity_score: float
    recommended_limit_kobo: int
    risk_tier: str


def sales_velocity_score(units_sold_30d: int, avg_margin_pct: float, repayment_on_time_ratio: float) -> float:
    """
    MVP heuristic scoring.
    Replace with ML (XGBoost) once you have enough training data.
    """
    base = units_sold_30d * max(0.1, min(2.0, avg_margin_pct / 20.0))
    stability = 0.5 + 0.5 * max(0.0, min(1.0, repayment_on_time_ratio))
    return float(base * stability)


def decide_credit_limit(*, velocity_score: float, monthly_income_kobo: int | None = None) -> CreditDecision:
    if monthly_income_kobo is not None:
        # conservative starting point for 9–5 users
        recommended = int(min(monthly_income_kobo * 0.25, 150_000_00) + velocity_score * 50)
    else:
        recommended = int(min(500_000_00, velocity_score * 200))

    if velocity_score < 100:
        tier = "low"
    elif velocity_score < 500:
        tier = "medium"
    else:
        tier = "high"
    return CreditDecision(velocity_score=velocity_score, recommended_limit_kobo=max(0, recommended), risk_tier=tier)

