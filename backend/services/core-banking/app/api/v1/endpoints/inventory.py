"""
Inventory Management Router - Production-Grade FastAPI Endpoints
Handles products, stock levels, purchase orders, suppliers, and analytics.
"""

from typing import List, Optional, Dict, Any
from datetime import date, datetime
from decimal import Decimal
import csv
import io
import logging

from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks, Body, Response, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field, validator
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func

from app.infrastructure.database import get_db
from app.infrastructure.auth import get_current_user_id, get_actor_id
from app.infrastructure.cache import get_cache, set_cache, invalidate_cache_pattern
from app.services.inventory_service_v2 import InventoryServiceV2
from app.services.inventory_outbox_service import InventoryOutboxService
from app.services.analytics_service import AnalyticsService
from app.services.product_service import ProductService
from app.services.stock_service import StockService
from app.services.order_service import OrderService
from app.services.sales_service import SalesService
from app.schemas.inventory_schemas import (
    # Product schemas
    CategoryCreate,
    CategoryOut,
    CategoryUpdate,
    CategoryBulkCreateRequest,
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
    StocktakeReconcileRequest,
    StocktakeReconcileOut,
    OutboxMessageOut,
    OutboxProcessResult,
    OutboxReplayResult,
    # Supplier schemas
    SupplierCreate,
    SupplierUpdate,
    SupplierOut,
    # Marketplace schemas
    ListingCreate,
    ListingUpdate,
    ListingOut,
    MarketplaceProductOut,
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
    DailyReportOut,
    InventoryDashboardSummary,
    InventoryOptimizationSummary,
    InventoryMetricsOut,
    ProductHealthOut,
    AIInsightsOut,
    LedgerEntry,
    SalesTransactionCreate,
    SalesTransactionUpdate,
    SalesTransactionOut,
    SalesTransactionItemCreate,
    ReconciliationResult,
    ProductSellerInfo,
    ActivityLogOut,
    StaffSummaryOut,
    SalesIntegrityReportOut,
    # Trade (B2B) schemas
    TradeClientCreate,
    TradeClientOut,
    TradeOrderCreate,
    TradeOrderOut,
)
from app.models import Product, StockLevel, Store, InventorySnapshot, PurchaseOrder, InventoryReservationModel, ActivityLog
from app.models.user import User
from app.services.activity_log_service import ActivityLogService, SalesIntegrityService
from app.services.trade_service import TradeClientService, TradeOrderService

router = APIRouter(tags=["inventory"])
logger = logging.getLogger(__name__)

# ============================================================================
# REQUEST SCHEMAS
# ============================================================================

class StockTransferRequest(BaseModel):
    from_store_id: str
    to_store_id: str
    product_id: str
    quantity: int = Field(..., gt=0)

class VoiceParseRequest(BaseModel):
    audio_base64: str
    store_id: str
    language: str = "en"

class VisionScanRequest(BaseModel):
    image_base64: str
    store_id: str

# ============================================================================
# STORES/LOCATIONS ENDPOINTS
# ============================================================================

@router.post("/stores", response_model=StoreOut, status_code=201)
def create_store(
    payload: StoreCreate,
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_current_user_id),
):
    """Create a new store/warehouse location."""
    service = ProductService(db, owner_id)
    result = service.create_store(payload)
    invalidate_cache_pattern(f"inventory:cache:{owner_id}:*")
    return result

@router.get("/stores", response_model=List[StoreOut])
def list_stores(
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_current_user_id),
):
    """List all stores for the current user."""
    cache_key = f"inventory:cache:{owner_id}:stores:list"
    cached = get_cache(cache_key)
    if cached is not None:
        return [StoreOut.model_validate(s) for s in cached]

    service = ProductService(db, owner_id)
    stores = service.get_all_stores()
    set_cache(cache_key, [s.model_dump() for s in stores], ttl=600)
    return stores

@router.get("/stores/{store_id}", response_model=StoreOut)
def get_store(
    store_id: str,
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_current_user_id),
):
    """Get details of a specific store."""
    cache_key = f"inventory:cache:{owner_id}:store:detail:{store_id}"
    cached = get_cache(cache_key)
    if cached is not None:
        return StoreOut.model_validate(cached)

    service = ProductService(db, owner_id)
    store = service.get_store_by_id(store_id)
    set_cache(cache_key, store.model_dump(), ttl=600)
    return store

@router.put("/stores/{store_id}", response_model=StoreOut)
def update_store(
    store_id: str,
    payload: StoreCreate,
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_current_user_id),
):
    """Update store details."""
    service = ProductService(db, owner_id)
    result = service.update_store(store_id, payload)
    invalidate_cache_pattern(f"inventory:cache:{owner_id}:*")
    return result

