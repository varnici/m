from __future__ import annotations

from pydantic import BaseModel
from fastapi import APIRouter

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

