from __future__ import annotations

import logging
import uuid
from datetime import date, datetime, timezone
from typing import List, Optional
from sqlalchemy import desc
from sqlalchemy.orm import Session, joinedload

from app.models import (
    Supplier,
    Store,
    PurchaseOrder,
    PurchaseOrderItem,
)
from app.schemas.inventory_schemas import (
    SupplierCreate,
    SupplierUpdate,
    SupplierOut,
    PurchaseOrderCreate,
    PurchaseOrderUpdate,
    PurchaseOrderOut,
    PurchaseOrderDetailOut,
    StockMovementCreate,
)
from app.services.stock_service import StockService

logger = logging.getLogger(__name__)


class OrderService:
    """
    Service for managing suppliers and purchase orders.
    Extracted from InventoryServiceV2 to adhere to SRP.
    """

    def __init__(self, db: Session, owner_id: str):
        self.db = db
        self.owner_id = owner_id
        self.stock_service = StockService(db, owner_id)

    # ── Supplier Operations ──────────────────────────────────────────────────

    def create_supplier(self, payload: SupplierCreate) -> SupplierOut:
        supplier = Supplier(owner_id=self.owner_id, **payload.model_dump())
        self.db.add(supplier)
        self.db.commit()
        self.db.refresh(supplier)
        return SupplierOut.model_validate(supplier)

    def get_all_suppliers(self, status: Optional[str] = None, skip: int = 0, limit: int = 100) -> tuple[List[SupplierOut], int]:
        query = self.db.query(Supplier).filter(Supplier.owner_id == self.owner_id)
        if status:
            query = query.filter(Supplier.status == status)
        total_count = query.count()
        suppliers = query.offset(skip).limit(limit).all()
        return [SupplierOut.model_validate(s) for s in suppliers], total_count

    def get_supplier_by_id(self, supplier_id: str) -> SupplierOut:
        supplier = self.db.query(Supplier).filter(
            Supplier.id == supplier_id,
            Supplier.owner_id == self.owner_id
        ).first()
        if not supplier:
            raise ValueError(f"Supplier {supplier_id} not found")
        return SupplierOut.model_validate(supplier)

    # ── Purchase Order Operations ─────────────────────────────────────────────

    def create_purchase_order(self, payload: PurchaseOrderCreate) -> PurchaseOrderDetailOut:
        store_id = payload.store_id or self._get_primary_store_id()
        po_number = payload.po_number or self._generate_po_number()
        
        total_amount = sum(item.quantity_ordered * item.unit_price_kobo for item in payload.items)
        
        po = PurchaseOrder(
            owner_id=self.owner_id,
            supplier_id=payload.supplier_id,
            store_id=store_id,
            po_number=po_number,
            total_amount_kobo=total_amount,
            expected_delivery_date=payload.expected_delivery_date,
            notes=payload.notes
        )
        self.db.add(po)
        self.db.flush()
        
        for item in payload.items:
            po_item = PurchaseOrderItem(
                purchase_order_id=po.id,
                product_id=item.product_id,
                quantity_ordered=item.quantity_ordered,
                unit_price_kobo=item.unit_price_kobo,
                line_total_kobo=item.quantity_ordered * item.unit_price_kobo
            )
            self.db.add(po_item)
        
        self.db.commit()
        return self.get_purchase_order_by_id(po.id)

    def get_purchase_orders(self, **filters) -> tuple[List[PurchaseOrderOut], int]:
        query = self.db.query(PurchaseOrder).filter(PurchaseOrder.owner_id == self.owner_id)
        # Apply filters (status, supplier_id, store_id, dates...)
        if filters.get("status"):
            query = query.filter(PurchaseOrder.status == filters["status"])
            
        total_count = query.count()
        pos = query.options(joinedload(PurchaseOrder.supplier), joinedload(PurchaseOrder.store))\
                   .order_by(desc(PurchaseOrder.created_at))\
                   .offset(filters.get("skip", 0))\
                   .limit(filters.get("limit", 100))\
                   .all()
        return [PurchaseOrderOut.model_validate(po) for po in pos], total_count

    def get_purchase_order_by_id(self, po_id: str) -> PurchaseOrderDetailOut:
        po = self.db.query(PurchaseOrder).filter(
            PurchaseOrder.id == po_id,
            PurchaseOrder.owner_id == self.owner_id
        ).options(
            joinedload(PurchaseOrder.items),
            joinedload(PurchaseOrder.supplier),
            joinedload(PurchaseOrder.store)
        ).first()
        if not po:
            raise ValueError(f"Purchase order {po_id} not found")
        return PurchaseOrderDetailOut.model_validate(po)

    def receive_purchase_order(self, po_id: str, items: List[dict] = None) -> PurchaseOrderOut:
        po = self.db.query(PurchaseOrder).filter(
            PurchaseOrder.id == po_id,
            PurchaseOrder.owner_id == self.owner_id
        ).first()
        if not po:
            raise ValueError(f"Purchase order {po_id} not found")
        
        for po_item in po.items:
            qty_received = po_item.quantity_ordered
            if items:
                for item in items:
                    if item.get("product_id") == po_item.product_id:
                        qty_received = item.get("quantity_received", qty_received)
                        break
            
            po_item.quantity_received = qty_received
            
            # Update stock via StockService
            self.stock_service.record_stock_movement(StockMovementCreate(
                product_id=po_item.product_id,
                to_store_id=po.store_id,
                movement_type="purchase",
                quantity=qty_received,
                reference_id=po_id,
                reference_type="purchase_order"
            ), should_commit=False)
        
        po.status = "received"
        po.actual_delivery_date = date.today()
        self.db.commit()
        return PurchaseOrderOut.model_validate(po)

    def _get_primary_store_id(self) -> str:
        store = self.db.query(Store).filter(Store.owner_id == self.owner_id, Store.is_primary == True).first()
        if not store:
            store = self.db.query(Store).filter(Store.owner_id == self.owner_id).first()
        return store.id if store else None

    def _generate_po_number(self) -> str:
        return f"PO-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}-{str(uuid.uuid4())[:8].upper()}"