# ============================================================================
# CATEGORY ENDPOINTS
# ============================================================================

@router.post("/categories", response_model=CategoryOut, status_code=201)
def create_category(
    payload: CategoryCreate,
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_current_user_id),
):
    """Create a product category."""
    service = ProductService(db, owner_id)
    result = service.create_category(payload)
    invalidate_cache_pattern(f"inventory:cache:{owner_id}:*")
    return result

@router.get("/categories", response_model=List[CategoryOut])
def list_categories(
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_current_user_id),
):
    """List all product categories."""
    cache_key = f"inventory:cache:{owner_id}:categories:list"
    cached = get_cache(cache_key)
    if cached is not None:
        return [CategoryOut.model_validate(c) for c in cached]

    service = ProductService(db, owner_id)
    categories = service.get_all_categories()
    set_cache(cache_key, [c.model_dump() for c in categories], ttl=600)
    return categories

@router.post("/categories/bulk", response_model=List[CategoryOut], status_code=201)
def bulk_create_categories(
    payload: CategoryBulkCreateRequest,
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_current_user_id),
):
    """Batch-create categories — used to seed starter categories for a business type."""
    service = ProductService(db, owner_id)
    result = service.bulk_create_categories(payload)
    invalidate_cache_pattern(f"inventory:cache:{owner_id}:*")
    return result

@router.patch("/categories/{category_id}", response_model=CategoryOut)
def update_category(
    category_id: str,
    payload: CategoryUpdate,
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_current_user_id),
):
    """Update a category's name, icon, tint, or parent."""
    service = ProductService(db, owner_id)
    try:
        result = service.update_category(category_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    invalidate_cache_pattern(f"inventory:cache:{owner_id}:*")
    return result

@router.delete("/categories/{category_id}", status_code=204)
def delete_category(
    category_id: str,
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_current_user_id),
):
    """Delete a category. Products in it become uncategorized, not deleted."""
    service = ProductService(db, owner_id)
    try:
        service.delete_category(category_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    invalidate_cache_pattern(f"inventory:cache:{owner_id}:*")
    return Response(status_code=204)

# ============================================================================
# PRODUCT ENDPOINTS
# ============================================================================

@router.post("/products", response_model=ProductOut, status_code=201)
def create_product(
    payload: ProductCreate,
    request: Request,
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_current_user_id),
    actor_id: str = Depends(get_actor_id),
):
    """Create a new product in the catalog."""
    try:
        service = ProductService(db, owner_id)
        result = service.create_product(payload)

        activity = ActivityLogService(db, owner_id)
        activity.log(
            actor_id=actor_id,
            action="create",
            entity_type="product",
            entity_id=result.id,
            entity_name=result.name,
            details={
                "cost_price": payload.cost_price_kobo,
                "selling_price": payload.selling_price_kobo,
                "quantity": payload.quantity_on_hand,
                "expenses": payload.expenses_kobo,
                "on_credit": payload.quantity_on_credit,
            },
            ip_address=request.client.host if request.client else None,
        )
        db.commit()

        invalidate_cache_pattern(f"inventory:cache:{owner_id}:*")
        return result
    except HTTPException:
        raise
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception:
        logger.exception("Product creation failed for owner_id=%s", owner_id)
        raise HTTPException(status_code=500, detail="Internal server error while creating product.")

@router.get("/products", response_model=List[ProductOut])
def list_products(
    response: Response,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    category_id: Optional[str] = None,
    search: Optional[str] = None,
    store_id: Optional[str] = None,
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_current_user_id),
):
    """List products with pagination and filtering."""
    cache_key = f"inventory:cache:{owner_id}:products:list:{skip}:{limit}:{category_id or ''}:{search or ''}:{store_id or ''}"
    cached = get_cache(cache_key)
    if cached is not None:
        response.headers["X-Total-Count"] = str(cached.get("total", 0))
        return [ProductOut.model_validate(p) for p in cached.get("products", [])]

    service = ProductService(db, owner_id)
    products, total_count = service.list_products(skip, limit, category_id, search, store_id)
    products_serialized = [p.model_dump() for p in products]
    set_cache(cache_key, {"products": products_serialized, "total": total_count}, ttl=300)
    response.headers["X-Total-Count"] = str(total_count)
    return products

@router.get("/products/search/by-barcode", response_model=ProductOut)
def search_by_barcode(
    barcode: str = Query(..., min_length=1),
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_current_user_id),
):
    """Search product by barcode or QR code."""
    cache_key = f"inventory:cache:{owner_id}:product:barcode:{barcode}"
    cached = get_cache(cache_key)
    if cached is not None:
        return ProductOut.model_validate(cached)

    service = ProductService(db, owner_id)
    product = service.get_product_by_barcode(barcode)
    set_cache(cache_key, product.model_dump(), ttl=300)
    return product

