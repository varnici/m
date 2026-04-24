"""
Inventory Management Router - Production-Grade FastAPI Endpoints
Handles products, stock levels, purchase orders, suppliers, and analytics.
"""

from typing import List, Optional, Dict, Any
from datetime import date, datetime
from decimal import Decimal
import logging

from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks, Body
from pydantic import BaseModel, Field, validator
from sqlalchemy.orm import Session

from app.infrastructure.database import get_db
from app.infrastructure.auth import get_current_user_id
from app.services.inventory_service_v2 import InventoryServiceV2
from app.services.inventory_outbox_service import InventoryOutboxService
from app.services.analytics_service import AnalyticsService
from app.schemas.inventory_schemas import (
    # Product schemas
    CategoryCreate,
    CategoryOut,
    ProductCreate,
    ProductUpdate,
    ProductOut,
    ProductDetailOut,
    # Stock schemas
    StockLevelOut,
    StockMovementCreate,
    StockMovementOut,
    StockReservationCreate,
    StockReservationAction,
    StockReservationOut,
    OutboxMessageOut,
    OutboxProcessResult,
    OutboxReplayResult,
    # Supplier schemas
    SupplierCreate,
    SupplierUpdate,
    SupplierOut,
    # Purchase Order schemas
    PurchaseOrderCreate,
    PurchaseOrderUpdate,
    PurchaseOrderOut,
    PurchaseOrderDetailOut,
    PurchaseOrderItemCreate,
    # Store schemas
    StoreCreate,
    StoreOut,
    # Analytics schemas
    InventoryDashboardSummary,
    InventoryMetricsOut,
    ProductHealthOut,
    AIInsightsOut,
    LedgerEntry,
    SalesTransactionCreate,
    SalesTransactionUpdate,
    SalesTransactionOut,
)

class StockTransform(BaseModel):
    parent_product_id: str
    quantity_to_break: int
    store_id: str


class StockTransferRequest(BaseModel):
    from_store_id: str
    to_store_id: str
    product_id: str
    quantity: int = Field(..., gt=0)


class VoiceParseRequest(BaseModel):
    audio_base64: str
    store_id: str


class VisionScanRequest(BaseModel):
    image_base64: str
    store_id: str


router = APIRouter(tags=["inventory"])
logger = logging.getLogger(__name__)


# ============================================================================
# STORES/LOCATIONS ENDPOINTS
# ============================================================================

@router.post("/stores", response_model=StoreOut, status_code=201)
async def create_store(
    payload: StoreCreate,
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_current_user_id),
):
    """Create a new store/warehouse location."""
    service = InventoryServiceV2(db, owner_id)
    return await service.create_store(payload)


@router.get("/stores", response_model=List[StoreOut])
async def list_stores(
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_current_user_id),
):
    """List all stores for the current user."""
    service = InventoryServiceV2(db, owner_id)
    return service.get_all_stores()


@router.get("/stores/{store_id}", response_model=StoreOut)
async def get_store(
    store_id: str,
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_current_user_id),
):
    """Get details of a specific store."""
    service = InventoryServiceV2(db, owner_id)
    return service.get_store_by_id(store_id)


@router.put("/stores/{store_id}", response_model=StoreOut)
async def update_store(
    store_id: str,
    payload: StoreCreate,
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_current_user_id),
):
    """Update store details."""
    service = InventoryServiceV2(db, owner_id)
    return await service.update_store(store_id, payload)


# ============================================================================
# CATEGORY ENDPOINTS
# ============================================================================

@router.post("/categories", response_model=CategoryOut, status_code=201)
async def create_category(
    payload: CategoryCreate,
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_current_user_id),
):
    """Create a product category."""
    service = InventoryServiceV2(db, owner_id)
    return await service.create_category(payload)


@router.get("/categories", response_model=List[CategoryOut])
async def list_categories(
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_current_user_id),
):
    """List all product categories."""
    service = InventoryServiceV2(db, owner_id)
    return service.get_all_categories()


# ============================================================================
# PRODUCT ENDPOINTS
# ============================================================================

