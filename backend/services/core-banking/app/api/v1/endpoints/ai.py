from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api import deps
from app.services.ai_prediction_service import AIPredictionService
from app.schemas.inventory_schemas import AIInsightsOut

router = APIRouter()

@router.get("/insights", response_model=AIInsightsOut)
def get_ai_insights(
    db: Session = Depends(deps.get_db),
    current_user = Depends(deps.get_current_active_user),
):
    """Get latest AI-driven anomalies and restock recommendations."""
    service = AIPredictionService(db, str(current_user.id))
    return service.get_insights()

@router.get("/forecast/{product_id}", response_model=List[Dict[str, Any]])
def get_product_forecast(
    product_id: str,
    days: int = Query(7, ge=1, le=30),
    db: Session = Depends(deps.get_db),
    current_user = Depends(deps.get_current_active_user),
):
    """Get future demand forecast for a specific product."""
    service = AIPredictionService(db, str(current_user.id))
    return service.get_product_forecast(product_id, days)
