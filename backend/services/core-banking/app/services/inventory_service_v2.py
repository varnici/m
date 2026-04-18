"""
Production-Grade Inventory Service
Handles all inventory operations with full type safety and business logic.
"""

from typing import List, Optional, Dict, Any
from datetime import date, datetime, timedelta
from decimal import Decimal
from sqlalchemy import and_, or_, func, desc
from sqlalchemy.orm import Session, joinedload
import logging

from app.models.inventory_metrics import InventoryMetrics
from app.schemas.inventory_schemas import (
    StoreCreate,
    StoreOut,
    CategoryCreate,
    CategoryOut,
    ProductCreate,
    ProductUpdate,
    ProductOut,
    ProductDetailOut,
    StockLevelOut,
    StockMovementCreate,
    StockMovementOut,
    SupplierCreate,
    SupplierUpdate,
    SupplierOut,
    PurchaseOrderCreate,
    PurchaseOrderUpdate,
    PurchaseOrderOut,
    PurchaseOrderDetailOut,
    InventoryMetricsOut,
    ProductHealthOut,
    AIInsightsOut,
)

logger = logging.getLogger(__name__)


class InventoryService:
    """Core inventory business logic service."""
    
    def __init__(self, db: Session, owner_id: str):
        self.db = db
        self.owner_id = owner_id
        self.AUTO_RESTOCK_THRESHOLD_PCT = 0.10
        self.DEAD_STOCK_DAYS = 30
        self.LOW_STOCK_THRESHOLD_PCT = 0.20
    
    # ========================================================================
    # STORE OPERATIONS
    # ========================================================================
    
    async def create_store(self, payload: StoreCreate) -> StoreOut:
        """Create a new store/warehouse location."""
        # If marking as primary, unset previous primary
        if payload.is_primary:
            self.db.query(Store).filter(
                Store.owner_id == self.owner_id,
                Store.is_primary == True
            ).update({Store.is_primary: False})
        
        store = Store(
            owner_id=self.owner_id,
            **payload.dict()
        )
        self.db.add(store)
        self.db.commit()
        self.db.refresh(store)
        return StoreOut.from_orm(store)
    
    def get_all_stores(self) -> List[StoreOut]:
        """Get all stores for the user."""
        stores = self.db.query(Store).filter(
            Store.owner_id == self.owner_id
        ).all()
        return [StoreOut.from_orm(s) for s in stores]
    
    def get_store_by_id(self, store_id: str) -> StoreOut:
        """Get a specific store."""
        store = self.db.query(Store).filter(
            Store.id == store_id,
            Store.owner_id == self.owner_id
        ).first()
        if not store:
            raise ValueError(f"Store {store_id} not found")
        return StoreOut.from_orm(store)
    
    async def update_store(self, store_id: str, payload: StoreCreate) -> StoreOut:
        """Update store information."""
        store = self.db.query(Store).filter(
            Store.id == store_id,
            Store.owner_id == self.owner_id
        ).first()
        if not store:
            raise ValueError(f"Store {store_id} not found")
        
        for field, value in payload.dict(exclude_unset=True).items():
            setattr(store, field, value)
        
        store.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(store)
        return StoreOut.from_orm(store)
    
    # ========================================================================
    # CATEGORY OPERATIONS
    # ========================================================================
    
    async def create_category(self, payload: CategoryCreate) -> CategoryOut:
        """Create a product category."""
        category = Category(
            owner_id=self.owner_id,
            **payload.dict()
        )
        self.db.add(category)
        self.db.commit()
        self.db.refresh(category)
        return CategoryOut.from_orm(category)
    
    def get_all_categories(self) -> List[CategoryOut]:
        """Get all categories."""
        categories = self.db.query(Category).filter(
            Category.owner_id == self.owner_id,
            Category.is_active == True
        ).order_by(Category.position).all()
        return [CategoryOut.from_orm(c) for c in categories]
    
    # ========================================================================
    # PRODUCT OPERATIONS
    # ========================================================================
    
    async def create_product(self, payload: ProductCreate) -> ProductOut:
        """Create a new product."""
        # Check SKU uniqueness
        existing = self.db.query(Product).filter(
            Product.owner_id == self.owner_id,
            Product.sku == payload.sku
        ).first()
        if existing:
            raise ValueError(f"SKU {payload.sku} already exists")
        
        product = Product(
            owner_id=self.owner_id,
            **payload.dict()
        )
        self.db.add(product)
        self.db.commit()
        self.db.refresh(product)
        return ProductOut.from_orm(product)
    
    def list_products(
        self,
        skip: int = 0,
        limit: int = 100,
        category_id: Optional[str] = None,
        search: Optional[str] = None,
    ) -> List[ProductOut]:
        """List products with filters."""
        query = self.db.query(Product).filter(
            Product.owner_id == self.owner_id,
            Product.is_active == True
        )
        
        if category_id:
            query = query.filter(Product.category_id == category_id)
        
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                or_(
                    Product.name.ilike(search_term),
                    Product.sku.ilike(search_term),
                    Product.barcode.ilike(search_term)
                )
            )
        
        products = query.offset(skip).limit(limit).all()
        return [ProductOut.from_orm(p) for p in products]
    
    def get_product_by_barcode(self, barcode: str, store_id: Optional[str] = None) -> ProductOut:
        """Search product by barcode."""
        product = self.db.query(Product).filter(
            Product.owner_id == self.owner_id,
            or_(
                Product.barcode == barcode,
                Product.qr_code == barcode
            )
        ).first()
        if not product:
            raise ValueError(f"Product with barcode {barcode} not found")
        return ProductOut.from_orm(product)
    
    def get_product_detail(
        self,
        product_id: str,
        store_id: Optional[str] = None
    ) -> ProductDetailOut:
        """Get detailed product information."""
        product = self.db.query(Product).filter(
            Product.id == product_id,
            Product.owner_id == self.owner_id
        ).first()
        if not product:
            raise ValueError(f"Product {product_id} not found")
        
        # Get stock levels
        stock_query = self.db.query(StockLevel).filter(
            StockLevel.product_id == product_id
        )
        if store_id:
            stock_query = stock_query.filter(StockLevel.store_id == store_id)
        
        stock_levels = stock_query.all()
        total_quantity = sum(s.quantity_on_hand for s in stock_levels)
        total_reserved = sum(s.quantity_reserved for s in stock_levels)
        total_value = total_quantity * product.cost_price_kobo
        
        # Calculate metrics
        profit_per_unit = product.selling_price_kobo - product.cost_price_kobo
        margin_pct = (profit_per_unit / product.cost_price_kobo * 100) if product.cost_price_kobo > 0 else 0
        
        # Check for dead stock
        last_sale = self.db.query(func.max(SalesTransactionItem.created_at)).filter(
            SalesTransactionItem.product_id == product_id
        ).scalar()
        is_dead_stock = False
        if last_sale:
            days_since_sale = (datetime.utcnow() - last_sale).days
            is_dead_stock = days_since_sale > self.DEAD_STOCK_DAYS
        
        detail = ProductDetailOut.from_orm(product)
        detail.stock_by_location = [StockLevelOut.from_orm(s) for s in stock_levels]
        detail.total_quantity_on_hand = total_quantity
        detail.total_reserved_quantity = total_reserved
        detail.total_inventory_value_kobo = int(total_value)
        detail.profit_per_unit_kobo = profit_per_unit
        detail.margin_percentage = Decimal(str(margin_pct))
        detail.is_dead_stock = is_dead_stock
        
        return detail
    
    async def update_product(self, product_id: str, payload: ProductUpdate) -> ProductOut:
        """Update product."""
        product = self.db.query(Product).filter(
            Product.id == product_id,
            Product.owner_id == self.owner_id
        ).first()
        if not product:
            raise ValueError(f"Product {product_id} not found")
        
        for field, value in payload.dict(exclude_unset=True).items():
            setattr(product, field, value)
        
        product.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(product)
        return ProductOut.from_orm(product)
    
    async def delete_product(self, product_id: str):
        """Soft-delete product."""
        product = self.db.query(Product).filter(
            Product.id == product_id,
            Product.owner_id == self.owner_id
        ).first()
        if not product:
            raise ValueError(f"Product {product_id} not found")
        
        product.is_active = False
        product.updated_at = datetime.utcnow()
        self.db.commit()
    
    # ========================================================================
    # STOCK MANAGEMENT
    # ========================================================================
    
    def get_stock_levels(
        self,
        store_id: str,
        status: Optional[str] = None
    ) -> List[StockLevelOut]:
        """Get current stock levels for a store."""
        query = self.db.query(StockLevel).filter(
            StockLevel.store_id == store_id
        ).options(
            joinedload(StockLevel.product)
        )
        
        if status:
            query = query.filter(StockLevel.status == status)
        
        stock_levels = query.all()
        return [StockLevelOut.from_orm(sl) for sl in stock_levels]
    
    async def record_stock_movement(self, payload: StockMovementCreate) -> StockMovementOut:
        """Record a stock movement."""
        # Validate product exists
        product = self.db.query(Product).filter(
            Product.id == payload.product_id,
            Product.owner_id == self.owner_id
        ).first()
        if not product:
            raise ValueError(f"Product {payload.product_id} not found")
        
        movement = StockMovement(
            owner_id=self.owner_id,
            **payload.dict()
        )
        self.db.add(movement)
        
        # Update stock levels based on movement type
        if payload.movement_type == "sale":
            self._handle_sale_movement(payload)
        elif payload.movement_type == "purchase":
            self._handle_purchase_movement(payload)
        elif payload.movement_type == "transfer":
            self._handle_transfer_movement(payload)
        elif payload.movement_type == "adjustment":
            self._handle_adjustment_movement(payload)
        
        self.db.commit()
        self.db.refresh(movement)
        return StockMovementOut.from_orm(movement)
    
    def _handle_sale_movement(self, payload: StockMovementCreate):
        """Handle sale movement - decrease from_store_id stock."""
        if not payload.from_store_id:
            raise ValueError("from_store_id required for sale movement")
        
        stock = self.db.query(StockLevel).filter(
            StockLevel.product_id == payload.product_id,
            StockLevel.store_id == payload.from_store_id
        ).first()
        
        if not stock or stock.quantity_available < payload.quantity:
            raise ValueError("Insufficient stock for sale")
        
        stock.quantity_on_hand -= payload.quantity
        stock.last_movement_at = datetime.utcnow()
        self._update_stock_status(stock)
    
    def _handle_purchase_movement(self, payload: StockMovementCreate):
        """Handle purchase movement - increase to_store_id stock."""
        if not payload.to_store_id:
            raise ValueError("to_store_id required for purchase movement")
        
        stock = self.db.query(StockLevel).filter(
            StockLevel.product_id == payload.product_id,
            StockLevel.store_id == payload.to_store_id
        ).first()
        
        if not stock:
            stock = StockLevel(
                product_id=payload.product_id,
                store_id=payload.to_store_id,
                quantity_on_hand=payload.quantity
            )
            self.db.add(stock)
        else:
            stock.quantity_on_hand += payload.quantity
        
        stock.last_movement_at = datetime.utcnow()
        self._update_stock_status(stock)
    
    def _handle_transfer_movement(self, payload: StockMovementCreate):
        """Handle transfer movement - move between stores."""
        if not payload.from_store_id or not payload.to_store_id:
            raise ValueError("Both from_store_id and to_store_id required for transfer")
        
        # Decrease from source
        from_stock = self.db.query(StockLevel).filter(
            StockLevel.product_id == payload.product_id,
            StockLevel.store_id == payload.from_store_id
        ).first()
        
        if not from_stock or from_stock.quantity_available < payload.quantity:
            raise ValueError("Insufficient stock at source for transfer")
        
        from_stock.quantity_on_hand -= payload.quantity
        from_stock.last_movement_at = datetime.utcnow()
        self._update_stock_status(from_stock)
        
        # Increase at destination
        to_stock = self.db.query(StockLevel).filter(
            StockLevel.product_id == payload.product_id,
            StockLevel.store_id == payload.to_store_id
        ).first()
        
        if not to_stock:
            to_stock = StockLevel(
                product_id=payload.product_id,
                store_id=payload.to_store_id,
                quantity_on_hand=payload.quantity
            )
            self.db.add(to_stock)
        else:
            to_stock.quantity_on_hand += payload.quantity
        
        to_stock.last_movement_at = datetime.utcnow()
        self._update_stock_status(to_stock)
    
    def _handle_adjustment_movement(self, payload: StockMovementCreate):
        """Handle manual adjustment."""
        if not payload.to_store_id:
            raise ValueError("to_store_id required for adjustment")
        
        stock = self.db.query(StockLevel).filter(
            StockLevel.product_id == payload.product_id,
            StockLevel.store_id == payload.to_store_id
        ).first()
        
        if not stock:
            stock = StockLevel(
                product_id=payload.product_id,
                store_id=payload.to_store_id,
                quantity_on_hand=payload.quantity
            )
            self.db.add(stock)
        else:
            stock.quantity_on_hand += payload.quantity
        
        stock.last_movement_at = datetime.utcnow()
        self._update_stock_status(stock)
    
    def _update_stock_status(self, stock: StockLevel):
        """Update stock status based on quantity."""
        product = self.db.query(Product).filter(
            Product.id == stock.product_id
        ).first()
        
        if stock.quantity_on_hand <= 0:
            stock.status = "out_of_stock"
        elif stock.quantity_on_hand <= product.minimum_stock_level:
            stock.status = "low_stock"
        elif stock.quantity_on_hand >= product.maximum_stock_level:
            stock.status = "overstocked"
        else:
            stock.status = "in_stock"
    
    async def transfer_stock(
        self,
        from_store_id: str,
        to_store_id: str,
        product_id: str,
        quantity: int
    ) -> StockMovementOut:
        """Transfer stock between stores."""
        movement = StockMovementCreate(
            product_id=product_id,
            from_store_id=from_store_id,
            to_store_id=to_store_id,
            movement_type="transfer",
            quantity=quantity,
            notes=f"Transfer from {from_store_id} to {to_store_id}"
        )
        return await self.record_stock_movement(movement)
    
    def get_stock_movements(
        self,
        store_id: Optional[str] = None,
        product_id: Optional[str] = None,
        movement_type: Optional[str] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[StockMovementOut]:
        """Get stock movement history."""
        query = self.db.query(StockMovement).filter(
            StockMovement.owner_id == self.owner_id
        )
        
        if store_id:
            query = query.filter(
                or_(
                    StockMovement.from_store_id == store_id,
                    StockMovement.to_store_id == store_id
                )
            )
        
        if product_id:
            query = query.filter(StockMovement.product_id == product_id)
        
        if movement_type:
            query = query.filter(StockMovement.movement_type == movement_type)
        
        if start_date:
            query = query.filter(StockMovement.created_at >= datetime.combine(start_date, datetime.min.time()))
        
        if end_date:
            query = query.filter(StockMovement.created_at <= datetime.combine(end_date, datetime.max.time()))
        
        movements = query.order_by(desc(StockMovement.created_at)).offset(skip).limit(limit).all()
        return [StockMovementOut.from_orm(m) for m in movements]
    
    # ========================================================================
    # SUPPLIER OPERATIONS
    # ========================================================================
    
    async def create_supplier(self, payload: SupplierCreate) -> SupplierOut:
        """Create a new supplier."""
        supplier = Supplier(
            owner_id=self.owner_id,
            **payload.dict()
        )
        self.db.add(supplier)
        self.db.commit()
        self.db.refresh(supplier)
        return SupplierOut.from_orm(supplier)
    
    def get_all_suppliers(
        self,
        status: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[SupplierOut]:
        """Get suppliers."""
        query = self.db.query(Supplier).filter(
            Supplier.owner_id == self.owner_id
        )
        
        if status:
            query = query.filter(Supplier.status == status)
        
        suppliers = query.offset(skip).limit(limit).all()
        return [SupplierOut.from_orm(s) for s in suppliers]
    
    def get_supplier_by_id(self, supplier_id: str) -> SupplierOut:
        """Get supplier details."""
        supplier = self.db.query(Supplier).filter(
            Supplier.id == supplier_id,
            Supplier.owner_id == self.owner_id
        ).first()
        if not supplier:
            raise ValueError(f"Supplier {supplier_id} not found")
        return SupplierOut.from_orm(supplier)
    
    async def update_supplier(self, supplier_id: str, payload: SupplierUpdate) -> SupplierOut:
        """Update supplier."""
        supplier = self.db.query(Supplier).filter(
            Supplier.id == supplier_id,
            Supplier.owner_id == self.owner_id
        ).first()
        if not supplier:
            raise ValueError(f"Supplier {supplier_id} not found")
        
        for field, value in payload.dict(exclude_unset=True).items():
            setattr(supplier, field, value)
        
        supplier.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(supplier)
        return SupplierOut.from_orm(supplier)
    
    # ========================================================================
    # PURCHASE ORDER OPERATIONS
    # ========================================================================
    
    async def create_purchase_order(self, payload: PurchaseOrderCreate) -> PurchaseOrderDetailOut:
        """Create purchase order."""
        # Generate PO number
        po_number = payload.po_number or self._generate_po_number()
        
        # Calculate total
        total_amount = 0
        for item in payload.items:
            line_total = item.quantity_ordered * item.unit_price_kobo
            total_amount += line_total
        
        po = PurchaseOrder(
            owner_id=self.owner_id,
            supplier_id=payload.supplier_id,
            store_id=payload.store_id,
            po_number=po_number,
            total_amount_kobo=total_amount,
            expected_delivery_date=payload.expected_delivery_date,
            notes=payload.notes
        )
        self.db.add(po)
        self.db.flush()
        
        # Add items
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
        self.db.refresh(po)
        
        return self.get_purchase_order_by_id(po.id)
    
    def get_purchase_orders(
        self,
        status: Optional[str] = None,
        supplier_id: Optional[str] = None,
        store_id: Optional[str] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[PurchaseOrderOut]:
        """Get purchase orders."""
        query = self.db.query(PurchaseOrder).filter(
            PurchaseOrder.owner_id == self.owner_id
        )
        
        if status:
            query = query.filter(PurchaseOrder.status == status)
        if supplier_id:
            query = query.filter(PurchaseOrder.supplier_id == supplier_id)
        if store_id:
            query = query.filter(PurchaseOrder.store_id == store_id)
        if start_date:
            query = query.filter(PurchaseOrder.created_at >= datetime.combine(start_date, datetime.min.time()))
        if end_date:
            query = query.filter(PurchaseOrder.created_at <= datetime.combine(end_date, datetime.max.time()))
        
        pos = query.order_by(desc(PurchaseOrder.created_at)).offset(skip).limit(limit).all()
        return [PurchaseOrderOut.from_orm(po) for po in pos]
    
    def get_purchase_order_by_id(self, po_id: str) -> PurchaseOrderDetailOut:
        """Get PO details."""
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
        
        detail = PurchaseOrderDetailOut.from_orm(po)
        return detail
    
    async def update_purchase_order(self, po_id: str, payload: PurchaseOrderUpdate) -> PurchaseOrderDetailOut:
        """Update PO."""
        po = self.db.query(PurchaseOrder).filter(
            PurchaseOrder.id == po_id,
            PurchaseOrder.owner_id == self.owner_id
        ).first()
        if not po:
            raise ValueError(f"Purchase order {po_id} not found")
        
        for field, value in payload.dict(exclude_unset=True).items():
            setattr(po, field, value)
        
        po.updated_at = datetime.utcnow()
        self.db.commit()
        
        return self.get_purchase_order_by_id(po_id)
    
    async def confirm_purchase_order(self, po_id: str) -> PurchaseOrderOut:
        """Confirm (send) a PO."""
        po = self.db.query(PurchaseOrder).filter(
            PurchaseOrder.id == po_id,
            PurchaseOrder.owner_id == self.owner_id,
            PurchaseOrder.status == "draft"
        ).first()
        if not po:
            raise ValueError(f"Purchase order {po_id} not found or not in draft status")
        
        po.status = "confirmed"
        po.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(po)
        
        return PurchaseOrderOut.from_orm(po)
    
    async def receive_purchase_order(
        self,
        po_id: str,
        items: List[dict] = None,
        background_tasks = None
    ) -> PurchaseOrderOut:
        """Receive PO and update stock."""
        po = self.db.query(PurchaseOrder).filter(
            PurchaseOrder.id == po_id,
            PurchaseOrder.owner_id == self.owner_id
        ).first()
        if not po:
            raise ValueError(f"Purchase order {po_id} not found")
        
        # Update PO items and create stock movements
        for po_item in po.items:
            qty_received = po_item.quantity_ordered  # Default to full qty
            
            # Override if specific items provided
            if items:
                for item in items:
                    if item.get("product_id") == po_item.product_id:
                        qty_received = item.get("quantity_received", po_item.quantity_ordered)
                        break
            
            po_item.quantity_received = qty_received
            
            # Create stock movement
            movement = StockMovementCreate(
                product_id=po_item.product_id,
                to_store_id=po.store_id,
                movement_type="purchase",
                quantity=qty_received,
                reference_id=po_id,
                reference_type="purchase_order",
                input_method="api"
            )
            await self.record_stock_movement(movement)
        
        po.status = "received"
        po.actual_delivery_date = date.today()
        po.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(po)
        
        return PurchaseOrderOut.from_orm(po)
    
    def _generate_po_number(self) -> str:
        """Generate unique PO number."""
        from datetime import datetime
        import uuid
        timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
        unique = str(uuid.uuid4())[:8].upper()
        return f"PO-{timestamp}-{unique}"
    
    # ========================================================================
    # ANALYTICS & INSIGHTS
    # ========================================================================
    
    def calculate_inventory_metrics(
        self,
        store_id: Optional[str] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None
    ) -> InventoryMetricsOut:
        """Calculate comprehensive inventory metrics."""
        end_date = end_date or date.today()
        start_date = start_date or (end_date - timedelta(days=90))
        
        # Get stock levels
        stock_query = self.db.query(StockLevel)
        if store_id:
            stock_query = stock_query.filter(StockLevel.store_id == store_id)
        
        stock_levels = stock_query.all()
        
        total_qty = sum(sl.quantity_on_hand for sl in stock_levels)
        total_value = 0
        low_stock_count = 0
        out_of_stock_count = 0
        sk_count = 0
        
        for stock in stock_levels:
            product = self.db.query(Product).filter(Product.id == stock.product_id).first()
            if not product:
                continue
            
            sk_count += 1
            total_value += stock.quantity_on_hand * product.cost_price_kobo
            
            if stock.quantity_on_hand <= product.minimum_stock_level:
                low_stock_count += 1
            if stock.quantity_on_hand <= 0:
                out_of_stock_count += 1
        
        # Calculate turnover ratio
        sales_qty = self.db.query(func.sum(SalesTransactionItem.quantity_sold)).filter(
            SalesTransactionItem.created_at >= datetime.combine(start_date, datetime.min.time()),
            SalesTransactionItem.created_at <= datetime.combine(end_date, datetime.max.time())
        ).scalar() or 0
        
        avg_inventory = total_qty if total_qty > 0 else 1
        turnover_ratio = Decimal(str(sales_qty / avg_inventory)) if avg_inventory > 0 else Decimal(0)
        
        return InventoryMetricsOut(
            store_id=store_id,
            date=end_date,
            total_inventory_value_kobo=int(total_value),
            total_quantity_on_hand=total_qty,
            low_stock_items_count=low_stock_count,
            out_of_stock_items_count=out_of_stock_count,
            inventory_turnover_ratio=turnover_ratio,
            total_sku_count=sk_count,
            active_sku_count=sk_count - out_of_stock_count,
            discontinued_sku_count=0
        )
    
    def get_product_health_scores(self, limit: int = 50) -> List[ProductHealthOut]:
        """Get health scores for products."""
        # This would typically query the materialized view
        # For now, calculate on-the-fly
        products = self.db.query(Product).filter(
            Product.owner_id == self.owner_id,
            Product.is_active == True
        ).limit(limit).all()
        
        health_scores = []
        for product in products:
            stock_levels = self.db.query(StockLevel).filter(
                StockLevel.product_id == product.id
            ).all()
            
            total_qty = sum(sl.quantity_on_hand for sl in stock_levels)
            total_cost_value = total_qty * product.cost_price_kobo
            total_sell_value = total_qty * product.selling_price_kobo
            profit_value = total_sell_value - total_cost_value
            margin_pct = ((product.selling_price_kobo - product.cost_price_kobo) / product.cost_price_kobo * 100) if product.cost_price_kobo > 0 else 0
            
            # Determine health
            if total_qty <= 0:
                health = "critical"
            elif total_qty <= product.minimum_stock_level:
                health = "low"
            elif total_qty >= product.maximum_stock_level:
                health = "overstocked"
            else:
                health = "healthy"
            
            score = ProductHealthOut(
                id=product.id,
                sku=product.sku,
                name=product.name,
                total_quantity_on_hand=total_qty,
                total_cost_value_kobo=int(total_cost_value),
                total_selling_value_kobo=int(total_sell_value),
                profit_value_kobo=int(profit_value),
                margin_percentage=Decimal(str(margin_pct)),
                stock_health=health,
                minimum_stock_level=product.minimum_stock_level,
                maximum_stock_level=product.maximum_stock_level
            )
            health_scores.append(score)
        
        return health_scores
    
    def get_low_stock_items(self, store_id: Optional[str] = None) -> List[ProductDetailOut]:
        """Get products below minimum stock."""
        query = self.db.query(StockLevel).filter(
            StockLevel.status.in_(["low_stock", "out_of_stock"])
        )
        
        if store_id:
            query = query.filter(StockLevel.store_id == store_id)
        
        stock_levels = query.all()
        products = []
        
        for stock in stock_levels:
            product_detail = self.get_product_detail(stock.product_id, store_id)
            products.append(product_detail)
        
        return products
    
    def detect_dead_stock(self, days_no_sales: int = 30) -> List[ProductDetailOut]:
        """Detect products with no sales."""
        cutoff_date = datetime.utcnow() - timedelta(days=days_no_sales)
        
        # Get products with last sale before cutoff
        products_with_sales = self.db.query(Product.id).join(
            SalesTransactionItem,
            Product.id == SalesTransactionItem.product_id
        ).filter(
            Product.owner_id == self.owner_id,
            SalesTransactionItem.created_at >= cutoff_date
        ).distinct()
        
        dead_stock = self.db.query(Product).filter(
            Product.owner_id == self.owner_id,
            Product.is_active == True,
            ~Product.id.in_(products_with_sales)
        ).all()
        
        return [self.get_product_detail(p.id) for p in dead_stock]
    
    def get_ai_insights(self, store_id: Optional[str] = None) -> AIInsightsOut:
        """Get AI-powered insights."""
        # Placeholder - would integrate with ML models
        return AIInsightsOut(
            store_id=store_id,
            generated_at=datetime.utcnow()
        )
    
    def calculate_turnover_ratio(
        self,
        product_id: Optional[str] = None,
        store_id: Optional[str] = None,
        days: int = 30
    ) -> Dict[str, Any]:
        """Calculate inventory turnover ratio."""
        start_date = datetime.utcnow() - timedelta(days=days)
        
        query = self.db.query(func.sum(SalesTransactionItem.quantity_sold)).filter(
            SalesTransactionItem.created_at >= start_date
        )
        
        if product_id:
            query = query.filter(SalesTransactionItem.product_id == product_id)
        
        sales_qty = query.scalar() or 0
        
        # Get average inventory
        stock_query = self.db.query(func.avg(StockLevel.quantity_on_hand))
        if product_id:
            stock_query = stock_query.filter(StockLevel.product_id == product_id)
        if store_id:
            stock_query = stock_query.filter(StockLevel.store_id == store_id)
        
        avg_inventory = stock_query.scalar() or 1
        turnover_ratio = sales_qty / avg_inventory if avg_inventory > 0 else 0
        
        return {
            "sales_quantity": sales_qty,
            "average_inventory": avg_inventory,
            "turnover_ratio": Decimal(str(turnover_ratio)),
            "days": days
        }
    
    # ========================================================================
    # VOICE & SCAN PROCESSING
    # ========================================================================
    
    async def process_voice_input(
        self,
        audio_base64: str,
        store_id: str,
        background_tasks = None
    ) -> Dict[str, Any]:
        """Process voice input for inventory update."""
        # Placeholder - would integrate with speech recognition
        return {
            "status": "processing",
            "store_id": store_id,
            "message": "Voice processing not yet implemented"
        }
    
    async def process_vision_scan(
        self,
        image_base64: str,
        store_id: str,
        background_tasks = None
    ) -> Dict[str, Any]:
        """Process computer vision scan."""
        # Placeholder - would integrate with CV models
        return {
            "status": "processing",
            "store_id": store_id,
            "message": "Vision processing not yet implemented"
        }


# Placeholder imports - these would be actual models
# from app.models import Store, Category, Product, Supplier, StockLevel, StockMovement, PurchaseOrder, PurchaseOrderItem, SalesTransaction, SalesTransactionItem
