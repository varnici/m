from __future__ import annotations

import base64
import logging
import time
from typing import Dict, Any, Optional

import httpx
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.config import settings
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

    def process_voice_input(self, audio_base64: str, store_id: str, language: str = "en") -> Dict[str, Any]:
        """
        Sends the recorded audio to ai-ml-service for real transcription (Groq
        Whisper) and structuring (Groq Llama/Qwen, language-routed, with a
        regex fallback baked into that service), then resolves/creates the
        matching product and records the stock movement locally.
        """
        try:
            audio_bytes = base64.b64decode(audio_base64)
        except Exception as exc:
            raise HTTPException(status_code=422, detail=f"audio_base64 is not valid base64: {exc}")

        try:
            response = httpx.post(
                f"{settings.ai_ml_service_url}/v1/inventory/transcribe",
                files={"file": ("voice-input.m4a", audio_bytes, "audio/m4a")},
                data={"language": language},
                timeout=settings.ai_ml_service_timeout_seconds,
            )
            response.raise_for_status()
        except httpx.HTTPError as exc:
            logger.error("ai-ml-service voice transcription call failed: %s", exc)
            raise HTTPException(
                status_code=503,
                detail="Voice transcription is temporarily unavailable. Please try again or enter the item manually.",
            )

        payload = response.json()
        transcript = payload.get("text") or ""
        items = payload.get("processed_items") or []
        source = payload.get("source", "unknown")

        if not items:
            raise HTTPException(
                status_code=422,
                detail="Could not make out what was said. Please try again, closer to the microphone.",
            )

        item = items[0]
        quantity = item.get("quantity") or 1
        movement_type = item.get("movement_type") or "adjustment"
        if movement_type not in ("sale", "purchase", "adjustment"):
            movement_type = "adjustment"
        parsed_name = (item.get("name") or "").strip()

        product = self._resolve_or_create_product(
            parsed_name=parsed_name,
            cost_price_kobo=item.get("cost_price_kobo"),
            selling_price_kobo=item.get("selling_price_kobo"),
        )

        movement = StockMovementCreate(
            product_id=product.id,
            from_store_id=store_id if movement_type == "sale" else None,
            to_store_id=store_id if movement_type != "sale" else None,
            movement_type=movement_type,
            quantity=quantity,
            input_method="voice",
            notes=f"Voice command ({source}, {language}): {transcript}",
        )
        self.stock_service.record_stock_movement(movement)

        return {
            "success": True,
            "transcript": transcript,
            "data": {
                "product_name": product.name,
                "customer_id": "VOICE_USER",
                "quantity": quantity,
                "pack_quantity": 0,
                "product_cost": float(product.cost_price_kobo) / 100.0,
                "price": float(product.selling_price_kobo) / 100.0,
                "sold": quantity if movement_type == "sale" else 0,
            },
            "source": source,
            "language": language,
        }

    def _resolve_or_create_product(
        self,
        parsed_name: str,
        cost_price_kobo: Optional[int],
        selling_price_kobo: Optional[int],
    ) -> Product:
        """Fuzzy-matches the AI-parsed product name against the existing
        catalog; auto-creates a placeholder product if nothing matches, using
        AI-parsed prices when available."""
        candidate = parsed_name or "Voice Product"

        product = self.db.query(Product).filter(
            Product.owner_id == self.owner_id,
            Product.name.ilike(f"%{candidate}%"),
        ).first()
        if product:
            return product

        all_products = self.db.query(Product).filter(Product.owner_id == self.owner_id).all()
        for p in all_products:
            if p.name.lower() in candidate.lower() or candidate.lower() in p.name.lower():
                return p

        product = self.db.query(Product).filter(
            Product.owner_id == self.owner_id,
            Product.name == candidate,
        ).first()
        if product:
            return product

        sku_prefix = candidate.upper().replace(" ", "-")[:16] or "VOICE-ITEM"
        sku = f"{sku_prefix}-{int(time.time())}"
        product = Product(
            sku=sku,
            name=candidate,
            unit_of_measure="piece",
            cost_price_kobo=cost_price_kobo or 50000,      # Default: 500 Naira
            selling_price_kobo=selling_price_kobo or 70000,  # Default: 700 Naira
            minimum_stock_level=1,
            maximum_stock_level=1000,
            reorder_quantity=10,
            supplier_lead_time_days=7,
            owner_id=self.owner_id,
        )
        self.db.add(product)
        self.db.commit()
        self.db.refresh(product)
        return product

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
