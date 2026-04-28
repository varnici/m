from __future__ import annotations

import logging
from typing import Dict, Any
from sqlalchemy.orm import Session

from app.models import Product, StockLevel
from app.schemas.inventory_schemas import StockMovementCreate
from app.services.stock_service import StockService

logger = logging.getLogger(__name__)


class VoiceVisionService:
    """
    Service for processing unstructured inputs like voice and computer vision.
    Extracted from InventoryServiceV2 to adhere to SRP.
    """

    def __init__(self, db: Session, owner_id: str):
        self.db = db
        self.owner_id = owner_id
        self.stock_service = StockService(db, owner_id)

    def process_voice_input(self, audio_base64: str, store_id: str) -> Dict[str, Any]:
        """
        Parse base64 audio command and record stock movement.
        Mock implementation: in production, this calls a Speech-to-Text service.
        """
        # Mocking the transcript for now
        text_command = "Sold 5 items of product Coke" 

        # Mock NLP extraction logic
        words = text_command.lower().split()
        try:
            qty = int([w for w in words if w.isdigit()][0])
            
            # Search for product by name keyword (last word as proxy)
            product = self.db.query(Product).filter(
                Product.owner_id == self.owner_id,
                Product.name.ilike(f"%{words[-1]}%")
            ).first()
            
            if not product:
                return {"status": "error", "message": "Product not recognized from voice"}

            movement = StockMovementCreate(
                product_id=product.id,
                from_store_id=store_id,
                movement_type="sale",
                quantity=qty,
                input_method="voice",
                notes=f"Voice command: {text_command}"
            )
            
            result = self.stock_service.record_stock_movement(movement)
            return {
                "status": "success",
                "detected_product": product.name,
                "quantity": qty,
                "movement_id": result.id
            }
        except (IndexError, ValueError):
            return {"status": "error", "message": "Could not parse quantity or product from voice command"}

    def process_vision_scan(self, image_base64: str, store_id: str) -> Dict[str, Any]:
        """
        Process base64 image via computer vision and adjust stock levels.
        image_base64: Raw image data from the shelf scan.
        """
        # Mocking detected items from the image
        detected_items = [{"sku": "COKE-001", "observed_qty": 10}]

        adjustments = []
        for item in detected_items:
            product = self.db.query(Product).filter(
                Product.owner_id == self.owner_id,
                Product.sku == item["sku"]
            ).first()
            
            if product:
                stock = self.db.query(StockLevel).filter(
                    StockLevel.product_id == product.id,
                    StockLevel.store_id == store_id
                ).first()
                
                current_qty = stock.quantity_on_hand if stock else 0
                delta = item["observed_qty"] - current_qty
                
                if delta != 0:
                    movement = StockMovementCreate(
                        product_id=product.id,
                        to_store_id=store_id,
                        movement_type="adjustment",
                        quantity=delta,
                        input_method="scan",
                        notes=f"CV Scan adjustment (Observed: {item['observed_qty']})"
                    )
                    self.stock_service.record_stock_movement(movement)
                    adjustments.append({"sku": item["sku"], "delta": delta})
        
        return {"status": "success", "adjustments": adjustments}
