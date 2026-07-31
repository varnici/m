from __future__ import annotations

import logging
from datetime import date, datetime, timezone
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session

from app.schemas.inventory_schemas import (
    StoreCreate, StoreOut,
    CategoryCreate, CategoryOut,
    ProductCreate, ProductUpdate, ProductOut, ProductDetailOut,
    StockLevelOut, StockMovementCreate, StockMovementOut,
    StockReservationCreate, StockReservationAction, StockReservationOut,
    SupplierCreate, SupplierUpdate, SupplierOut,
    PurchaseOrderCreate, PurchaseOrderUpdate, PurchaseOrderOut, PurchaseOrderDetailOut,
    ListingCreate, ListingUpdate, ListingOut,
    MarketplaceProductOut,
    SalesTransactionCreate, SalesTransactionUpdate, SalesTransactionOut,
    AIInsightsOut, LedgerEntry, ReconciliationResult
)

# Internal Service Imports
from app.services.product_service import ProductService
from app.services.stock_service import StockService
from app.services.order_service import OrderService
from app.services.sales_service import SalesService
from app.services.marketplace_service import MarketplaceService
from app.services.analytics_service import AnalyticsService
from app.services.voice_vision_service import VoiceVisionService
from app.services.ai_prediction_service import AIPredictionService

logger = logging.getLogger(__name__)


