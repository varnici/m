from __future__ import annotations

import logging
import urllib.parse
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import select, and_

from app.models.inventory import Product, Store
from app.services.stock_service import StockService

logger = logging.getLogger(__name__)

class AutomationService:
    """
    The Automation Manager Logic.
    Generates restock payloads and WhatsApp deep links for distributors.
    """

    def __init__(self, db: Session, owner_id: str):
        self.db = db
        self.owner_id = owner_id
        self.stock_service = StockService(db, owner_id)

    def check_and_generate_restock_payloads(self) -> List[Dict[str, Any]]:
        """
        Scan inventory for items below min_threshold and generate restock orders.
        """
        # Find products where total quantity is below minimum_stock_level
        products = self.db.query(Product).filter(
            Product.owner_id == self.owner_id,
            Product.is_active == True
        ).all()

        restock_payloads = []
        for product in products:
            total_on_hand = product.total_quantity_on_hand
            if total_on_hand < product.minimum_stock_level:
                needed_qty = product.reorder_quantity
                
                restock_payloads.append({
                    "product_id": product.id,
                    "product_name": product.name,
                    "sku": product.sku,
                    "current_stock": total_on_hand,
                    "min_threshold": product.minimum_stock_level,
                    "suggested_restock": needed_qty,
                    "whatsapp_link": self._generate_whatsapp_link(product, needed_qty)
                })

        return restock_payloads

    def _generate_whatsapp_link(self, product: Product, quantity: int) -> str:
        """
        Generates a whatsapp:// deep link for the restock order.
        """
        # In a real scenario, we'd fetch the supplier's phone number
        supplier_phone = "2348000000000" # Placeholder
        message = f"Hello, I would like to order {quantity} units of {product.name} (SKU: {product.sku}) for my store."
        encoded_message = urllib.parse.quote(message)
        
        return f"whatsapp://send?phone={supplier_phone}&text={encoded_message}"

    def trigger_autonomous_actions(self) -> Dict[str, Any]:
        """
        Execution point for autonomous system checks.
        """
        restock_orders = self.check_and_generate_restock_payloads()
        
        return {
            "autonomous_restock_count": len(restock_orders),
            "restock_orders": restock_orders,
            "status": "system_optimal" if not restock_orders else "action_required"
        }