@router.get("/ledger", response_model=List[LedgerEntry])
async def get_inventory_ledger_sheet(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Get the inventory sales ledger sheet."""
    service = InventoryServiceV2(db, current_user_id)
    return service.get_ledger(skip, limit)


@router.post("/sales/process", response_model=SalesTransactionOut)
async def create_sale(
    payload: SalesTransactionCreate,
    db: Session = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Record a sale and deplete stock."""
    service = InventoryServiceV2(db, current_user_id)
    try:
        return await service.create_sales_transaction(payload)
    except HTTPException:
        raise
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception:
        logger.exception("Sale processing failed for owner_id=%s", current_user_id)
        raise HTTPException(status_code=500, detail="Internal server error while processing sale.")


@router.get("/sales/{tx_id}", response_model=SalesTransactionOut)
async def get_sale(
    tx_id: str,
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_current_user_id),
):
    """Get sale details."""
    service = InventoryServiceV2(db, owner_id)
    return service.get_sales_transaction_by_id(tx_id)


@router.put("/sales/{tx_id}", response_model=SalesTransactionOut)
async def update_sale(
    tx_id: str,
    payload: SalesTransactionUpdate,
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_current_user_id),
):
    """Update a sale transaction and adjust stock levels."""
    service = InventoryServiceV2(db, owner_id)
    return await service.update_sales_transaction(tx_id, payload)


@router.post("/products", response_model=ProductOut, status_code=201)
async def create_product(
    payload: ProductCreate,
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_current_user_id),
):
    """Create a new product in the catalog."""
    try:
        service = InventoryServiceV2(db, owner_id)
        return await service.create_product(payload)
    except HTTPException:
        raise
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception:
        logger.exception("Product creation failed for owner_id=%s", owner_id)
        raise HTTPException(status_code=500, detail="Internal server error while creating product.")


@router.get("/products", response_model=List[ProductOut])
async def list_products(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    category_id: Optional[str] = None,
    search: Optional[str] = None,
    store_id: Optional[str] = None,
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_current_user_id),
):
    """List products with pagination and filtering."""
    service = InventoryServiceV2(db, owner_id)
    return service.list_products(skip, limit, category_id, search, store_id)


@router.get("/products/search/by-barcode", response_model=ProductOut)
async def search_by_barcode(
    barcode: str = Query(..., min_length=1),
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_current_user_id),
):
    """Search product by barcode or QR code."""
    service = InventoryServiceV2(db, owner_id)
    return service.get_product_by_barcode(barcode)


@router.get("/products/{product_id}", response_model=ProductDetailOut)
async def get_product(
    product_id: str,
    store_id: Optional[str] = None,
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_current_user_id),
):
    """Get detailed product information including stock and prices."""
    service = InventoryServiceV2(db, owner_id)
    return service.get_product_detail(product_id, store_id)


@router.put("/products/{product_id}", response_model=ProductOut)
async def update_product(
    product_id: str,
    payload: ProductUpdate,
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_current_user_id),
):
    """Update product information."""
    service = InventoryServiceV2(db, owner_id)
    return await service.update_product(product_id, payload)


@router.delete("/products/{product_id}", status_code=204)
async def delete_product(
    product_id: str,
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_current_user_id),
):
    """Soft-delete a product (mark as inactive)."""
    service = InventoryServiceV2(db, owner_id)
    await service.delete_product(product_id)


# ============================================================================
# STOCK MANAGEMENT ENDPOINTS
# ============================================================================

@router.post("/stock/adjust", response_model=StockMovementOut, status_code=201)
async def adjust_stock(
    payload: StockMovementCreate,
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_current_user_id),
):
    """Record a stock adjustment (manual, voice, scan, or API)."""
    service = InventoryServiceV2(db, owner_id)
    return await service.record_stock_movement(payload)


@router.post("/stock/transfer", response_model=StockMovementOut, status_code=201)
async def transfer_stock(
    payload: Optional[StockTransferRequest] = Body(None),
    from_store_id: Optional[str] = Query(None),
    to_store_id: Optional[str] = Query(None),
    product_id: Optional[str] = Query(None),
    quantity: Optional[int] = Query(None, gt=0),
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_current_user_id),
):
    """Transfer stock between stores/warehouses."""
    resolved_from_store_id = payload.from_store_id if payload else from_store_id
    resolved_to_store_id = payload.to_store_id if payload else to_store_id
    resolved_product_id = payload.product_id if payload else product_id
    resolved_quantity = payload.quantity if payload else quantity
    if not all([resolved_from_store_id, resolved_to_store_id, resolved_product_id, resolved_quantity]):
        raise HTTPException(
            status_code=422,
            detail="from_store_id, to_store_id, product_id, and quantity are required.",
        )

    service = InventoryServiceV2(db, owner_id)
    return await service.transfer_stock(
        resolved_from_store_id,
        resolved_to_store_id,
        resolved_product_id,
        resolved_quantity,
    )




