from __future__ import annotations

from pydantic import BaseModel, Field


class PriceIntelRequest(BaseModel):
    current_price_kobo: int = Field(..., ge=0)
    market_avg_price_kobo: int = Field(..., ge=0)
    stock_level_ratio: float = Field(default=0.5, ge=0.0, le=1.0)  # 0 => out, 1 => full


class PriceIntelResponse(BaseModel):
    recommended_price_kobo: int
    delta_kobo: int
    note: str


def recommend_price(req: PriceIntelRequest) -> PriceIntelResponse:
    # Simple rule: if over market and stock is high, nudge down; if under market and stock is low, nudge up.
    target = req.market_avg_price_kobo
    if req.current_price_kobo > target and req.stock_level_ratio > 0.7:
        recommended = int(target * 0.98)
        note = "High stock + above market: reduce slightly to increase velocity."
    elif req.current_price_kobo < target and req.stock_level_ratio < 0.3:
        recommended = int(target * 1.02)
        note = "Low stock + below market: increase slightly to protect margin."
    else:
        recommended = int((req.current_price_kobo * 0.6) + (target * 0.4))
        note = "Blend current with market average."

    return PriceIntelResponse(
        recommended_price_kobo=max(0, recommended),
        delta_kobo=max(0, recommended) - req.current_price_kobo,
        note=note,
    )

