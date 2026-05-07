from __future__ import annotations

import logging
from datetime import date, datetime, timezone
from typing import List, Optional, Dict, Any
from uuid import uuid4

from sqlalchemy import and_, or_, func, desc
from sqlalchemy.orm import Session, joinedload

from app.core.config import settings
from app.domain.inventory.entities import InventoryCommand, InventoryMovementType
from app.domain.inventory.service import InventoryCommandService
from app.domain.inventory.sqlalchemy_adapters import (
    SQLAlchemyInventoryIdempotencyStore,
    SQLAlchemyInventoryLedgerRepository,
    SQLAlchemyInventoryOutbox,
)
from app.models import (
    Product,
    StockLevel,
    StockMovement,
    InventoryReservationModel,
)
from app.schemas.inventory_schemas import (
    StockLevelOut,
    StockMovementCreate,
    StockMovementOut,
    StockReservationAction,
    StockReservationCreate,
    StockReservationOut,
    LedgerEntry,
    ReconciliationResult,
    ProductDetailOut
)

logger = logging.getLogger(__name__)


class StockService:
    """
    Dedicated service for stock management logic: levels, movements, and reservations.
    Extracted from InventoryServiceV2 to adhere to SRP.
    """

    def __init__(self, db: Session, owner_id: str):
        self.db = db
        self.owner_id = owner_id
        self.AUTO_RESTOCK_THRESHOLD_PCT = 0.10

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
            occurred_at=datetime.now(timezone.utc),
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

    def get_stock_levels(self, store_id: str, status: Optional[str] = None) -> List[StockLevelOut]:
        query = self.db.query(StockLevel).filter(StockLevel.store_id == store_id).options(joinedload(StockLevel.product))
        if status:
            query = query.filter(StockLevel.status == status)
        
        stock_levels = query.all()
        return [StockLevelOut.model_validate(sl) for sl in stock_levels]

    def record_stock_movement(self, payload: StockMovementCreate, should_commit: bool = True) -> StockMovementOut:
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
                logger.exception("Domain inventory command processing failed")
        
        movement = StockMovement(owner_id=self.owner_id, **payload.model_dump())
        self.db.add(movement)
        
        # Dispatch to specific handlers
        handlers = {
            "sale": self._handle_depletion,
            "damage": self._handle_depletion,
            "purchase": self._handle_replenishment,
            "return": self._handle_replenishment,
            "transfer": self._handle_transfer,
            "adjustment": self._handle_adjustment,
        }
        
        movement_type = payload.movement_type.value if hasattr(payload.movement_type, "value") else str(payload.movement_type)
        handler = handlers.get(movement_type)
        if handler:
            handler(payload)
        
        if should_commit:
            self.db.commit()
            self.db.refresh(movement)
        else:
            self.db.flush()
            
        return StockMovementOut.model_validate(movement)

    def reserve_stock(self, payload: StockReservationCreate, should_commit: bool = True) -> StockReservationOut:
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
            raise ValueError("No stock record found")
        if stock.quantity_available < payload.quantity:
            raise ValueError("Insufficient available stock")

        stock.quantity_reserved += payload.quantity
        stock.updated_at = datetime.now(timezone.utc)

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
        self.db.flush()

        if should_commit:
            self.db.commit()
            self.db.refresh(reservation)
        return StockReservationOut.model_validate(reservation)

    def list_stock_reservations(
        self,
        store_id: Optional[str] = None,
        product_id: Optional[str] = None,
        status: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[StockReservationOut]:
        query = self.db.query(InventoryReservationModel).filter(InventoryReservationModel.owner_id == self.owner_id)
        if store_id:
            query = query.filter(InventoryReservationModel.store_id == store_id)
        if product_id:
            query = query.filter(InventoryReservationModel.product_id == product_id)
        if status:
            query = query.filter(InventoryReservationModel.status == status)

        rows = query.order_by(desc(InventoryReservationModel.created_at)).offset(skip).limit(limit).all()
        return [StockReservationOut.model_validate(r) for r in rows]

    def get_stock_reservation(self, reservation_id: str) -> StockReservationOut:
        reservation = self.db.query(InventoryReservationModel).filter(
            InventoryReservationModel.id == reservation_id,
            InventoryReservationModel.owner_id == self.owner_id
        ).first()
        if not reservation:
            raise ValueError(f"Reservation {reservation_id} not found")
        return StockReservationOut.model_validate(reservation)

    def release_stock_reservation(
        self, reservation_id: str, payload: StockReservationAction, should_commit: bool = True
    ) -> StockReservationOut:
        reservation = self.db.query(InventoryReservationModel).filter(
            InventoryReservationModel.id == reservation_id,
            InventoryReservationModel.owner_id == self.owner_id
        ).first()
        if not reservation or reservation.status != "active":
            raise ValueError("Active reservation not found")

        remaining = reservation.quantity_reserved - reservation.quantity_committed - reservation.quantity_released
        quantity_to_release = payload.quantity or remaining
        
        if quantity_to_release <= 0 or quantity_to_release > remaining:
            raise ValueError("Invalid release quantity")

        stock = self.db.query(StockLevel).filter(
            StockLevel.product_id == reservation.product_id,
            StockLevel.store_id == reservation.store_id
        ).first()
        
        stock.quantity_reserved -= quantity_to_release
        stock.updated_at = datetime.now(timezone.utc)

        reservation.quantity_released += quantity_to_release
        if payload.notes:
            reservation.notes = payload.notes
        
        if (reservation.quantity_reserved - reservation.quantity_committed - reservation.quantity_released) == 0:
            reservation.status = "released"
            reservation.released_at = datetime.now(timezone.utc)
            
        reservation.updated_at = datetime.now(timezone.utc)
        self.db.add(reservation)
        self.db.flush()

        if should_commit:
            self.db.commit()
            self.db.refresh(reservation)
        return StockReservationOut.model_validate(reservation)

    def commit_stock_reservation(
        self, reservation_id: str, payload: StockReservationAction, should_commit: bool = True
    ) -> StockReservationOut:
        reservation = self.db.query(InventoryReservationModel).filter(
            InventoryReservationModel.id == reservation_id,
            InventoryReservationModel.owner_id == self.owner_id
        ).first()
        if not reservation or reservation.status != "active":
            raise ValueError("Active reservation not found")

        remaining = reservation.quantity_reserved - reservation.quantity_committed - reservation.quantity_released
        quantity_to_commit = payload.quantity or remaining
        
        if quantity_to_commit <= 0 or quantity_to_commit > remaining:
            raise ValueError("Invalid commit quantity")

        stock = self.db.query(StockLevel).filter(
            StockLevel.product_id == reservation.product_id,
            StockLevel.store_id == reservation.store_id
        ).first()
        
        if stock.quantity_on_hand < quantity_to_commit:
            raise ValueError("Insufficient on-hand stock")

        stock.quantity_reserved -= quantity_to_commit
        stock.quantity_on_hand -= quantity_to_commit
        stock.last_movement_at = datetime.now(timezone.utc)
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

        reservation.quantity_committed += quantity_to_commit
        if (reservation.quantity_reserved - reservation.quantity_committed - reservation.quantity_released) == 0:
            reservation.status = "committed"
            reservation.committed_at = datetime.now(timezone.utc)
            
        reservation.updated_at = datetime.now(timezone.utc)
        self.db.add(reservation)
        self.db.flush()

        if should_commit:
            self.db.commit()
            self.db.refresh(reservation)
        return StockReservationOut.model_validate(reservation)

    def _handle_depletion(self, payload: StockMovementCreate):
        if not payload.from_store_id:
            raise ValueError("from_store_id required")
        
        product = self.db.get(Product, payload.product_id)
        target_product_id = product.parent_id or product.id
        effective_qty = payload.quantity * (product.conversion_factor if product.parent_id else 1)
        
        stock = self.db.query(StockLevel).filter(
            StockLevel.product_id == target_product_id,
            StockLevel.store_id == payload.from_store_id
        ).first()
        
        if not stock or stock.quantity_available < effective_qty:
            raise ValueError("Insufficient stock")
        
        stock.quantity_on_hand -= effective_qty
        stock.last_movement_at = datetime.now(timezone.utc)
        self._update_stock_status(stock)
        self._evaluate_restock_trigger(stock, product)

    def _handle_replenishment(self, payload: StockMovementCreate):
        if not payload.to_store_id:
            raise ValueError("to_store_id required")
            
        product = self.db.get(Product, payload.product_id)
        target_product_id = product.parent_id or product.id
        effective_qty = payload.quantity * (product.conversion_factor if product.parent_id else 1)
        
        stock = self.db.query(StockLevel).filter(
            StockLevel.product_id == target_product_id,
            StockLevel.store_id == payload.to_store_id
        ).first()
        
        if not stock:
            stock = StockLevel(product_id=target_product_id, store_id=payload.to_store_id, quantity_on_hand=effective_qty)
            self.db.add(stock)
        else:
            stock.quantity_on_hand += effective_qty
        
        stock.last_movement_at = datetime.now(timezone.utc)
        self._update_stock_status(stock)

    def _handle_transfer(self, payload: StockMovementCreate):
        if not payload.from_store_id or not payload.to_store_id:
            raise ValueError("Source and destination stores required")
        
        self._handle_depletion(payload)
        self._handle_replenishment(payload)

    def _handle_adjustment(self, payload: StockMovementCreate):
        if payload.quantity > 0:
            self._handle_replenishment(payload)
        else:
            # For negative adjustments, we use the depletion logic with absolute value
            abs_payload = payload.model_copy(update={"quantity": abs(payload.quantity)})
            self._handle_depletion(abs_payload)

    def _update_stock_status(self, stock: StockLevel):
        product = self.db.get(Product, stock.product_id)
        if stock.quantity_on_hand <= 0:
            stock.status = "out_of_stock"
        elif stock.quantity_on_hand <= product.minimum_stock_level:
            stock.status = "low_stock"
        elif product.maximum_stock_level and stock.quantity_on_hand >= product.maximum_stock_level:
            stock.status = "overstocked"
        else:
            stock.status = "in_stock"

    def _evaluate_restock_trigger(self, stock: StockLevel, product: Product):
        max_level = product.maximum_stock_level or 0
        if max_level > 0 and stock.quantity_on_hand <= (max_level * self.AUTO_RESTOCK_THRESHOLD_PCT):
            logger.info(f"Restock recommended for product {stock.product_id}")

    def get_stock_movements(
        self,
        store_id: Optional[str] = None,
        product_id: Optional[str] = None,
        movement_type: Optional[str] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        skip: int = 0,
        limit: int = 100
    ) -> tuple[List[StockMovementOut], int]:
        query = self.db.query(StockMovement).filter(StockMovement.owner_id == self.owner_id)
        if store_id:
            query = query.filter(or_(StockMovement.from_store_id == store_id, StockMovement.to_store_id == store_id))
        if product_id:
            query = query.filter(StockMovement.product_id == product_id)
        if movement_type:
            query = query.filter(StockMovement.movement_type == movement_type)
        if start_date:
            query = query.filter(StockMovement.created_at >= datetime.combine(start_date, datetime.min.time()))
        if end_date:
            query = query.filter(StockMovement.created_at <= datetime.combine(end_date, datetime.max.time()))
            
        total_count = query.count()
        movements = query.order_by(desc(StockMovement.created_at)).offset(skip).limit(limit).all()
        return [StockMovementOut.model_validate(m) for m in movements], total_count

    def get_ledger(self, skip: int = 0, limit: int = 100) -> List[LedgerEntry]:
        """Reads from the domain ledger repository."""
        repo = SQLAlchemyInventoryLedgerRepository(self.db)
        entries = repo.get_by_owner(self.owner_id, limit=limit, offset=skip)
        return [LedgerEntry.model_validate(e) for e in entries]

    def get_low_stock_items(self, store_id: Optional[str] = None) -> List[ProductDetailOut]:
        """Get products below minimum stock level for a specific store or all stores."""
        query = self.db.query(StockLevel).join(Product).filter(
            Product.owner_id == self.owner_id,
            StockLevel.quantity_on_hand <= Product.minimum_stock_level
        )
        if store_id:
            query = query.filter(StockLevel.store_id == store_id)
        
        results = query.all()
        # In a real app, we'd map this to ProductDetailOut schema
        return results

    def reconcile_inventory(self, store_id: str, product_id: Optional[str] = None) -> List[ReconciliationResult]:
        """
        Reconcile stock levels against the immutable domain ledger.
        Identifies discrepancies between the current stock_levels table and the aggregate of the ledger.
        """
        repo = SQLAlchemyInventoryLedgerRepository(self.db)
        # 1. Fetch current stock levels joined with product for SKU/Name
        stock_query = self.db.query(StockLevel).join(Product).filter(StockLevel.store_id == store_id)
        if product_id:
            stock_query = stock_query.filter(StockLevel.product_id == product_id)
        
        current_stocks = stock_query.all()
        reconciliation_results = []

        for stock in current_stocks:
            # 2. Calculate balance from ledger
            ledger_balance = repo.get_balance(self.owner_id, stock.product_id, store_id)
            
            # We return everything, even if no drift, if the user requested a specific product,
            # or only mismatches if it's a general sweep? 
            # Usually reconciliation audits show everything but highlight mismatches.
            # But the schema 'status' implies we can tag it.
            
            drift = stock.quantity_on_hand - ledger_balance
            
            reconciliation_results.append({
                "product_id": stock.product_id,
                "sku": stock.product.sku,
                "name": stock.product.name,
                "current_on_hand": stock.quantity_on_hand,
                "ledger_sum": ledger_balance,
                "drift": drift,
                "status": "mismatch" if drift != 0 else "reconciled",
                "timestamp": datetime.now(timezone.utc)
            })
        
        return reconciliation_results
