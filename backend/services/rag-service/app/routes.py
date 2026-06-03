from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.models.schemas import IngestRequest, IngestResponse, QueryRequest, QueryResponse, RetrievalMode
from app.services.personalization import (
    PersonalizationRequest,
    RecommendationResponse,
    get_personalized_suggestions,
    store_inventory_embeddings,
)
from app.services.rag_engine import engine

router = APIRouter()


class ChatRequest(BaseModel):
    user_id: str
    message: str
    tenant_id: str | None = None
    shop_id: str | None = None


@router.post("/ingest", response_model=IngestResponse)
def ingest(req: IngestRequest):
    if not req.documents and not req.business_snapshot:
        raise HTTPException(status_code=400, detail="documents or business_snapshot is required")
    return engine.ingest(req)


@router.post("/query", response_model=QueryResponse)
def query(req: QueryRequest):
    return engine.answer(req)


@router.post("/chat", response_model=QueryResponse)
def chat(req: ChatRequest):
    return engine.answer(
        QueryRequest(
            tenant_id=req.tenant_id or req.user_id,
            user_id=req.user_id,
            shop_id=req.shop_id,
            message=req.message,
            mode=RetrievalMode.hybrid,
        )
    )


@router.post("/inventory/personalize")
def personalize(req: PersonalizationRequest):
    response = store_inventory_embeddings(req)
    return {"status": "success", "message": "Inventory embeddings stored.", "indexed": response.model_dump()}


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
