from typing import Any, List, Optional
from pydantic import BaseModel
from app.core.config import settings
from app.models.schemas import (
    BusinessEntity,
    BusinessRelation,
    BusinessSnapshot,
    DocumentInput,
    IngestRequest,
    Modality,
    MultimodalPart,
    QueryRequest,
)
from app.services.rag_engine import engine

supabase: Optional[Any] = None
if settings.supabase_url.startswith(("http://", "https://")):
    try:
        from supabase import create_client

        supabase = create_client(settings.supabase_url, settings.supabase_key)
    except Exception:
        supabase = None

class InventoryItem(BaseModel):
    name: str
    category: str
    metadata: Optional[dict[str, Any]] = {}

class PersonalizationRequest(BaseModel):
    user_id: str
    shop_id: str
    items: List[InventoryItem]

class RecommendationResponse(BaseModel):
    suggested_inventory: List[str]
    context_reason: str

def store_inventory_embeddings(req: PersonalizationRequest):
    """
    Indexes shop inventory as tenant-scoped RAG documents and graph entities.
    """
    documents: list[DocumentInput] = []
    entities: list[BusinessEntity] = []
    relations: list[BusinessRelation] = []

    shop_entity_id = f"shop:{req.shop_id}"
    entities.append(
        BusinessEntity(
            entity_id=shop_entity_id,
            entity_type="store",
            name=f"Shop {req.shop_id}",
            attributes={"user_id": req.user_id},
        )
    )
    for item in req.items:
        product_id = f"product:{req.shop_id}:{item.name.lower().replace(' ', '-')}"
        metadata = item.metadata or {}
        entities.append(
            BusinessEntity(
                entity_id=product_id,
                entity_type="product",
                name=item.name,
                attributes={"category": item.category, **metadata},
            )
        )
        relations.append(
            BusinessRelation(
                source_id=shop_entity_id,
                target_id=product_id,
                relation_type="stocks",
                weight=float(metadata.get("sales_velocity", 1) or 1),
                metadata=metadata,
            )
        )
        documents.append(
            DocumentInput(
                tenant_id=req.user_id,
                user_id=req.user_id,
                shop_id=req.shop_id,
                title=f"Inventory item: {item.name}",
                parts=[
                    MultimodalPart(
                        modality=Modality.text,
                        content=f"Product: {item.name}\nCategory: {item.category}\nMetadata: {metadata}",
                    )
                ],
                source_uri="inventory/personalize",
                metadata={"category": item.category, **metadata},
            )
        )

    return engine.ingest(
        IngestRequest(
            documents=documents,
            business_snapshot=BusinessSnapshot(
                user_id=req.user_id,
                shop_id=req.shop_id,
                entities=entities,
                relations=relations,
                source="inventory/personalize",
            ),
        )
    )

def get_personalized_suggestions(user_id: str, shop_id: str, query: str) -> RecommendationResponse:
    """
    Retrieves relevant inventory context based on past shop logs.
    """
    response = engine.answer(
        QueryRequest(
            tenant_id=user_id,
            user_id=user_id,
            shop_id=shop_id,
            message=query,
        )
    )
    suggestions = [action.title for action in response.recommended_actions]
    if not suggestions:
        suggestions = [citation.title for citation in response.citations[:3]]
    return RecommendationResponse(
        suggested_inventory=suggestions,
        context_reason=response.answer,
    )