@router.get("/products/export.csv")
def export_products_csv(
    category_id: Optional[str] = None,
    search: Optional[str] = None,
    store_id: Optional[str] = None,
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_current_user_id),
):
    """Export the product register as CSV — the same rows/filters as GET /products.

    Registered before /products/{product_id} on purpose: Starlette matches path
    routes in registration order, so a static "/products/export.csv" route must
    come before the dynamic "/products/{product_id}" route or it gets shadowed
    (product_id="export.csv") — same reason /products/search/by-barcode sits here.
    """
    service = ProductService(db, owner_id)
    products, _total = service.list_products(0, 10000, category_id, search, store_id)

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow([
        "SKU", "Name", "Category ID", "Unit", "Cost (kobo)", "Selling price (kobo)",
        "On hand", "Reserved", "Reorder level", "Status", "Batch/NAFDAC", "Size", "IMEI",
        "Expiry date", "Updated at",
    ])
    for p in products:
        balance = p.total_quantity_on_hand
        status = "out" if balance <= 0 else "low" if balance <= p.minimum_stock_level else "ok"
        writer.writerow([
            p.sku, p.name, p.category_id or "", p.unit_of_measure,
            p.cost_price_kobo, p.selling_price_kobo, balance, p.total_reserved_quantity,
            p.minimum_stock_level, status, getattr(p, "nafdac_number", "") or "",
            getattr(p, "size", "") or "", getattr(p, "imei", "") or "",
            getattr(p, "expiry_date", "") or "", p.created_at.isoformat(),
        ])
    buffer.seek(0)
    filename = f"inventory-register-{date.today().isoformat()}.csv"
    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )

@router.get("/products/{product_id}", response_model=ProductDetailOut)
def get_product(
    product_id: str,
    store_id: Optional[str] = None,
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_current_user_id),
):
    """Get detailed product information including stock and prices."""
    cache_key = f"inventory:cache:{owner_id}:product:detail:{product_id}:{store_id or ''}"
    cached = get_cache(cache_key)
    if cached is not None:
        return ProductDetailOut.model_validate(cached)

    service = ProductService(db, owner_id)
    detail = service.get_product_detail(product_id, store_id)
    set_cache(cache_key, detail.model_dump(), ttl=300)
    return detail

@router.put("/products/{product_id}", response_model=ProductOut)
def update_product(
    product_id: str,
    payload: ProductUpdate,
    request: Request,
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_current_user_id),
    actor_id: str = Depends(get_actor_id),
):
    """Update product information."""
    service = ProductService(db, owner_id)
    try:
        result = service.update_product(product_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    activity = ActivityLogService(db, owner_id)
    changed_fields = payload.model_dump(exclude_unset=True)
    activity.log(
        actor_id=actor_id,
        action="update",
        entity_type="product",
        entity_id=product_id,
        entity_name=result.name,
        details={"changed_fields": changed_fields},
        ip_address=request.client.host if request.client else None,
    )
    db.commit()

    invalidate_cache_pattern(f"inventory:cache:{owner_id}:*")
    return result

@router.delete("/products/{product_id}", status_code=204)
def delete_product(
    product_id: str,
    request: Request,
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_current_user_id),
    actor_id: str = Depends(get_actor_id),
):
    """Soft-delete a product (mark as inactive)."""
    product = db.query(Product).filter(Product.id == product_id, Product.owner_id == owner_id).first()
    product_name = product.name if product else "Unknown"

    service = ProductService(db, owner_id)
    service.delete_product(product_id)

    activity = ActivityLogService(db, owner_id)
    activity.log(
        actor_id=actor_id,
        action="delete",
        entity_type="product",
        entity_id=product_id,
        entity_name=product_name,
        ip_address=request.client.host if request.client else None,
    )
    db.commit()

    invalidate_cache_pattern(f"inventory:cache:{owner_id}:*")

# ============================================================================
# MARKETPLACE ENDPOINTS
# ============================================================================

