"""
Sales Service
Handles sales transactions and their impact on inventory.
"""

from typing import List, Optional, Dict, Any
from datetime import datetime
from sqlalchemy import text
from sqlalchemy.orm import Session
import logging

from app.schemas.inventory_schemas import StockMovementCreate, SalesTransactionCreate, SalesTransactionItemCreate
from app.services.inventory_service_v2 import InventoryServiceV2

from app.models.sales import Sale
from app.models.inventory import Product, StockMovement

logger = logging.getLogger(__name__)

def record_sale(
    db: Session,
    user_id: str,
    product_sku: str,
    quantity: int,
    unit_price_kobo: int,
    channel: str = "manual",
) -> Sale:
    """
    Records a sale and triggers inventory depletion.
    """
    # 1. Create the sale record
    sale = Sale(
        user_id=user_id,
        product_sku=product_sku,
        quantity=quantity,
        unit_price_kobo=unit_price_kobo,
        channel=channel,
    )
    db.add(sale)
    
    # 2. Try to deplete inventory if product exists
    try:
        # Find product by SKU
        product = db.query(Product).filter(
            Product.owner_id == user_id, 
            Product.sku == product_sku
        ).first()
        
        if product:
            inventory_service = InventoryServiceV2(db, user_id)
            # Find primary store for this user
            from app.models.inventory import Store
            store = db.query(Store).filter(
                Store.owner_id == user_id,
                Store.is_primary == True
            ).first()
            
            if store:
                # We use a non-async version or run it in a sync way if needed
                # But inventory_service_v2 is async. 
                # This is a sync endpoint, so we might need a sync wrapper or just do it manually.
                
                # For now, let's just record the movement manually in the same transaction
                movement = StockMovement(
                    product_id=product.id,
                    from_store_id=store.id,
                    movement_type="sale",
                    quantity=quantity,
                    reference_id=sale.id,
                    reference_type="sale",
                    owner_id=user_id,
                    input_method="api"
                )
                db.add(movement)
                
                # Update stock level
                from app.models.inventory import StockLevel
                stock = db.query(StockLevel).filter(
                    StockLevel.product_id == product.id,
                    StockLevel.store_id == store.id
                ).first()
                
                if stock:
                    stock.quantity_on_hand -= quantity
                    if stock.quantity_on_hand < 0:
                        stock.quantity_on_hand = 0
    except Exception as e:
        logger.error(f"Failed to deplete inventory for sale: {str(e)}")
        # We don't fail the sale if inventory depletion fails for now

    db.commit()
    db.refresh(sale)
    return sale

class SalesService:
    """Service for handling retail sales and stock depletion."""
    
    def __init__(self, db: Session, owner_id: str):
        self.db = db
        self.owner_id = owner_id
        self.inventory_service = InventoryServiceV2(db, owner_id)

    async def process_sale(self, store_id: str, items: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Process a sale transaction.
        items: List of {"product_id": str, "quantity": int, "unit_price": int}
        """
        try:
            # 1. Create SalesTransactionCreate payload
            transaction_items = []
            for item in items:
                unit_price = item.get("unit_price")
                if unit_price is None:
                    # Fetch current product price
                    product = self.db.query(Product).filter(
                        Product.id == item["product_id"],
                        Product.owner_id == self.owner_id
                    ).first()
                    unit_price = product.selling_price_kobo if product else 0
                
                transaction_items.append(SalesTransactionItemCreate(
                    product_id=item["product_id"],
                    quantity_sold=item["quantity"],
                    unit_price_kobo=unit_price
                ))
            
            payload = SalesTransactionCreate(
                store_id=store_id,
                items=transaction_items,
                payment_method="cash" # Default
            )
            
            # 2. Call inventory service to create transaction and deplete stock
            result = await self.inventory_service.create_sales_transaction(payload)
            
            return {
                "transaction_id": result.id,
                "status": "success",
                "total_amount": result.total_amount_kobo,
                "items_count": len(result.items),
                "timestamp": result.transaction_date
            }
            
        except Exception as e:
            logger.error(f"Failed to process sale: {str(e)}")
            return {
                "status": "failed",
                "reason": str(e)
            }

    async def process_voice_sale(self, text_command: str, store_id: str) -> Dict[str, Any]:
        """
        Simulate processing a voice command like 'Sold 5 bottles of water'.
        In a real app, this would use an LLM/NLP to extract entities.
        """
        # Mock NLP extraction
        # Example: "Sold 5 Coke" -> qty=5, product_search="Coke"
        words = text_command.lower().split()
        try:
            qty = int([w for w in words if w.isdigit()][0])
            # Simple search for product
            product = self.db.execute(
                text("SELECT id FROM products WHERE owner_id = :oid AND name ILIKE :name LIMIT 1"),
                {"oid": self.owner_id, "name": f"%{words[-1]}%"}
            ).fetchone()
            
            if not product:
                return {"error": "Product not found in voice command"}
            
            return await self.process_sale(store_id, [
                {"product_id": str(product[0]), "quantity": qty}
            ])
        except Exception:
            return {"error": "Could not parse voice command"}
