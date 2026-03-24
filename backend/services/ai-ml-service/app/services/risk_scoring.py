from __future__ import annotations

from pydantic import BaseModel, Field


class RiskScoreRequest(BaseModel):
    user_trust_level: str = "bronze"
    units_sold_30d: int = Field(default=0, ge=0)
    missed_repayments_90d: int = Field(default=0, ge=0)
    category_risk: float = Field(default=0.5, ge=0.0, le=1.0)


class RiskScoreResponse(BaseModel):
    risk_score: float
    risk_band: str
    reason: str


def score_risk(req: RiskScoreRequest) -> RiskScoreResponse:
    trust_weight = {"bronze": 0.8, "silver": 0.6, "gold": 0.4, "platinum": 0.25}.get(req.user_trust_level, 0.8)
    velocity_bonus = min(0.4, req.units_sold_30d / 500.0)
    missed_penalty = min(0.6, req.missed_repayments_90d * 0.2)

    # higher score => higher risk
    raw = (req.category_risk * trust_weight) + missed_penalty - velocity_bonus
    risk = float(max(0.0, min(1.0, raw)))

    if risk < 0.25:
        band = "low"
    elif risk < 0.6:
        band = "medium"
    else:
        band = "high"

    return RiskScoreResponse(
        risk_score=risk,
        risk_band=band,
        reason="Heuristic score (replace with trained model in Phase 2).",
    )