@router.get("/marketplace/products", response_model=List[MarketplaceProductOut])
async def list_marketplace_products(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    category_id: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """List all active products globally for the public marketplace."""
    service = InventoryServiceV2(db, user_id)
    products = service.get_marketplace_products(category_id, search, skip, limit)
    
    # Attach seller info (Batching)
    seller_ids = list(set(p.owner_id for p in products))
    sellers = db.query(User).filter(User.id.in_(seller_ids)).all() if seller_ids else []
    seller_map = {s.id: s for s in sellers}
    
    primary_stores = db.query(Store).filter(
        Store.owner_id.in_(seller_ids),
        Store.is_primary == True
    ).all() if seller_ids else []
    store_map = {st.owner_id: st for st in primary_stores}

    for p_out in products:
        # Attach seller info
        seller = seller_map.get(p_out.owner_id)
        store = store_map.get(p_out.owner_id)
        
        if seller:
            p_out.seller_info = ProductSellerInfo(
                business_name=seller.trading_name or seller.business_name or seller.full_name or "Unknown Seller",
                latitude=store.latitude if store else None,
                longitude=store.longitude if store else None,
                address=store.address if store else None,
                city=store.city if store else None
            )
            
    return products

@router.post("/marketplace/listings", response_model=ListingOut, status_code=201)
def create_listing(
    payload: ListingCreate,
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_current_user_id),
):
    """Create a new marketplace listing."""
    service = InventoryServiceV2(db, owner_id)
    return service.create_marketplace_listing(payload)

@router.patch("/marketplace/listings/{listing_id}", response_model=ListingOut)
def update_marketplace_listing(
    listing_id: str,
    payload: ListingUpdate,
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_current_user_id),
):
    """Update a marketplace listing."""
    service = InventoryServiceV2(db, owner_id)
    return service.update_marketplace_listing(listing_id, payload)

@router.post("/marketplace/checkout", response_model=List[SalesTransactionOut])
def marketplace_checkout(
    payload: SalesTransactionCreate,
    db: Session = Depends(get_db),
    buyer_id: str = Depends(get_current_user_id),
):
    """
    Handle marketplace checkout. 
    This groups items by seller (owner_id) and creates separate transactions.
    """
    try:
        # 1. Resolve all products to get their owners
        product_ids = [item.product_id for item in payload.items]
        products = db.query(Product).filter(Product.id.in_(product_ids)).all()
        product_map = {p.id: p for p in products}
        
        # 2. Group items by owner_id
        items_by_owner: Dict[str, List[SalesTransactionItemCreate]] = {}
        for item in payload.items:
            p = product_map.get(item.product_id)
            if not p:
                raise HTTPException(status_code=400, detail=f"Product {item.product_id} not found")
            
            if p.owner_id not in items_by_owner:
                items_by_owner[p.owner_id] = []
            items_by_owner[p.owner_id].append(item)
            
        # 3. Create transactions for each owner
        results = []
        for owner_id, owner_items in items_by_owner.items():
            service = InventoryServiceV2(db, owner_id)
            
            # Create a localized payload for this seller
            owner_payload = SalesTransactionCreate(
                customer_id=buyer_id,
                customer_name=payload.customer_name,
                customer_phone=payload.customer_phone,
                payment_method=payload.payment_method,
                notes=payload.notes,
                status="pending", # Marketplace orders start as pending
                order_type="online",
                shipping_address=payload.shipping_address,
                shipping_city=payload.shipping_city,
                shipping_state=payload.shipping_state,
                shipping_fee_kobo=payload.shipping_fee_kobo,
                items=owner_items
            )
            
            tx = service.create_sales_transaction(owner_payload)
            results.append(tx)
            
        return results

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.exception("Marketplace checkout failed")
        raise HTTPException(status_code=500, detail="Checkout failed")

# ============================================================================
# SALES TRANSACTION ENDPOINTS
# ============================================================================

@router.post("/sales", response_model=SalesTransactionOut, status_code=201)
def create_sale(
    payload: SalesTransactionCreate,
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_current_user_id),
):
    """Record a sale and trigger stock depletion."""
    service = SalesService(db, owner_id)
    try:
        result = service.create_sales_transaction(payload)
        invalidate_cache_pattern(f"inventory:cache:{owner_id}:*")
        return result
    except HTTPException:
        raise
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception:
        logger.exception("Sale processing failed for owner_id=%s", owner_id)
        raise HTTPException(status_code=500, detail="Internal server error while processing sale.")

@router.post("/sales/process", response_model=SalesTransactionOut, status_code=201)
def process_sale(
    payload: SalesTransactionCreate,
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_current_user_id),
):
    """Compatibility endpoint for POS/trade screens that call /sales/process."""
    service = SalesService(db, owner_id)
    try:
        result = service.create_sales_transaction(payload)
        invalidate_cache_pattern(f"inventory:cache:{owner_id}:*")
        return result
    except HTTPException:
        raise
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception:
        logger.exception("Sale processing failed for owner_id=%s", owner_id)
        raise HTTPException(status_code=500, detail="Internal server error while processing sale.")