@router.get("/stock/movements", response_model=List[StockMovementOut])
async def list_stock_movements(
    store_id: Optional[str] = None,
    product_id: Optional[str] = None,
    movement_type: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_current_user_id),
):
    """Get stock movement history with filtering."""
    service = InventoryServiceV2(db, owner_id)
    return service.get_stock_movements(
        store_id, product_id, movement_type, start_date, end_date, skip, limit
    )


@router.post("/stock/reservations", response_model=StockReservationOut, status_code=201)
async def reserve_stock(
    payload: StockReservationCreate,
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_current_user_id),
):
    """Reserve available stock for downstream checkout/fulfillment."""
    service = InventoryServiceV2(db, owner_id)
    return await service.reserve_stock(payload)


@router.get("/stock/reservations", response_model=List[StockReservationOut])
async def list_stock_reservations(
    store_id: Optional[str] = None,
    product_id: Optional[str] = None,
    status: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_current_user_id),
):
    """List stock reservations for current tenant."""
    service = InventoryServiceV2(db, owner_id)
    return service.list_stock_reservations(store_id, product_id, status, skip, limit)


@router.get("/stock/reservations/{reservation_id}", response_model=StockReservationOut)
async def get_stock_reservation(
    reservation_id: str,
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_current_user_id),
):
    """Get a single stock reservation."""
    service = InventoryServiceV2(db, owner_id)
    return service.get_stock_reservation(reservation_id)


@router.post("/stock/reservations/{reservation_id}/release", response_model=StockReservationOut)
async def release_stock_reservation(
    reservation_id: str,
    payload: StockReservationAction = Body(default_factory=StockReservationAction),
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_current_user_id),
):
    """Release an active reservation fully or partially."""
    service = InventoryServiceV2(db, owner_id)
    return await service.release_stock_reservation(reservation_id, payload)


@router.post("/stock/reservations/{reservation_id}/commit", response_model=StockReservationOut)
async def commit_stock_reservation(
    reservation_id: str,
    payload: StockReservationAction = Body(default_factory=StockReservationAction),
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_current_user_id),
):
    """Commit an active reservation into stock depletion."""
    service = InventoryServiceV2(db, owner_id)
    return await service.commit_stock_reservation(reservation_id, payload)


@router.get("/stock/{store_id}", response_model=List[StockLevelOut])
async def get_stock_levels(
    store_id: str,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_current_user_id),
):
    """Get current stock levels for a store."""
    service = InventoryServiceV2(db, owner_id)
    return service.get_stock_levels(store_id, status)


@router.get("/events/outbox", response_model=List[OutboxMessageOut])
async def list_outbox_messages(
    status: Optional[str] = Query(None),
    topic: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_current_user_id),
):
    """List domain outbox messages for this tenant."""
    service = InventoryOutboxService(db, owner_id=owner_id)
    return service.list_messages(status=status, topic=topic, limit=limit)


@router.post("/events/outbox/process", response_model=OutboxProcessResult)
async def process_outbox_messages(
    batch_size: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_current_user_id),
):
    """Process pending outbox messages and mark publish/dead-letter status."""
    service = InventoryOutboxService(db, owner_id=owner_id)
    stats = service.process_pending_messages(batch_size=batch_size)
    return OutboxProcessResult(
        attempted=stats.attempted,
        published=stats.published,
        dead_lettered=stats.dead_lettered,
    )


@router.post("/events/outbox/replay", response_model=OutboxReplayResult)
async def replay_outbox_dead_letters(
    message_id: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_current_user_id),
):
    """Requeue dead-letter outbox messages back to pending status."""
    service = InventoryOutboxService(db, owner_id=owner_id)
    requeued = service.replay_dead_letters(message_id=message_id, limit=limit)
    return OutboxReplayResult(requeued=requeued)


# ============================================================================
# SUPPLIER ENDPOINTS
# ============================================================================

