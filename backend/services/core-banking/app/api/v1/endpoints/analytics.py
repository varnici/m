from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api import deps
from app.services.analytics_service import AnalyticsService
from app.schemas.inventory_schemas import InventoryMetricsOut

router = APIRouter()

@router.get("/summary", response_model=Dict[str, Any])
def get_dashboard_summary(
    db: Session = Depends(deps.get_db),
    current_user = Depends(deps.get_current_active_user),
):
    """Get high-level inventory dashboard summary."""
    service = AnalyticsService(db, str(current_user.id))
    return service.get_dashboard_summary()

@router.get("/product/{product_id}/intelligence", response_model=Dict[str, Any])
def get_product_intelligence(
    product_id: str,
    db: Session = Depends(deps.get_db),
    current_user = Depends(deps.get_current_active_user),
):
    """Get margin, profit, and stock burn rate for a product."""
    service = AnalyticsService(db, str(current_user.id))
    return service.get_product_intelligence(product_id)

@router.get("/categories/health", response_model=List[Dict[str, Any]])
def get_category_health(
    db: Session = Depends(deps.get_db),
    current_user = Depends(deps.get_current_active_user),
):
    """Get health status scores for all product categories."""
    service = AnalyticsService(db, str(current_user.id))
    return service.get_category_health()

@router.get("/suppliers/performance", response_model=List[Dict[str, Any]])
def get_supplier_performance(
    db: Session = Depends(deps.get_db),
    current_user = Depends(deps.get_current_active_user),
):
    """Get reliability and performance scores for suppliers."""
    service = AnalyticsService(db, str(current_user.id))
    return service.get_supplier_performance()