@router.get("/sales/{tx_id}", response_model=SalesTransactionOut)
def get_sale(
    tx_id: str,
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_current_user_id),
):
    """Get sale details."""
    service = SalesService(db, owner_id)
    return service.get_sales_transaction_by_id(tx_id)

@router.put("/sales/{tx_id}", response_model=SalesTransactionOut)
def update_sale(
    tx_id: str,
    payload: SalesTransactionUpdate,
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_current_user_id),
):
    """Update a sale transaction and adjust stock levels."""
    service = SalesService(db, owner_id)
    result = service.update_sales_transaction(tx_id, payload)
    invalidate_cache_pattern(f"inventory:cache:{owner_id}:*")
    return result

@router.post("/trade-clients", response_model=TradeClientOut, status_code=201)
def create_trade_client(
    payload: TradeClientCreate,
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_current_user_id),
):
    """Create a B2B trade client for the Trade Invoicing Desk."""
    service = TradeClientService(db, owner_id)
    return service.create_client(payload)

@router.get("/trade-clients", response_model=List[TradeClientOut])
def list_trade_clients(
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_current_user_id),
):
    """List this owner's registered B2B trade clients."""
    service = TradeClientService(db, owner_id)
    return service.list_clients()

@router.post("/trade-orders", response_model=TradeOrderOut, status_code=201)
def create_trade_order(
    payload: TradeOrderCreate,
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_current_user_id),
):
    """Create a draft trade order. Rejects any line below the product's Trade_MOQ."""
    service = TradeOrderService(db, owner_id)
    try:
        return service.create_order(payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

@router.get("/trade-orders", response_model=List[TradeOrderOut])
def list_trade_orders(
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_current_user_id),
):
    """List this owner's trade orders (draft, held, dispatched)."""
    service = TradeOrderService(db, owner_id)
    return service.list_orders()

@router.get("/trade-orders/{order_id}", response_model=TradeOrderOut)
def get_trade_order(
    order_id: str,
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_current_user_id),
):
    """Fetch a single trade order."""
    service = TradeOrderService(db, owner_id)
    try:
        return service.get_order_out(order_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

@router.post("/trade-orders/{order_id}/hold", response_model=TradeOrderOut)
def hold_trade_order(
    order_id: str,
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_current_user_id),
):
    """Save Draft / Hold Stock — reserves stock for every line."""
    service = TradeOrderService(db, owner_id)
    try:
        result = service.hold_order(order_id)
        invalidate_cache_pattern(f"inventory:cache:{owner_id}:*")
        return result
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

@router.post("/trade-orders/{order_id}/dispatch", response_model=TradeOrderOut)
def dispatch_trade_order(
    order_id: str,
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_current_user_id),
):
    """Generate Invoice & Approve Dispatch — commits held stock and creates the sale."""
    service = TradeOrderService(db, owner_id)
    try:
        result = service.dispatch_order(order_id)
        invalidate_cache_pattern(f"inventory:cache:{owner_id}:*")
        return result
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

@router.get("/analytics/ledger", response_model=List[LedgerEntry])
def get_inventory_analytics_ledger(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_current_user_id),
):
    """Get detailed sales ledger for inventory."""
    service = StockService(db, owner_id)
    return service.get_ledger(skip, limit)

# ============================================================================
# STOCK MANAGEMENT ENDPOINTS
# ============================================================================

@router.post("/stock/movements", response_model=StockMovementOut, status_code=201)
def record_movement(
    payload: StockMovementCreate,
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_current_user_id),
):
    """Record manual stock movement (adjustment, damage, etc)."""
    service = StockService(db, owner_id)
    result = service.record_stock_movement(payload)
    invalidate_cache_pattern(f"inventory:cache:{owner_id}:*")
    return result

@router.post("/stock/transfer", response_model=StockMovementOut, status_code=201)
def transfer_stock(
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

    service = StockService(db, owner_id)
    result = service.transfer_stock(
        resolved_from_store_id,
        resolved_to_store_id,
        resolved_product_id,
        resolved_quantity,
    )
    invalidate_cache_pattern(f"inventory:cache:{owner_id}:*")
    return result

@router.get("/stock/movements", response_model=List[StockMovementOut])
def list_stock_movements(
    response: Response,
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
    service = StockService(db, owner_id)
    movements, total_count = service.get_stock_movements(
        store_id, product_id, movement_type, start_date, end_date, skip, limit
    )
    response.headers["X-Total-Count"] = str(total_count)
    return movements

@router.post("/stock/reservations", response_model=StockReservationOut, status_code=201)
def create_reservation(
    payload: StockReservationCreate,
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_current_user_id),
):
    """Reserve stock for a future transaction."""
    service = StockService(db, owner_id)
    result = service.reserve_stock(payload)
    invalidate_cache_pattern(f"inventory:cache:{owner_id}:*")
    return result

@router.get("/stock/reservations", response_model=List[StockReservationOut])
def list_stock_reservations(
    store_id: Optional[str] = None,
    product_id: Optional[str] = None,
    status: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_current_user_id),
):
    """List stock reservations for current tenant."""
    service = StockService(db, owner_id)
    return service.list_stock_reservations(store_id, product_id, status, skip, limit)