@router.post("/suppliers", response_model=SupplierOut, status_code=201)
async def create_supplier(
    payload: SupplierCreate,
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_current_user_id),
):
    """Create a new supplier."""
    service = InventoryServiceV2(db, owner_id)
    return await service.create_supplier(payload)


@router.get("/suppliers", response_model=List[SupplierOut])
async def list_suppliers(
    status: Optional[str] = "active",
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_current_user_id),
):
    """List suppliers with filtering."""
    service = InventoryServiceV2(db, owner_id)
    return service.get_all_suppliers(status, skip, limit)


@router.get("/suppliers/{supplier_id}", response_model=SupplierOut)
async def get_supplier(
    supplier_id: str,
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_current_user_id),
):
    """Get supplier details."""
    service = InventoryServiceV2(db, owner_id)
    return service.get_supplier_by_id(supplier_id)


@router.put("/suppliers/{supplier_id}", response_model=SupplierOut)
async def update_supplier(
    supplier_id: str,
    payload: SupplierUpdate,
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_current_user_id),
):
    """Update supplier information."""
    service = InventoryServiceV2(db, owner_id)
    return await service.update_supplier(supplier_id, payload)


# ============================================================================
# PURCHASE ORDER ENDPOINTS
# ============================================================================

@router.post("/purchase-orders", response_model=PurchaseOrderDetailOut, status_code=201)
async def create_purchase_order(
    payload: PurchaseOrderCreate,
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_current_user_id),
):
    """Create a new purchase order."""
    try:
        service = InventoryServiceV2(db, owner_id)
        return await service.create_purchase_order(payload)
    except HTTPException:
        raise
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception:
        logger.exception("Purchase order creation failed for owner_id=%s", owner_id)
        raise HTTPException(status_code=500, detail="Internal server error while creating purchase order.")


@router.get("/purchase-orders", response_model=List[PurchaseOrderOut])
async def list_purchase_orders(
    status: Optional[str] = None,
    supplier_id: Optional[str] = None,
    store_id: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_current_user_id),
):
    """List purchase orders with filtering."""
    service = InventoryServiceV2(db, owner_id)
    return service.get_purchase_orders(
        status, supplier_id, store_id, start_date, end_date, skip, limit
    )


@router.get("/purchase-orders/{po_id}", response_model=PurchaseOrderDetailOut)
async def get_purchase_order(
    po_id: str,
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_current_user_id),
):
    """Get purchase order details."""
    service = InventoryServiceV2(db, owner_id)
    return service.get_purchase_order_by_id(po_id)


@router.put("/purchase-orders/{po_id}", response_model=PurchaseOrderDetailOut)
async def update_purchase_order(
    po_id: str,
    payload: PurchaseOrderUpdate,
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_current_user_id),
):
    """Update purchase order."""
    service = InventoryServiceV2(db, owner_id)
    return await service.update_purchase_order(po_id, payload)


@router.post("/purchase-orders/{po_id}/confirm", response_model=PurchaseOrderOut)
async def confirm_purchase_order(
    po_id: str,
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_current_user_id),
):
    """Confirm (send) a purchase order."""
    service = InventoryServiceV2(db, owner_id)
    return await service.confirm_purchase_order(po_id)


@router.post("/purchase-orders/{po_id}/receive", response_model=PurchaseOrderOut)
async def receive_purchase_order(
    po_id: str,
    items: List[dict] = None,  # {product_id, quantity_received}
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_current_user_id),
):
    """Mark purchase order as received and update stock."""
    service = InventoryServiceV2(db, owner_id)
    return await service.receive_purchase_order(po_id, items, background_tasks)


# ============================================================================
# ANALYTICS & INSIGHTS ENDPOINTS
# ============================================================================

@router.get("/analytics/dashboard", response_model=InventoryDashboardSummary)
async def get_inventory_dashboard(
    store_id: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_current_user_id),
):
    """Get comprehensive inventory metrics and KPIs."""
    analytics_service = AnalyticsService(db, owner_id)
    return analytics_service.get_dashboard_summary()


@router.get("/analytics/product-health", response_model=List[ProductHealthOut])
async def get_product_health_scores(
    limit: int = Query(50, ge=1, le=500),
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_current_user_id),
):
    """Get health scores for all products (stock status, margin, turnover)."""
    service = InventoryServiceV2(db, owner_id)
    return service.get_product_health_scores(limit)


