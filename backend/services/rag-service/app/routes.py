from __future__ import annotations

from typing import List, Optional
from pydantic import BaseModel
from fastapi import APIRouter, Query

router = APIRouter()


class ChatRequest(BaseModel):
    user_id: str
    message: str


class ChatResponse(BaseModel):
    answer: str
    citations: list[str] = []


from app.services.personalization import (
    PersonalizationRequest, 
    RecommendationResponse, 
    store_inventory_embeddings, 
    get_personalized_suggestions
)

@router.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    # Placeholder: wire to vector store + LLM later.
    return ChatResponse(
        answer=f"(stub) I received: {req.message}",
        citations=["documentation.md"],
    )

@router.post("/inventory/personalize")
def personalize(req: PersonalizationRequest):
    store_inventory_embeddings(req)
    return {"status": "success", "message": "Inventory embeddings stored."}

@router.get("/inventory/suggest", response_model=RecommendationResponse)
def suggest(user_id: str, shop_id: str, query: str):
    return get_personalized_suggestions(user_id, shop_id, query)


# ===================== INTELLIGENCE ENDPOINTS =====================

@router.get("/intelligence/market-ticker")
def get_market_ticker():
    """
    Get live-simulated market tickers for AG, Zenith, Airtel, and NGX ASI.
    """
    from app.tasks.refresh_intelligence import simulate_market_tickers
    tickers = simulate_market_tickers()
    return tickers


@router.get("/intelligence/articles")
def get_articles(
    category: Optional[str] = Query(None, description="Filter by article category"),
    limit: int = Query(10, ge=1, le=50)
):
    """
    Get latest trade alerts, news, and CBN updates.
    """
    from app.services.recommendations import RecommendationService
    articles = RecommendationService.fetch_latest_articles()
    if category:
        articles = [a for a in articles if a.category.lower() == category.lower()]
    return articles[:limit]


@router.get("/intelligence/for-you")
def get_personalized_articles(
    user_id: str = Query(..., description="ID of the user profile"),
    limit: int = Query(3, ge=1, le=10)
):
    """
    Get personalized recommendations and news tailored to user profile and tier.
    """
    from app.services.recommendations import RecommendationService
    return RecommendationService.get_personalized_intelligence(user_id, limit=limit)


@router.post("/intelligence/refresh")
async def trigger_refresh():
    """
    Manually triggers the background intelligence updater to refresh RSS articles and market tickers.
    """
    from app.tasks.refresh_intelligence import refresh_all_intelligence
    return await refresh_all_intelligence()