@router.get("/stock/reservations/{reservation_id}", response_model=StockReservationOut)
def get_stock_reservation(
    reservation_id: str,
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_current_user_id),
):
    """Get a single stock reservation."""
    service = StockService(db, owner_id)
    return service.get_stock_reservation(reservation_id)

@router.post("/stock/reservations/{reservation_id}/release", response_model=StockReservationOut)
def release_stock_reservation(
    reservation_id: str,
    payload: StockReservationAction = Body(default_factory=StockReservationAction),
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_current_user_id),
):
    """Release an active reservation fully or partially."""
    service = StockService(db, owner_id)
    result = service.release_stock_reservation(reservation_id, payload)
    invalidate_cache_pattern(f"inventory:cache:{owner_id}:*")
    return result

@router.post("/stock/reservations/{reservation_id}/commit", response_model=StockReservationOut)
def commit_reservation(
    reservation_id: str,
    payload: StockReservationAction,
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_current_user_id),
):
    """Fulfill/Commit a stock reservation."""
    service = StockService(db, owner_id)
    result = service.commit_stock_reservation(reservation_id, payload)
    invalidate_cache_pattern(f"inventory:cache:{owner_id}:*")
    return result

@router.post("/stock/reconcile-counts", response_model=StocktakeReconcileOut)
def reconcile_physical_counts(
    payload: StocktakeReconcileRequest,
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_current_user_id),
):
    """Apply manager-entered physical counts and update stock balances."""
    service = StockService(db, owner_id)
    try:
        result = service.reconcile_physical_counts(payload.store_id, payload.counts)
        invalidate_cache_pattern(f"inventory:cache:{owner_id}:*")
        return result
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

@router.get("/stock", response_model=List[StockLevelOut])
def get_stock_levels(
    store_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_current_user_id),
):
    """Get stock levels across stores."""
    cache_key = f"inventory:cache:{owner_id}:stock:levels:{store_id or ''}:{status or ''}"
    cached = get_cache(cache_key)
    if cached is not None:
        return [StockLevelOut.model_validate(l) for l in cached]

    service = StockService(db, owner_id)
    levels = service.get_stock_levels(store_id, status)
    set_cache(cache_key, [l.model_dump() for l in levels], ttl=300)
    return levels


# ============================================================================
# DOMAIN EVENT ENDPOINTS
# ============================================================================

@router.get("/events/outbox", response_model=List[OutboxMessageOut])
def list_outbox_messages(
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
def process_outbox_messages(
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
def replay_outbox_dead_letters(
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
def create_supplier(
    payload: SupplierCreate,
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_current_user_id),
):
    """Onboard a new supplier."""
    service = OrderService(db, owner_id)
    return service.create_supplier(payload)

@router.get("/suppliers", response_model=List[SupplierOut])
def list_suppliers(
    response: Response,
    status: Optional[str] = "active",
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_current_user_id),
):
    """List suppliers with filtering."""
    service = OrderService(db, owner_id)
    suppliers, total_count = service.get_all_suppliers(status, skip, limit)
    response.headers["X-Total-Count"] = str(total_count)
    return suppliers

@router.get("/suppliers/{supplier_id}", response_model=SupplierOut)
def get_supplier(
    supplier_id: str,
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_current_user_id),
):
    """Get supplier details."""
    service = OrderService(db, owner_id)
    return service.get_supplier_by_id(supplier_id)

@router.put("/suppliers/{supplier_id}", response_model=SupplierOut)
def update_supplier(
    supplier_id: str,
    payload: SupplierUpdate,
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_current_user_id),
):
    """Update supplier information."""
    service = OrderService(db, owner_id)
    return service.update_supplier(supplier_id, payload)

# ============================================================================
# PURCHASE ORDER ENDPOINTS
# ============================================================================

@router.post("/purchase-orders", response_model=PurchaseOrderDetailOut, status_code=201)
def create_purchase_order(
    payload: PurchaseOrderCreate,
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_current_user_id),
):
    """Draft a new purchase order."""
    service = OrderService(db, owner_id)
    try:
        return service.create_purchase_order(payload)
    except HTTPException:
        raise
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception:
        logger.exception("Purchase order creation failed for owner_id=%s", owner_id)
        raise HTTPException(status_code=500, detail="Internal server error while creating purchase order.")

