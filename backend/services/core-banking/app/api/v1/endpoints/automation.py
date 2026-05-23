from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any

from app.infrastructure.database import get_db
from app.infrastructure.auth import get_current_user_id
from app.services.automation_service import AutomationService

router = APIRouter()

@router.get("/restock-check")
def check_restock(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    """
    Check inventory and generate restock payloads.
    """
    service = AutomationService(db, user_id)
    return service.trigger_autonomous_actions()

@router.get("/whatsapp-link/{product_id}")
def get_whatsapp_link(
    product_id: str,
    quantity: int,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    """
    Generate a WhatsApp restock link for a specific product.
    """
    service = AutomationService(db, user_id)
    # Fetch product to ensure ownership
    from app.models.inventory import Product
    product = db.query(Product).filter(Product.id == product_id, Product.owner_id == user_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
        
    return {"whatsapp_link": service._generate_whatsapp_link(product, quantity)}
