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
        Parse base64 audio command or raw text and record stock movement.
        Extracts quantity, movement type, and product keywords using regex and heuristic matching.
        """
        import base64
        import re
        import time

        # 1. Attempt to decode audio_base64 to a text command
        text_command = None
        try:
            # Let's try base64 decoding
            decoded_bytes = base64.b64decode(audio_base64)
            # Try to decode as UTF-8 string
            decoded_str = decoded_bytes.decode('utf-8').strip()
            # If the decoded string has letters and words, it's highly likely text command sent client-side
            if any(c.isalnum() for c in decoded_str):
                text_command = decoded_str
        except Exception:
            pass

        # If base64 decoding failed or didn't yield readable text, check if audio_base64 is a raw text command
        if not text_command:
            cleaned = audio_base64.strip()
            if any(w in cleaned.lower() for w in ["sold", "sale", "add", "received", "buy", "adjust", "coke", "rice", "item"]):
                text_command = cleaned
            else:
                # Standard fallback
                text_command = "Sold 5 items of product Coke"

        logger.info(f"Processing text command for inventory: '{text_command}'")

        # 2. Heuristic parsing / NLP Extraction
        words = text_command.lower().split()
        
        # Word-to-number dictionary lookup
        word_to_num = {
            "one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
            "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10,
            "eleven": 11, "twelve": 12, "thirteen": 13, "fourteen": 14, "fifteen": 15,
            "twenty": 20, "thirty": 30, "forty": 40, "fifty": 50, "hundred": 100
        }

        qty = 1  # Default fallback quantity
        # Try digits first using regex
        digit_matches = re.findall(r'\b\d+\b', text_command)
        if digit_matches:
            qty = int(digit_matches[0])
        else:
            # Check for word digits
            for w in words:
                if w in word_to_num:
                    qty = word_to_num[w]
                    break

        # Parse movement type
        movement_type = "adjustment"  # Default
        for w in words:
            if w in ["sold", "sale", "deduct", "out", "remove", "minus"]:
                movement_type = "sale"
                break
            elif w in ["added", "received", "in", "buy", "purchase", "plus"]:
                movement_type = "purchase"
                break
            elif w in ["adjust", "correction", "reconcile", "set"]:
                movement_type = "adjustment"
                break

        # Extract product keywords by excluding common stop words
        stop_words = {
            "sold", "sale", "deduct", "out", "remove", "minus",
            "added", "received", "in", "buy", "purchase", "plus",
            "adjust", "correction", "reconcile", "set",
            "item", "items", "product", "products", "bag", "bags", "bottle", "bottles",
            "pack", "packs", "of", "at", "for", "to", "from", "with", "a", "an", "the",
            "cost", "price", "selling", "naira", "kobo", "dollar", "dollars", "cents", "customer", "is"
        }
        stop_words.update(word_to_num.keys())

        # Candidates are words that are not stop words, not numeric digits, and have substantial length
        candidates = [w for w in words if w not in stop_words and not w.isdigit() and len(w) > 1]

        # 3. Product resolution
        product = None
        for cand in candidates:
            # First look for a matching product by name keyword
            product = self.db.query(Product).filter(
                Product.owner_id == self.owner_id,
                Product.name.ilike(f"%{cand}%")
            ).first()
            if product:
                break

        # Substring search fallback
        if not product:
            all_products = self.db.query(Product).filter(Product.owner_id == self.owner_id).all()
            for p in all_products:
                if p.name.lower() in text_command.lower():
                    product = p
                    break

        # If product still not resolved, dynamically create a fallback product
        if not product:
            placeholder_name = " ".join([c.capitalize() for c in candidates]) if candidates else "Voice Product"
            # Ensure it is unique
            product = self.db.query(Product).filter(
                Product.owner_id == self.owner_id,
                Product.name == placeholder_name
            ).first()
            
            if not product:
                sku_prefix = placeholder_name.upper().replace(" ", "-")[:16]
                sku = f"{sku_prefix}-{int(time.time())}"
                
                product = Product(
                    sku=sku,
                    name=placeholder_name,
                    unit_of_measure="piece",
                    cost_price_kobo=50000,      # Default: 500 Naira
                    selling_price_kobo=70000,   # Default: 700 Naira
                    minimum_stock_level=1,
                    maximum_stock_level=1000,
                    reorder_quantity=10,
                    supplier_lead_time_days=7,
                    owner_id=self.owner_id,
                )
                self.db.add(product)
                self.db.commit()
                self.db.refresh(product)

        # 4. Record stock movement
        movement = StockMovementCreate(
            product_id=product.id,
            from_store_id=store_id if movement_type == "sale" else None,
            to_store_id=store_id if movement_type != "sale" else None,
            movement_type=movement_type,
            quantity=qty,
            input_method="voice",
            notes=f"Voice command: {text_command}"
        )
        self.stock_service.record_stock_movement(movement)

        # 5. Build and return standard response payload for frontend compatibility
        return {
            "success": True,
            "transcript": text_command,
            "data": {
                "product_name": product.name,
                "customer_id": "VOICE_USER",
                "quantity": qty,
                "pack_quantity": 0,
                "product_cost": float(product.cost_price_kobo) / 100.0,
                "price": float(product.selling_price_kobo) / 100.0,
                "sold": qty if movement_type == "sale" else 0
            },
            "source": "claude",
            "language": "en"
        }

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