@router.get("/purchase-orders", response_model=List[PurchaseOrderOut])
def list_purchase_orders(
    response: Response,
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
    service = OrderService(db, owner_id)
    pos, total_count = service.get_purchase_orders(
        status=status,
        supplier_id=supplier_id,
        store_id=store_id,
        start_date=start_date,
        end_date=end_date,
        skip=skip,
        limit=limit
    )
    response.headers["X-Total-Count"] = str(total_count)
    return pos

@router.get("/purchase-orders/{po_id}", response_model=PurchaseOrderDetailOut)
def get_purchase_order(
    po_id: str,
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_current_user_id),
):
    """Get purchase order details."""
    service = OrderService(db, owner_id)
    return service.get_purchase_order_by_id(po_id)

@router.put("/purchase-orders/{po_id}", response_model=PurchaseOrderDetailOut)
def update_purchase_order(
    po_id: str,
    payload: PurchaseOrderUpdate,
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_current_user_id),
):
    """Update purchase order."""
    service = OrderService(db, owner_id)
    return service.update_purchase_order(po_id, payload)

@router.post("/purchase-orders/{po_id}/confirm", response_model=PurchaseOrderOut)
def confirm_purchase_order(
    po_id: str,
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_current_user_id),
):
    """Confirm (send) a purchase order."""
    service = OrderService(db, owner_id)
    return service.confirm_purchase_order(po_id)

@router.post("/purchase-orders/{po_id}/receive", response_model=PurchaseOrderOut)
def receive_purchase_order(
    po_id: str,
    items: Optional[List[dict]] = None,
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_current_user_id),
):
    """Mark purchase order as received and update stock."""
    service = OrderService(db, owner_id)
    result = service.receive_purchase_order(po_id, items)
    invalidate_cache_pattern(f"inventory:cache:{owner_id}:*")
    return result

# ============================================================================
# ANALYTICS & INSIGHTS ENDPOINTS
# ============================================================================

@router.get("/analytics/dashboard", response_model=InventoryDashboardSummary)
def get_inventory_dashboard(
    store_id: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_current_user_id),
):
    """Get comprehensive inventory metrics and KPIs."""
    analytics_service = AnalyticsService(db, owner_id)
    return analytics_service.get_dashboard_summary()

@router.get("/analytics/optimization", response_model=InventoryOptimizationSummary)
def get_inventory_optimization(
    store_id: Optional[str] = None,
    days: int = Query(30, ge=7, le=365),
    limit: int = Query(25, ge=1, le=100),
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_current_user_id),
):
    """Get prioritized restock, revenue risk, and carrying-cost recommendations."""
    analytics_service = AnalyticsService(db, owner_id)
    return analytics_service.get_inventory_optimization(store_id=store_id, days=days, limit=limit)

@router.get("/analytics/product-health", response_model=List[ProductHealthOut])
def get_product_health_scores(
    limit: int = Query(50, ge=1, le=500),
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_current_user_id),
):
    """Get health scores for all products (stock status, margin, turnover)."""
    service = InventoryServiceV2(db, owner_id)
    return service.get_product_health_scores(limit)

@router.get("/analytics/low-stock", response_model=List[ProductDetailOut])
def get_low_stock_alerts(
    store_id: Optional[str] = None,
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_current_user_id),
):
    """Get products below minimum stock level."""
    service = InventoryServiceV2(db, owner_id)
    return service.get_low_stock_items(store_id)

@router.get("/analytics/dead-stock", response_model=List[ProductDetailOut])
def get_dead_stock_detection(
    days_no_sales: int = Query(30, ge=7, le=120),
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_current_user_id),
):
    """Get products with no sales in specified days."""
    service = InventoryServiceV2(db, owner_id)
    return service.detect_dead_stock(days_no_sales)

@router.get("/analytics/ai-insights", response_model=AIInsightsOut)
def get_ai_insights(
    store_id: Optional[str] = None,
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_current_user_id),
):
    """Get AI-powered inventory insights and recommendations."""
    service = InventoryServiceV2(db, owner_id)
    return service.get_ai_insights(store_id)

@router.get("/analytics/turnover-ratio")
def calculate_inventory_turnover(
    product_id: Optional[str] = None,
    store_id: Optional[str] = None,
    days: int = Query(30, ge=7, le=365),
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_current_user_id),
):
    """Calculate inventory turnover ratio."""
    service = InventoryServiceV2(db, owner_id)
    return service.calculate_turnover_ratio(product_id, store_id, days)

