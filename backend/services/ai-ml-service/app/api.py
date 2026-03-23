from __future__ import annotations

from fastapi import APIRouter

from app.services.risk_scoring import RiskScoreRequest, RiskScoreResponse, score_risk
from app.services.price_intelligence import PriceIntelRequest, PriceIntelResponse, recommend_price

router = APIRouter()


@router.post("/risk/score", response_model=RiskScoreResponse)
def risk_score(payload: RiskScoreRequest):
    return score_risk(payload)


@router.post("/pricing/recommend", response_model=PriceIntelResponse)
def pricing(payload: PriceIntelRequest):
    return recommend_price(payload)

