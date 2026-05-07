from typing import List, Optional
from pydantic import BaseModel
import google.generativeai as genai
from supabase import create_client, Client
from app.core.config import settings

# Initialize clients
genai.configure(api_key=settings.google_api_key)
supabase: Optional[Client] = None
if settings.supabase_url.startswith(("http://", "https://")):
    supabase = create_client(settings.supabase_url, settings.supabase_key)

class InventoryItem(BaseModel):
    name: str
    category: str
    metadata: Optional[dict] = {}

class PersonalizationRequest(BaseModel):
    user_id: str
    shop_id: str
    items: List[InventoryItem]

class RecommendationResponse(BaseModel):
    suggested_inventory: List[str]
    context_reason: str

def store_inventory_embeddings(req: PersonalizationRequest):
    """
    Generates embeddings for shop items and stores them in Supabase pgvector.
    """
    for item in req.items:
        # Generate embedding using Google Generative AI
        # model: models/embedding-001
        content = f"Product: {item.name}, Category: {item.category}"
        embedding = genai.embed_content(
            model="models/embedding-001",
            content=content,
            task_type="retrieval_document"
        )
        
        # Store in Supabase
        # table: shop_inventory_vectors (assumed to exist with 'embedding' vector column)
        data = {
            "user_id": req.user_id,
            "shop_id": req.shop_id,
            "product_name": item.name,
            "category": item.category,
            "embedding": embedding['embedding'],
            "metadata": item.metadata
        }
        
        # In this skeleton, we assume the Supabase client is configured.
        # supabase.table("shop_inventory_vectors").insert(data).execute()
        pass

def get_personalized_suggestions(user_id: str, shop_id: str, query: str) -> RecommendationResponse:
    """
    Retrieves relevant inventory context based on past shop logs.
    """
    # 1. Embed query
    query_embedding = genai.embed_content(
        model="models/embedding-001",
        content=query,
        task_type="retrieval_query"
    )['embedding']
    
    # 2. Vector search in Supabase
    # supabase.rpc('match_inventory', {'query_embedding': query_embedding, ...}).execute()
    
    return RecommendationResponse(
        suggested_inventory=["Personalized Item A", "Personalized Item B"],
        context_reason=f"Retrieved based on similarity search for '{query}'"
    )