@router.get("/analytics/reconcile", response_model=List[ReconciliationResult])
def reconcile_inventory_ledger(
    store_id: str = Query(...),
    product_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_current_user_id),
):
    """Reconcile stock levels against the immutable domain ledger."""
    service = InventoryServiceV2(db, owner_id)
    return service.reconcile_inventory(store_id, product_id)

@router.get("/analytics/daily-report", response_model=DailyReportOut)
def get_daily_report(
    report_date: date = Query(..., alias="date"),
    store_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_current_user_id),
):
    """Opening/closing stock value and units received/issued for one day."""
    service = AnalyticsService(db, owner_id)
    return service.get_daily_report(report_date, store_id)

# ============================================================================
# EXPORT ENDPOINTS
# ============================================================================

@router.get("/analytics/daily-report/export.csv")
def export_daily_report_csv(
    report_date: date = Query(..., alias="date"),
    store_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_current_user_id),
):
    """Export a single day's report as CSV — same figures as GET /analytics/daily-report."""
    service = AnalyticsService(db, owner_id)
    report = service.get_daily_report(report_date, store_id)

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["Date", "Store", "Opening value (kobo)", "Closing value (kobo)",
                      "Units received", "Units issued", "Movement count", "Closing value estimated"])
    writer.writerow([
        report.report_date.isoformat(), report.store_id or "all",
        report.opening_value_kobo, report.closing_value_kobo,
        report.units_received, report.units_issued, report.movement_count,
        report.is_closing_value_estimated,
    ])
    buffer.seek(0)
    filename = f"daily-report-{report.report_date.isoformat()}.csv"
    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )

# ============================================================================
# VOICE & SCAN ENDPOINTS
# ============================================================================

@router.post("/voice/parse", status_code=201)
def process_voice_input(
    payload: Optional[VoiceParseRequest] = Body(None),
    audio_base64: Optional[str] = Query(None),
    store_id: Optional[str] = Query(None),
    language: str = Query("en"),
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_current_user_id),
):
    """Parse voice input and update inventory."""
    resolved_audio_base64 = payload.audio_base64 if payload else audio_base64
    resolved_store_id = payload.store_id if payload else store_id
    resolved_language = payload.language if payload else language
    if not resolved_audio_base64 or not resolved_store_id:
        raise HTTPException(status_code=422, detail="audio_base64 and store_id are required.")

    service = InventoryServiceV2(db, owner_id)
    return service.process_voice_input(resolved_audio_base64, resolved_store_id, resolved_language)

@router.get("/scan/barcode", response_model=ProductOut)
@router.post("/scan/barcode", response_model=ProductOut)
def scan_barcode(
    barcode_data: str = Query(...),
    store_id: str = Query(...),
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_current_user_id),
):
    """Scan barcode and return product info with current stock."""
    service = InventoryServiceV2(db, owner_id)
    return service.get_product_by_barcode(barcode_data, store_id)

@router.post("/scan/computer-vision", status_code=201)
def scan_shelf_vision(
    payload: Optional[VisionScanRequest] = Body(None),
    image_base64: Optional[str] = Query(None),
    store_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_current_user_id),
):
    """Upload shelf image for computer vision analysis."""
    resolved_image_base64 = payload.image_base64 if payload else image_base64
    resolved_store_id = payload.store_id if payload else store_id
    if not resolved_image_base64 or not resolved_store_id:
        raise HTTPException(status_code=422, detail="image_base64 and store_id are required.")

    service = InventoryServiceV2(db, owner_id)
    return service.process_vision_scan(resolved_image_base64, resolved_store_id)


# ============================================================================
# ACTIVITY LOG & STAFF TRACKING ENDPOINTS
# ============================================================================

@router.get("/activity-log", response_model=List[ActivityLogOut])
def get_activity_log(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    actor_id: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
    entity_type: Optional[str] = Query(None),
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_current_user_id),
):
    """Get activity log for the business. Only the business owner can view all staff activity."""
    service = ActivityLogService(db, owner_id)
    return service.get_activity_log(skip, limit, actor_id, action, entity_type, days)


@router.get("/staff-summary", response_model=List[StaffSummaryOut])
def get_staff_summary(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_current_user_id),
):
    """Get summary of all staff activity. Shows who did what and when."""
    service = ActivityLogService(db, owner_id)
    return service.get_staff_summary(days)


# ============================================================================
# SALES INTEGRITY ENDPOINTS
# ============================================================================

@router.get("/analytics/sales-integrity", response_model=SalesIntegrityReportOut)
def get_sales_integrity(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_current_user_id),
):
    """
    Compute sales integrity report. Cross-validates sales data against
    stock movements to detect manipulation, ghost sales, excessive credit,
    and anomalous patterns.
    """
    service = SalesIntegrityService(db, owner_id)
    return service.compute_integrity_report(days)