class InventoryServiceV2:
    """
    Lean Orchestrator for Inventory Domain.
    Delegates real business logic to dedicated sub-services to adhere to SOLID.
    """

    def __init__(self, db: Session, owner_id: str):
        self.db = db
        self.owner_id = owner_id
        
        # Initialize sub-services
        self.products = ProductService(db, owner_id)
        self.stock = StockService(db, owner_id)
        self.orders = OrderService(db, owner_id)
        self.sales = SalesService(db, owner_id)
        self.marketplace = MarketplaceService(db, owner_id)
        self.analytics = AnalyticsService(db, owner_id)
        self.ai = AIPredictionService(db, owner_id)
        self.voice_vision = VoiceVisionService(db, owner_id)

    # ── Store & Category Operations (Delegated to ProductService) ───────────
    
    def create_store(self, payload: StoreCreate) -> StoreOut:
        return self.products.create_store(payload)
    
    def get_all_stores(self) -> List[StoreOut]:
        return self.products.get_all_stores()
    
    def get_store_by_id(self, store_id: str) -> StoreOut:
        return self.products.get_store_by_id(store_id)
    
    def update_store(self, store_id: str, payload: StoreCreate) -> StoreOut:
        return self.products.update_store(store_id, payload)
    
    def create_category(self, payload: CategoryCreate) -> CategoryOut:
        return self.products.create_category(payload)
    
    def get_all_categories(self) -> List[CategoryOut]:
        return self.products.get_all_categories()

    # ── Product Operations (Delegated to ProductService) ────────────────────
    
    def create_product(self, payload: ProductCreate) -> ProductOut:
        return self.products.create_product(payload)
    
    def list_products(self, **kwargs) -> tuple[List[ProductOut], int]:
        return self.products.list_products(**kwargs)
    
    def get_product_by_barcode(self, barcode: str, store_id: Optional[str] = None) -> ProductOut:
        return self.products.get_product_by_barcode(barcode, store_id)
    
    def get_product_detail(self, product_id: str, store_id: Optional[str] = None) -> ProductDetailOut:
        return self.products.get_product_detail(product_id, store_id)
    
    def update_product(self, product_id: str, payload: ProductUpdate) -> ProductOut:
        return self.products.update_product(product_id, payload)
    
    def delete_product(self, product_id: str):
        return self.products.delete_product(product_id)

    # ── Stock Management (Delegated to StockService) ───────────────────────
    
    def get_stock_levels(self, store_id: str, status: Optional[str] = None) -> List[StockLevelOut]:
        return self.stock.get_stock_levels(store_id, status)
    
    def record_stock_movement(self, payload: StockMovementCreate, should_commit: bool = True) -> StockMovementOut:
        return self.stock.record_stock_movement(payload, should_commit)
    
    def reserve_stock(self, payload: StockReservationCreate, should_commit: bool = True) -> StockReservationOut:
        return self.stock.reserve_stock(payload, should_commit)
    
    def list_stock_reservations(self, **kwargs) -> List[StockReservationOut]:
        return self.stock.list_stock_reservations(**kwargs)
    
    def release_stock_reservation(self, reservation_id: str, payload: StockReservationAction) -> StockReservationOut:
        return self.stock.release_stock_reservation(reservation_id, payload)
    
    def commit_stock_reservation(self, reservation_id: str, payload: StockReservationAction) -> StockReservationOut:
        return self.stock.commit_stock_reservation(reservation_id, payload)

    def cleanup_expired_reservations(self) -> int:
        return self.stock.cleanup_expired_reservations()
        
    def transfer_stock(self, from_store_id: str, to_store_id: str, product_id: str, quantity: int) -> StockMovementOut:
        return self.stock.transfer_stock(from_store_id, to_store_id, product_id, quantity)

    def get_stock_movements(self, **kwargs) -> List[StockMovementOut]:
        return self.stock.get_stock_movements(**kwargs)
    
    def get_ledger(self, skip: int = 0, limit: int = 100) -> List[LedgerEntry]:
        return self.stock.get_ledger(skip, limit)

    def get_low_stock_items(self, store_id: Optional[str] = None) -> List[ProductDetailOut]:
        return self.stock.get_low_stock_items(store_id)

    def reconcile_inventory(self, store_id: str, product_id: Optional[str] = None) -> List[ReconciliationResult]:
        return self.stock.reconcile_inventory(store_id, product_id)

    # ── Purchase & Supplier (Delegated to OrderService) ─────────────────────
    
    def create_supplier(self, payload: SupplierCreate) -> SupplierOut:
        return self.orders.create_supplier(payload)
    
    def get_all_suppliers(self, **kwargs) -> List[SupplierOut]:
        return self.orders.get_all_suppliers(**kwargs)
    
    def create_purchase_order(self, payload: PurchaseOrderCreate) -> PurchaseOrderDetailOut:
        return self.orders.create_purchase_order(payload)
    
    def get_purchase_orders(self, **kwargs) -> List[PurchaseOrderOut]:
        return self.orders.get_purchase_orders(**kwargs)
    
    def receive_purchase_order(self, po_id: str, items: List[dict] = None) -> PurchaseOrderOut:
        return self.orders.receive_purchase_order(po_id, items)

    # ── Sales Transactions (Delegated to SalesService) ──────────────────────
    
    def create_sales_transaction(self, payload: SalesTransactionCreate) -> SalesTransactionOut:
        return self.sales.create_sales_transaction(payload)
    
    def get_sales_transaction_by_id(self, tx_id: str) -> SalesTransactionOut:
        return self.sales.get_sales_transaction_by_id(tx_id)
    
    def update_sales_transaction(self, tx_id: str, payload: SalesTransactionUpdate) -> SalesTransactionOut:
        return self.sales.update_sales_transaction(tx_id, payload)

    # ── Marketplace Operations (Delegated to MarketplaceService) ────────────
    
    def create_marketplace_listing(self, payload: ListingCreate) -> ListingOut:
        return self.marketplace.create_listing(payload)
    
    def get_marketplace_products(self, **kwargs) -> List[MarketplaceProductOut]:
        return self.marketplace.get_marketplace_products(**kwargs)

    # ── Analytics & AI (Delegated to AnalyticsService & AIPredictionService) ─
    
    def get_dashboard_summary(self) -> Dict[str, Any]:
        return self.analytics.get_dashboard_summary()
    
    def get_product_health_scores(self, limit: int = 50) -> List[ProductHealthOut]:
        return self.analytics.get_product_health_scores(limit)

    def detect_dead_stock(self, days: int = 30) -> List[ProductDetailOut]:
        return self.analytics.detect_dead_stock(days)

    def calculate_turnover_ratio(self, product_id: Optional[str], store_id: Optional[str], days: int) -> float:
        return self.analytics.calculate_turnover_ratio(product_id, store_id, days)

    def get_ai_insights(self, store_id: Optional[str] = None) -> AIInsightsOut:
        return self.ai.get_insights()

    # ── Voice & Vision (Delegated to VoiceVisionService) ────────────────────
    
    def process_voice_input(self, audio_base64: str, store_id: str, language: str = "en") -> Dict[str, Any]:
        return self.voice_vision.process_voice_input(audio_base64, store_id, language)
    
    def process_vision_scan(self, image_base64: str, store_id: str) -> Dict[str, Any]:
        return self.voice_vision.process_vision_scan(image_base64, store_id)
