"""
Production-Grade Inventory Service
Handles all inventory operations with full type safety and business logic.
"""

from typing import List, Optional, Dict, Any
from datetime import date, datetime, timedelta
from decimal import Decimal
from uuid import uuid4
from sqlalchemy import and_, or_, func, desc
from sqlalchemy.orm import Session, joinedload
import logging
from fastapi import HTTPException

from app.core.config import settings
from app.domain.inventory.entities import InventoryCommand, InventoryMovementType
from app.domain.inventory.service import InventoryCommandService
from app.domain.inventory.sqlalchemy_adapters import (
    SQLAlchemyInventoryIdempotencyStore,
    SQLAlchemyInventoryLedgerRepository,
    SQLAlchemyInventoryOutbox,
)
from app.models import (
    Store, Category, Product, Supplier, StockLevel, 
    StockMovement, PurchaseOrder, PurchaseOrderItem, 
    SalesTransactionItem, InventoryMetrics, InventoryReservationModel
)
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
    StockReservationCreate,
    StockReservationAction,
    StockReservationOut,
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
    LedgerEntry,
    SalesTransactionCreate,
    SalesTransactionOut
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

    def _process_domain_inventory_command(self, payload: StockMovementCreate) -> None:
        movement_value = payload.movement_type.value if hasattr(payload.movement_type, "value") else str(payload.movement_type)
        movement_type = InventoryMovementType(movement_value)
        command_id = str(uuid4())
        if payload.reference_id:
            idempotency_key = (
                f"{self.owner_id}:{payload.reference_type or 'ref'}:{payload.reference_id}:"
                f"{payload.product_id}:{movement_value}:{payload.quantity}:"
                f"{payload.from_store_id or ''}:{payload.to_store_id or ''}"
            )
        else:
            idempotency_key = f"auto:{command_id}"

        command = InventoryCommand(
            owner_id=self.owner_id,
            command_id=command_id,
            idempotency_key=idempotency_key,
            product_id=payload.product_id,
            movement_type=movement_type,
            quantity=payload.quantity,
            occurred_at=datetime.utcnow(),
            from_store_id=payload.from_store_id,
            to_store_id=payload.to_store_id,
            reference_id=payload.reference_id,
            reference_type=payload.reference_type,
            reason_code=payload.notes,
        )

        service = InventoryCommandService(
            ledger_repo=SQLAlchemyInventoryLedgerRepository(self.db),
            idempotency_store=SQLAlchemyInventoryIdempotencyStore(self.db),
            outbox=SQLAlchemyInventoryOutbox(self.db),
        )
        service.process(command)
    
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
        """Create a new product with optional initial stock."""
        try:
            # Check SKU uniqueness
            existing = self.db.query(Product).filter(
                Product.owner_id == self.owner_id,
                Product.sku == payload.sku
            ).first()
            if existing:
                raise ValueError(f"SKU {payload.sku} already exists")
            
            # Extract stock info before creating Product model
            product_data = payload.dict(exclude={'quantity_on_hand', 'store_id'})
            initial_qty = payload.quantity_on_hand
            target_store_id = payload.store_id
            
            product = Product(
                owner_id=self.owner_id,
                **product_data
            )
            self.db.add(product)
            self.db.flush() # Get product.id
            
            # Handle initial stock if provided
            if initial_qty is not None:
                if not target_store_id:
                    # Find primary store
                    primary_store = self.db.query(Store).filter(
                        Store.owner_id == self.owner_id,
                        Store.is_primary == True
                    ).first()
                    
                    if not primary_store:
                        # Fallback to any store if no primary exists
                        primary_store = self.db.query(Store).filter(
                            Store.owner_id == self.owner_id
                        ).first()
                    
                    if not primary_store:
                        # If absolutely no store exists, create a default one
                        primary_store = Store(
                            owner_id=self.owner_id,
                            name="Default Store",
                            address="Main Street",
                            city="Default City",
                            state="Default State",
                            is_primary=True
                        )
                        self.db.add(primary_store)
                        self.db.flush()
                    
                    target_store_id = primary_store.id
                
                # Create stock level
                stock = StockLevel(
                    product_id=product.id,
                    store_id=target_store_id,
                    quantity_on_hand=initial_qty,
                    status="in_stock" if initial_qty > product.minimum_stock_level else "low_stock"
                )
                self.db.add(stock)
                
                # Record initial movement
                movement = StockMovement(
                    owner_id=self.owner_id,
                    product_id=product.id,
                    to_store_id=target_store_id,
                    movement_type="adjustment",
                    quantity=initial_qty,
                    notes="Initial stock upon product creation"
                )
                self.db.add(movement)
                
            self.db.commit()
            self.db.refresh(product)
            return ProductOut.from_orm(product)
        except ValueError as e:
            self.db.rollback()
            raise HTTPException(status_code=400, detail=str(e))
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error creating product: {str(e)}")
            raise HTTPException(status_code=500, detail="Internal server error occurred while creating product")
    
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
        
        # Performance optimization: Fetch all stock levels for these products in one query
        product_ids = [p.id for p in products]
        stock_levels = self.db.query(StockLevel).filter(
            StockLevel.product_id.in_(product_ids)
        ).all()
        
        # Map stock quantities to products
        stock_map = {}
        for s in stock_levels:
            stock_map[s.product_id] = stock_map.get(s.product_id, 0) + s.quantity_on_hand
            
        result = []
        for p in products:
            p_out = ProductOut.from_orm(p)
            p_out.quantity_on_hand = stock_map.get(p.id, 0)
            result.append(p_out)
            
        return result
    
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
        detail.children = [ProductOut.from_orm(c) for c in product.children]
        
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

        if settings.inventory_domain_enabled:
            try:
                self._process_domain_inventory_command(payload)
            except Exception:
                if settings.inventory_domain_enforce:
                    raise
                logger.exception(
                    "Domain inventory command shadow processing failed for owner_id=%s product_id=%s",
                    self.owner_id,
                    payload.product_id,
                )
        
        movement = StockMovement(
            owner_id=self.owner_id,
            **payload.dict()
        )
        self.db.add(movement)
        
        # Update stock levels based on movement type
        if payload.movement_type == "sale":
            self._handle_sale_movement(payload)
        elif payload.movement_type == "damage":
            self._handle_sale_movement(payload)
        elif payload.movement_type == "purchase":
            self._handle_purchase_movement(payload)
        elif payload.movement_type == "return":
            self._handle_purchase_movement(payload)
        elif payload.movement_type == "transfer":
            self._handle_transfer_movement(payload)
        elif payload.movement_type == "adjustment":
            self._handle_adjustment_movement(payload)
        
        self.db.commit()
        self.db.refresh(movement)
        return StockMovementOut.from_orm(movement)

    async def reserve_stock(self, payload: StockReservationCreate) -> StockReservationOut:
        """Reserve available stock for a downstream flow (e.g., checkout)."""
        product = self.db.query(Product).filter(
            Product.id == payload.product_id,
            Product.owner_id == self.owner_id,
            Product.is_active == True
        ).first()
        if not product:
            raise ValueError(f"Product {payload.product_id} not found")

        stock = self.db.query(StockLevel).filter(
            StockLevel.product_id == payload.product_id,
            StockLevel.store_id == payload.store_id
        ).first()
        if not stock:
            raise ValueError("No stock record found for product in the specified store")
        if stock.quantity_available < payload.quantity:
            raise ValueError("Insufficient available stock to reserve")

        stock.quantity_reserved += payload.quantity
        stock.updated_at = datetime.utcnow()

        reservation = InventoryReservationModel(
            owner_id=self.owner_id,
            product_id=payload.product_id,
            store_id=payload.store_id,
            status="active",
            purpose=payload.purpose,
            quantity_reserved=payload.quantity,
            quantity_committed=0,
            quantity_released=0,
            reference_id=payload.reference_id,
            reference_type=payload.reference_type,
            notes=payload.notes,
            expires_at=payload.expires_at,
        )
        self.db.add(reservation)
        self.db.commit()
        self.db.refresh(reservation)
        return StockReservationOut.from_orm(reservation)

    def list_stock_reservations(
        self,
        store_id: Optional[str] = None,
        product_id: Optional[str] = None,
        status: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[StockReservationOut]:
        query = self.db.query(InventoryReservationModel).filter(
            InventoryReservationModel.owner_id == self.owner_id
        )
        if store_id:
            query = query.filter(InventoryReservationModel.store_id == store_id)
        if product_id:
            query = query.filter(InventoryReservationModel.product_id == product_id)
        if status:
            query = query.filter(InventoryReservationModel.status == status)

        rows = query.order_by(desc(InventoryReservationModel.created_at)).offset(skip).limit(limit).all()
        return [StockReservationOut.from_orm(r) for r in rows]

    def get_stock_reservation(self, reservation_id: str) -> StockReservationOut:
        reservation = self.db.query(InventoryReservationModel).filter(
            InventoryReservationModel.id == reservation_id,
            InventoryReservationModel.owner_id == self.owner_id
        ).first()
        if not reservation:
            raise ValueError(f"Reservation {reservation_id} not found")
        return StockReservationOut.from_orm(reservation)

    async def release_stock_reservation(
        self,
        reservation_id: str,
        payload: StockReservationAction,
    ) -> StockReservationOut:
        reservation = self.db.query(InventoryReservationModel).filter(
            InventoryReservationModel.id == reservation_id,
            InventoryReservationModel.owner_id == self.owner_id
        ).first()
        if not reservation:
            raise ValueError(f"Reservation {reservation_id} not found")
        if reservation.status != "active":
            raise ValueError(f"Reservation is not active (status={reservation.status})")

        remaining = reservation.quantity_reserved - reservation.quantity_committed - reservation.quantity_released
        if remaining <= 0:
            raise ValueError("Reservation has no releasable quantity")

        quantity_to_release = payload.quantity or remaining
        if quantity_to_release <= 0 or quantity_to_release > remaining:
            raise ValueError("Invalid release quantity")

        stock = self.db.query(StockLevel).filter(
            StockLevel.product_id == reservation.product_id,
            StockLevel.store_id == reservation.store_id
        ).first()
        if not stock:
            raise ValueError("No stock record found for reservation store/product")
        if stock.quantity_reserved < quantity_to_release:
            raise ValueError("Reserved stock is lower than release quantity")

        stock.quantity_reserved -= quantity_to_release
        stock.updated_at = datetime.utcnow()

        reservation.quantity_released += quantity_to_release
        if payload.notes:
            reservation.notes = payload.notes
        if (reservation.quantity_reserved - reservation.quantity_committed - reservation.quantity_released) == 0:
            reservation.status = "released"
            reservation.released_at = datetime.utcnow()
        reservation.updated_at = datetime.utcnow()

        self.db.commit()
        self.db.refresh(reservation)
        return StockReservationOut.from_orm(reservation)

    async def commit_stock_reservation(
        self,
        reservation_id: str,
        payload: StockReservationAction,
    ) -> StockReservationOut:
        reservation = self.db.query(InventoryReservationModel).filter(
            InventoryReservationModel.id == reservation_id,
            InventoryReservationModel.owner_id == self.owner_id
        ).first()
        if not reservation:
            raise ValueError(f"Reservation {reservation_id} not found")
        if reservation.status != "active":
            raise ValueError(f"Reservation is not active (status={reservation.status})")

        remaining = reservation.quantity_reserved - reservation.quantity_committed - reservation.quantity_released
        if remaining <= 0:
            raise ValueError("Reservation has no committable quantity")

        quantity_to_commit = payload.quantity or remaining
        if quantity_to_commit <= 0 or quantity_to_commit > remaining:
            raise ValueError("Invalid commit quantity")

        stock = self.db.query(StockLevel).filter(
            StockLevel.product_id == reservation.product_id,
            StockLevel.store_id == reservation.store_id
        ).first()
        if not stock:
            raise ValueError("No stock record found for reservation store/product")
        if stock.quantity_reserved < quantity_to_commit:
            raise ValueError("Reserved stock is lower than commit quantity")
        if stock.quantity_on_hand < quantity_to_commit:
            raise ValueError("Insufficient on-hand stock to commit reservation")

        stock.quantity_reserved -= quantity_to_commit
        stock.quantity_on_hand -= quantity_to_commit
        stock.last_movement_at = datetime.utcnow()
        self._update_stock_status(stock)

        movement = StockMovement(
            owner_id=self.owner_id,
            product_id=reservation.product_id,
            from_store_id=reservation.store_id,
            movement_type="sale" if reservation.purpose == "sale" else "adjustment",
            quantity=quantity_to_commit,
            reference_id=reservation.id,
            reference_type="reservation_commit",
            notes=payload.notes or reservation.notes,
        )
        self.db.add(movement)

        if settings.inventory_domain_enabled:
            domain_payload = StockMovementCreate(
                product_id=reservation.product_id,
                from_store_id=reservation.store_id,
                movement_type="sale" if reservation.purpose == "sale" else "adjustment",
                quantity=quantity_to_commit,
                reference_id=reservation.id,
                reference_type="reservation_commit",
                notes=payload.notes or reservation.notes,
            )
            try:
                self._process_domain_inventory_command(domain_payload)
            except Exception:
                if settings.inventory_domain_enforce:
                    raise
                logger.exception(
                    "Domain inventory command shadow processing failed for reservation_id=%s",
                    reservation.id,
                )

        reservation.quantity_committed += quantity_to_commit
        if payload.notes:
            reservation.notes = payload.notes
        if (reservation.quantity_reserved - reservation.quantity_committed - reservation.quantity_released) == 0:
            reservation.status = "committed"
            reservation.committed_at = datetime.utcnow()
        reservation.updated_at = datetime.utcnow()

        self.db.commit()
        self.db.refresh(reservation)
        return StockReservationOut.from_orm(reservation)
    
    def _handle_sale_movement(self, payload: StockMovementCreate):
        """Handle sale movement - decrease stock. Supports conversion to parent units."""
        if not payload.from_store_id:
            raise ValueError("from_store_id required for sale movement")
        
        product = self.db.query(Product).filter(Product.id == payload.product_id).first()
        if not product:
            raise ValueError("Product not found")
        
        # Determine target product and quantity (handle conversion)
        target_product_id = product.parent_id if product.parent_id else product.id
        effective_qty = payload.quantity * (product.conversion_factor if product.parent_id else 1)
        
        stock = self.db.query(StockLevel).filter(
            StockLevel.product_id == target_product_id,
            StockLevel.store_id == payload.from_store_id
        ).first()
        
        if not stock or stock.quantity_available < effective_qty:
            raise ValueError(f"Insufficient stock for sale. Needed {effective_qty} units of base product.")
        
        stock.quantity_on_hand -= effective_qty
        stock.last_movement_at = datetime.utcnow()
        self._update_stock_status(stock)
    
    def _handle_purchase_movement(self, payload: StockMovementCreate):
        """Handle purchase movement - increase stock. Supports conversion to parent units."""
        if not payload.to_store_id:
            raise ValueError("to_store_id required for purchase movement")
        
        product = self.db.query(Product).filter(Product.id == payload.product_id).first()
        if not product:
            raise ValueError("Product not found")
            
        # Determine target product and quantity (handle conversion)
        target_product_id = product.parent_id if product.parent_id else product.id
        effective_qty = payload.quantity * (product.conversion_factor if product.parent_id else 1)
        
        stock = self.db.query(StockLevel).filter(
            StockLevel.product_id == target_product_id,
            StockLevel.store_id == payload.to_store_id
        ).first()
        
        if not stock:
            stock = StockLevel(
                product_id=target_product_id,
                store_id=payload.to_store_id,
                quantity_on_hand=effective_qty
            )
            self.db.add(stock)
        else:
            stock.quantity_on_hand += effective_qty
        
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
        # Resolve store_id if not provided
        store_id = payload.store_id
        if not store_id:
            store = self.db.query(Store).filter(
                Store.owner_id == self.owner_id,
                Store.is_primary == True
            ).first()
            if not store:
                # Fallback to any store
                store = self.db.query(Store).filter(
                    Store.owner_id == self.owner_id
                ).first()
            
            if not store:
                # Create default store if none exists
                store = Store(
                    owner_id=self.owner_id,
                    name="Default Store",
                    type="retail",
                    address="Default Address",
                    city="Default City",
                    state="Default State",
                    is_primary=True,
                    status="active"
                )
                self.db.add(store)
                self.db.flush()
            
            store_id = store.id

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
            store_id=store_id,
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
        
        pos = query.options(joinedload(PurchaseOrder.supplier), joinedload(PurchaseOrder.store)).order_by(desc(PurchaseOrder.created_at)).offset(skip).limit(limit).all()
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
    
    # Analytics logic moved to AnalyticsService

    
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
        """Parse voice input and update inventory via stock movement."""
        # Simulate STT and NLP
        # In production, this would call a VoiceProcessingService
        detected_product_name = "Mock Water"
        detected_qty = 5
        
        # Resolve product
        product = self.db.query(Product).filter(
            Product.owner_id == self.owner_id,
            Product.name.ilike(f"%{detected_product_name}%")
        ).first()
        
        if not product:
            return {"status": "error", "message": "Product not recognized from voice"}

        movement = StockMovementCreate(
            product_id=product.id,
            from_store_id=store_id,
            movement_type="sale",
            quantity=detected_qty,
            input_method="voice",
            notes="Voice-commanded inventory update"
        )
        
        result = await self.record_stock_movement(movement)
        return {
            "status": "success",
            "detected_product": product.name,
            "quantity": detected_qty,
            "movement_id": result.id
        }
    
    async def process_vision_scan(
        self,
        image_base64: str,
        store_id: str,
        background_tasks = None
    ) -> Dict[str, Any]:
        """Process computer vision scan and adjust stock levels."""
        # Simulate CV processing
        detected_items = [
            {"sku": "SKU001", "observed_qty": 20},
            {"sku": "SKU002", "observed_qty": 15}
        ]
        
        adjustments = []
        for item in detected_items:
            product = self.db.query(Product).filter(
                Product.owner_id == self.owner_id,
                Product.sku == item["sku"]
            ).first()
            
            if product:
                # Calculate delta for adjustment
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
                    await self.record_stock_movement(movement)
                    adjustments.append({"sku": item["sku"], "delta": delta})
        
        return {"status": "success", "adjustments": adjustments}
    
    async def create_sales_transaction(self, payload: SalesTransactionCreate) -> SalesTransactionOut:
        """Records a sale, depletes stock, and creates movements."""
        try:
            # 1. Resolve Store
            store_id = payload.store_id
            if not store_id:
                store = self.db.query(Store).filter(Store.owner_id == self.owner_id, Store.is_primary == True).first()
                if not store:
                    store = self.db.query(Store).filter(Store.owner_id == self.owner_id).first()
                if not store:
                    raise ValueError("No store found. Please create a store first.")
                store_id = store.id

            # 2. Create Transaction Header
            transaction = SalesTransaction(
                owner_id=self.owner_id,
                store_id=store_id,
                customer_id=payload.customer_id,
                customer_name=payload.customer_name,
                payment_method=payload.payment_method,
                notes=payload.notes,
                total_amount_kobo=0 # Update later
            )
            self.db.add(transaction)
            self.db.flush()

            total_amount = 0
            
            # 3. Process Items
            for item_payload in payload.items:
                product = self.db.query(Product).filter(Product.id == item_payload.product_id, Product.owner_id == self.owner_id).first()
                if not product:
                    raise ValueError(f"Product {item_payload.product_id} not found")

                line_total = item_payload.quantity_sold * item_payload.unit_price_kobo
                total_amount += line_total

                sale_item = SalesTransactionItem(
                    sales_transaction_id=transaction.id,
                    product_id=product.id,
                    quantity_sold=item_payload.quantity_sold,
                    unit_price_kobo=item_payload.unit_price_kobo,
                    line_total_kobo=line_total
                )
                self.db.add(sale_item)

                # 4. Deplete Stock
                stock = self.db.query(StockLevel).filter(
                    StockLevel.product_id == product.id,
                    StockLevel.store_id == store_id
                ).first()

                if not stock:
                    raise ValueError(f"No stock level found for product {product.id} in store {store_id}")
                if stock.quantity_available < item_payload.quantity_sold:
                    raise ValueError(f"Insufficient stock for product {product.name}")

                stock.quantity_on_hand -= item_payload.quantity_sold
                stock.last_movement_at = datetime.utcnow()
                self._update_stock_status(stock)

                # 5. Create Movement
                movement = StockMovement(
                    product_id=product.id,
                    from_store_id=store_id,
                    movement_type="sale",
                    quantity=item_payload.quantity_sold,
                    reference_id=transaction.id,
                    reference_type="sales_transaction",
                    owner_id=self.owner_id
                )
                self.db.add(movement)

            transaction.total_amount_kobo = total_amount
            self.db.commit()
            self.db.refresh(transaction)
            
            # Re-fetch with items for output
            return self.get_sales_transaction_by_id(transaction.id)

        except ValueError as exc:
            self.db.rollback()
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        except HTTPException:
            self.db.rollback()
            raise
        except Exception:
            self.db.rollback()
            logger.exception("Failed to create sales transaction for owner_id=%s", self.owner_id)
            raise HTTPException(status_code=500, detail="Internal server error while creating sales transaction.")

    def get_sales_transaction_by_id(self, tx_id: str) -> SalesTransactionOut:
        """Get sale details."""
        tx = self.db.query(SalesTransaction).filter(
            SalesTransaction.id == tx_id,
            SalesTransaction.owner_id == self.owner_id
        ).options(joinedload(SalesTransaction.items)).first()
        if not tx:
            raise ValueError(f"Transaction {tx_id} not found")
        return SalesTransactionOut.from_orm(tx)

    async def transform_stock(self, parent_product_id: str, quantity_to_break: int, store_id: str):
        """Breaks bulk packaging into units (e.g., 1 Carton -> 12 Pieces)."""
        parent = self.db.query(Product).filter(Product.id == parent_product_id, Product.owner_id == self.owner_id).first()
        child = self.db.query(Product).filter(Product.parent_id == parent_product_id, Product.owner_id == self.owner_id).first()
        
        if not parent or not child:
            raise ValueError("Invalid parent/child relationship for transformation")
            
        # 1. Reduce Parent
        parent_stock = self.db.query(StockLevel).filter(StockLevel.product_id == parent.id, StockLevel.store_id == store_id).first()
        if not parent_stock or parent_stock.quantity_on_hand < quantity_to_break:
            raise ValueError("Insufficient parent stock to transform")
            
        parent_stock.quantity_on_hand -= quantity_to_break
        
        # 2. Increase Child
        child_qty = quantity_to_break * child.conversion_factor
        child_stock = self.db.query(StockLevel).filter(StockLevel.product_id == child.id, StockLevel.store_id == store_id).first()
        if not child_stock:
            child_stock = StockLevel(product_id=child.id, store_id=store_id, quantity_on_hand=child_qty)
            self.db.add(child_stock)
        else:
            child_stock.quantity_on_hand += child_qty
            
        # 3. Movements
        parent_mov = StockMovement(
            product_id=parent.id,
            from_store_id=store_id,
            movement_type="adjustment",
            quantity=quantity_to_break, owner_id=self.owner_id, notes=f"Broken into {child.name}"
        )
        child_mov = StockMovement(
            product_id=child.id,
            to_store_id=store_id,
            movement_type="adjustment",
            quantity=child_qty, owner_id=self.owner_id, notes=f"Extracted from {parent.name}"
        )
        self.db.add(parent_mov)
        self.db.add(child_mov)
        
        self.db.commit()

    def get_ledger(self, skip: int = 0, limit: int = 100) -> List[LedgerEntry]:
        """Returns a detailed sales ledger for the UI sheet."""
        query = self.db.query(
            SalesTransactionItem.id,
            Product.name.label("product_name"),
            SalesTransaction.customer_name,
            SalesTransaction.customer_id,
            SalesTransactionItem.quantity_sold.label("quantity"),
            SalesTransactionItem.unit_price_kobo,
            SalesTransactionItem.line_total_kobo.label("revenue_kobo"),
            Product.cost_price_kobo,
            (SalesTransactionItem.line_total_kobo - (SalesTransactionItem.quantity_sold * Product.cost_price_kobo)).label("profit_kobo"),
            SalesTransaction.transaction_date
        ).join(
            SalesTransaction, SalesTransactionItem.sales_transaction_id == SalesTransaction.id
        ).join(
            Product, SalesTransactionItem.product_id == Product.id
        ).filter(
            SalesTransaction.owner_id == self.owner_id
        ).order_by(desc(SalesTransaction.transaction_date))
        
        results = query.offset(skip).limit(limit).all()
        
        return [
            LedgerEntry(
                id=r.id,
                product_name=r.product_name,
                customer_name=r.customer_name,
                customer_id=r.customer_id,
                quantity=r.quantity,
                unit_price_kobo=r.unit_price_kobo,
                revenue_kobo=r.revenue_kobo,
                cost_price_kobo=r.cost_price_kobo,
                profit_kobo=r.profit_kobo,
                transaction_date=r.transaction_date
            ) for r in results
        ]