@router.get("/analytics/low-stock", response_model=List[ProductDetailOut])
async def get_low_stock_alerts(
    store_id: Optional[str] = None,
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_current_user_id),
):
    """Get products below minimum stock level."""
    service = InventoryServiceV2(db, owner_id)
    return service.get_low_stock_items(store_id)


@router.get("/analytics/dead-stock", response_model=List[ProductDetailOut])
async def get_dead_stock_detection(
    days_no_sales: int = Query(30, ge=7, le=120),
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_current_user_id),
):
    """Get products with no sales in specified days."""
    service = InventoryServiceV2(db, owner_id)
    return service.detect_dead_stock(days_no_sales)


@router.get("/analytics/ai-insights", response_model=AIInsightsOut)
async def get_ai_insights(
    store_id: Optional[str] = None,
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_current_user_id),
):
    """Get AI-powered inventory insights and recommendations."""
    service = InventoryServiceV2(db, owner_id)
    return service.get_ai_insights(store_id)


@router.get("/analytics/turnover-ratio")
async def calculate_inventory_turnover(
    product_id: Optional[str] = None,
    store_id: Optional[str] = None,
    days: int = Query(30, ge=7, le=365),
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_current_user_id),
):
    """Calculate inventory turnover ratio."""
    service = InventoryServiceV2(db, owner_id)
    return service.calculate_turnover_ratio(product_id, store_id, days)


# ============================================================================
# VOICE & SCAN ENDPOINTS
# ============================================================================

@router.post("/voice/parse", status_code=201)
async def process_voice_input(
    payload: Optional[VoiceParseRequest] = Body(None),
    audio_base64: Optional[str] = Query(None),
    store_id: Optional[str] = Query(None),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_current_user_id),
):
    """Parse voice input and update inventory."""
    resolved_audio_base64 = payload.audio_base64 if payload else audio_base64
    resolved_store_id = payload.store_id if payload else store_id
    if not resolved_audio_base64 or not resolved_store_id:
        raise HTTPException(status_code=422, detail="audio_base64 and store_id are required.")

    service = InventoryServiceV2(db, owner_id)
    return await service.process_voice_input(resolved_audio_base64, resolved_store_id, background_tasks)


@router.get("/scan/barcode", response_model=ProductOut)
@router.post("/scan/barcode", response_model=ProductOut)
async def scan_barcode(
    barcode_data: str = Query(...),
    store_id: str = Query(...),
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_current_user_id),
):
    """Scan barcode and return product info with current stock."""
    service = InventoryServiceV2(db, owner_id)
    return service.get_product_by_barcode(barcode_data, store_id)


@router.post("/scan/computer-vision", status_code=201)
async def scan_shelf_vision(
    payload: Optional[VisionScanRequest] = Body(None),
    image_base64: Optional[str] = Query(None),
    store_id: Optional[str] = Query(None),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_current_user_id),
):
    """Upload shelf image for computer vision analysis."""
    resolved_image_base64 = payload.image_base64 if payload else image_base64
    resolved_store_id = payload.store_id if payload else store_id
    if not resolved_image_base64 or not resolved_store_id:
        raise HTTPException(status_code=422, detail="image_base64 and store_id are required.")

    service = InventoryServiceV2(db, owner_id)
    return await service.process_vision_scan(resolved_image_base64, resolved_store_id, background_tasks)


@router.get("/analytics/ledger", response_model=List[LedgerEntry])
async def get_inventory_analytics_ledger(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_current_user_id),
):
    """Get detailed sales ledger for inventory."""
    service = InventoryServiceV2(db, owner_id)
    return service.get_ledger(skip, limit)


@router.get("/analytics/reconcile", response_model=List[Dict[str, Any]])
async def reconcile_inventory_ledger(
    store_id: str = Query(...),
    product_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_current_user_id),
):
    """Reconcile stock levels against the immutable domain ledger."""
    service = InventoryServiceV2(db, owner_id)
    return service.reconcile_inventory(store_id, product_id)


@router.post("/analytics/transform")
async def transform_inventory_stock(
    payload: StockTransform,
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_current_user_id),
):
    """Break bulk packaging into unit pieces."""
    service = InventoryServiceV2(db, owner_id)
    await service.transform_stock(
        payload.parent_product_id,
        payload.quantity_to_break,
        payload.store_id
    )
    return {"status": "success", "message": "Transformation completed"}
