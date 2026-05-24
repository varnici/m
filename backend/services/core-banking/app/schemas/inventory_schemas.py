"""Inventory management schemas."""
from __future__ import annotations

from datetime import datetime, date
from decimal import Decimal
from pydantic import BaseModel, ConfigDict, Field, field_validator
from typing import List, Dict, Any, Optional

from app.schemas.dashboard_schemas import InventoryMetricsOut


# ============================================================================
# CATEGORY SCHEMAS
# ============================================================================

class CategoryCreate(BaseModel):
    """Schema for creating a category."""
    name: str = Field(..., min_length=1)
    slug: str = Field(..., min_length=1)
    description: Optional[str] = None
    parent_id: Optional[str] = None
    image_url: Optional[str] = None


class CategoryOut(BaseModel):
    """Response schema for category."""
    id: str
    owner_id: str
    name: str
    slug: str
    description: Optional[str]
    parent_id: Optional[str]
    image_url: Optional[str]
    is_active: bool
    position: int
    created_at: datetime

    class Config:
        from_attributes = True


# ============================================================================
# PRODUCT SCHEMAS
# ============================================================================

class ProductCreate(BaseModel):
    """Schema for creating a product."""
    category_id: Optional[str] = None
    sku: str = Field(..., min_length=1)
    barcode: Optional[str] = None
    qr_code: Optional[str] = None
    name: str = Field(..., min_length=1)
    description: Optional[str] = None
    brand: Optional[str] = None
    unit_of_measure: str = Field(default="piece")
    cost_price_kobo: int = Field(..., ge=0)
    selling_price_kobo: int = Field(..., ge=0)
    minimum_stock_level: int = Field(default=10, ge=0)
    maximum_stock_level: int = Field(default=1000, ge=0)
    reorder_quantity: int = Field(default=100, ge=1)
    supplier_lead_time_days: int = Field(default=7, ge=0)
    is_perishable: bool = Field(default=False)
    shelf_life_days: Optional[int] = None
    requires_lot_tracking: bool = Field(default=False)
    nafdac_number: Optional[str] = None
    image_url: Optional[str] = None


class ProductUpdate(BaseModel):
    """Schema for updating a product."""
    name: Optional[str] = None
    description: Optional[str] = None
    cost_price_kobo: Optional[int] = None
    selling_price_kobo: Optional[int] = None
    minimum_stock_level: Optional[int] = None
    maximum_stock_level: Optional[int] = None
    reorder_quantity: Optional[int] = None
    image_url: Optional[str] = None
    is_active: Optional[bool] = None


class ProductOut(BaseModel):
    """Response schema for product."""
    id: str
    owner_id: str
    category_id: Optional[str]
    sku: str
    barcode: Optional[str]
    qr_code: Optional[str]
    name: str
    description: Optional[str]
    brand: Optional[str]
    unit_of_measure: str
    cost_price_kobo: int
    selling_price_kobo: int
    minimum_stock_level: int
    maximum_stock_level: int
    reorder_quantity: int
    is_perishable: bool
    is_active: bool
    rating: float
    review_count: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @field_validator("id", "owner_id", "category_id", "parent_id", mode="before")
    @classmethod
    def _coerce_uuid_to_str(cls, v: Any) -> Any:
        if v is not None and not isinstance(v, str):
            return str(v)
        return v


class DemandForecastPoint(BaseModel):
    date: str
    quantity: int


class ProductIntelligence(BaseModel):
    headline: str
    subtitle: str
    impact: str # 'positive', 'negative', 'neutral'


class ProductDetailOut(ProductOut):
    """Detailed product response with relationships."""
    category: Optional[CategoryOut] = None
    current_stock: int = 0


# ============================================================================
# STOCK SCHEMAS
# ============================================================================

class StockLevelOut(BaseModel):
    """Response schema for stock level."""
    id: str
    product_id: str
    store_id: str
    quantity_on_hand: int
    quantity_reserved: int
    quantity_available: int
    last_counted_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


class StockMovementCreate(BaseModel):
    """Schema for creating a stock movement."""
    product_id: str
    store_id: str
    quantity: int = Field(...)
    movement_type: str = Field(..., pattern=r"^(purchase|sale|adjustment|transfer|loss|return)$")
    reference_id: Optional[str] = None
    notes: Optional[str] = None

    @field_validator("quantity")
    @classmethod
    def quantity_must_not_be_zero(cls, value: int) -> int:
        if value == 0:
            raise ValueError("quantity must not be zero")
        return value


class StockMovementOut(BaseModel):
    """Response schema for stock movement."""
    id: str
    product_id: str
    store_id: str
    quantity: int
    movement_type: str
    reference_id: Optional[str]
    notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class StockReservationCreate(BaseModel):
    """Schema for creating a stock reservation."""
    product_id: str
    store_id: str
    quantity: int = Field(..., ge=1)
    reference_type: str = Field(..., pattern=r"^(sales_order|purchase_order|transfer)$")
    reference_id: str


class StockReservationAction(BaseModel):
    """Schema for managing a reservation."""
    action: str = Field(..., pattern=r"^(confirm|cancel|adjust)$")
    quantity: Optional[int] = None


class StockReservationOut(BaseModel):
    """Response schema for stock reservation."""
    id: str
    product_id: str
    store_id: str
    quantity: int
    reference_type: str
    reference_id: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


# ============================================================================
# SUPPLIER SCHEMAS
# ============================================================================

class SupplierCreate(BaseModel):
    """Schema for creating a supplier."""
    name: str = Field(..., min_length=1)
    contact_person: Optional[str] = None
    phone: str = Field(..., min_length=10)
    email: Optional[str] = None
    address: str = Field(..., min_length=1)
    city: str = Field(..., min_length=1)
    state: str = Field(..., min_length=1)
    bank_name: Optional[str] = None
    bank_account_number: Optional[str] = None
    payment_terms: str = Field(default="net_30")
    lead_time_days: int = Field(default=7, ge=0)
    minimum_order_value_kobo: int = Field(default=0, ge=0)


class SupplierUpdate(BaseModel):
    """Schema for updating a supplier."""
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    is_preferred: Optional[bool] = None
    status: Optional[str] = None


class SupplierOut(BaseModel):
    """Response schema for supplier."""
    id: str
    owner_id: str
    name: str
    contact_person: Optional[str]
    phone: str
    email: Optional[str]
    address: str
    city: str
    state: str
    payment_terms: str
    lead_time_days: int
    minimum_order_value_kobo: int
    is_preferred: bool
    status: str
    rating: Decimal
    created_at: datetime

    class Config:
        from_attributes = True


# ============================================================================
# STORE SCHEMAS
# ============================================================================

class StoreCreate(BaseModel):
    """Schema for creating a store."""
    name: str = Field(..., min_length=1)
    description: Optional[str] = None
    type: str = Field(default="retail")
    address: str = Field(..., min_length=1)
    city: str = Field(..., min_length=1)
    state: str = Field(..., min_length=1)
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    is_primary: bool = Field(default=False)


class StoreOut(BaseModel):
    """Response schema for store."""
    id: str
    owner_id: str
    name: str
    description: Optional[str]
    type: str
    address: str
    city: str
    state: str
    latitude: Optional[float]
    longitude: Optional[float]
    phone: Optional[str]
    email: Optional[str]
    is_primary: bool
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


# ============================================================================
# OUTBOX SCHEMAS (for event streaming)
# ============================================================================

class OutboxMessageOut(BaseModel):
    """Response schema for outbox message."""
    id: str
    aggregate_id: str
    aggregate_type: str
    event_type: str
    payload: Dict[str, Any]
    published: bool
    published_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


class OutboxProcessResult(BaseModel):
    """Result of processing outbox messages."""
    processed_count: int
    failed_count: int
    errors: List[str] = []


class OutboxReplayResult(BaseModel):
    """Result of replaying outbox messages."""
    replayed_count: int
    failed_count: int
    errors: List[str] = []


# ============================================================================
# PURCHASE ORDER SCHEMAS
# ============================================================================

class PurchaseOrderItemCreate(BaseModel):
    """Schema for a purchase order item."""
    product_id: str
    quantity: int = Field(..., ge=1)
    unit_price_kobo: int = Field(..., ge=0)


class PurchaseOrderCreate(BaseModel):
    """Schema for creating a purchase order."""
    supplier_id: str
    store_id: str
    items: List[PurchaseOrderItemCreate] = Field(..., min_length=1)
    notes: Optional[str] = None
    expected_delivery_date: Optional[date] = None


class PurchaseOrderUpdate(BaseModel):
    """Schema for updating a purchase order."""
    status: Optional[str] = None
    notes: Optional[str] = None


class PurchaseOrderOut(BaseModel):
    """Response schema for purchase order."""
    id: str
    owner_id: str
    supplier_id: str
    store_id: str
    status: str
    total_amount_kobo: int
    notes: Optional[str]
    expected_delivery_date: Optional[date]
    created_at: datetime

    class Config:
        from_attributes = True


class PurchaseOrderDetailOut(PurchaseOrderOut):
    """Detailed purchase order with items."""
    items: List[Dict[str, Any]] = []


# ============================================================================
# ANALYTICS SCHEMAS
# ============================================================================

class InventoryDashboardSummary(BaseModel):
    """Dashboard summary for inventory."""
    total_products: int
    total_stock_value_kobo: int
    low_stock_items: int
    out_of_stock_items: int
    total_suppliers: int
    pending_orders: int


class InventoryOptimizationSummary(BaseModel):
    """Optimization summary for inventory."""
    optimization_score: float
    recommendations: List[str] = []


class ProductHealthOut(BaseModel):
    """Health metrics for a product."""
    product_id: str
    turnover_rate: float
    days_to_stockout: Optional[int]
    reorder_urgency: str
    profit_margin_pct: float


class AIInsightsOut(BaseModel):
    """AI-generated insights."""
    insight_type: str
    title: str
    description: str
    confidence: float
    recommendation: Optional[str] = None


class LedgerEntry(BaseModel):
    """Ledger entry."""
    date: date
    description: str
    quantity_in: int
    quantity_out: int
    balance: int


# ============================================================================
# SALES TRANSACTION SCHEMAS
# ============================================================================

class SalesTransactionItemCreate(BaseModel):
    """Schema for a sales transaction item."""
    product_id: str
    quantity_sold: int = Field(..., ge=1)
    unit_price_kobo: int = Field(..., ge=0)
    reservation_id: Optional[str] = None


class SalesTransactionCreate(BaseModel):
    """Schema for creating a sales transaction."""
    owner_id: Optional[str] = None
    store_id: Optional[str] = None
    customer_id: Optional[str] = None
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    payment_method: str = Field(default="cash")
    discount_amount_kobo: int = Field(default=0, ge=0)
    shipping_fee_kobo: int = Field(default=0, ge=0)
    shipping_address: Optional[str] = None
    shipping_city: Optional[str] = None
    shipping_state: Optional[str] = None
    items: List[SalesTransactionItemCreate] = Field(..., min_length=1)
    notes: Optional[str] = None
    status: Optional[str] = None
    order_type: Optional[str] = None


class SalesTransactionUpdate(BaseModel):
    """Schema for updating a sales transaction."""
    status: Optional[str] = None
    notes: Optional[str] = None


class SavingsSuggestion(BaseModel):
    title: str
    message: str
    suggested_amount_kobo: int
    goal_id: Optional[str] = None

class SalesTransactionOut(BaseModel):
    """Response schema for sales transaction."""
    id: str
    owner_id: str
    store_id: Optional[str]
    customer_id: Optional[str]
    customer_name: Optional[str]
    payment_method: str
    total_amount_kobo: int
    discount_amount_kobo: int
    shipping_fee_kobo: int
    status: str
    order_type: str
<<<<<<< HEAD
    shipping_address: Optional[str]
    shipping_city: Optional[str]
    shipping_state: Optional[str]
    shipping_fee_kobo: int
    
    notes: Optional[str]
    transaction_date: datetime
    items: List[SalesTransactionItemOut]
    savings_suggestion: Optional[SavingsSuggestion] = None

    model_config = ConfigDict(from_attributes=True)
=======
    created_at: datetime

    class Config:
        from_attributes = True


# ============================================================================
# RECONCILIATION SCHEMAS
# ============================================================================

class ReconciliationResult(BaseModel):
    """Result of a reconciliation operation."""
    reconciled_count: int
    discrepancies: List[Dict[str, Any]] = []
    total_variance_kobo: int


# ============================================================================
# MARKETPLACE SCHEMAS
# ============================================================================

class ListingCreate(BaseModel):
    """Schema for creating a marketplace listing."""
    product_id: str
    price_kobo: int = Field(..., ge=0)
    available_quantity: int = Field(..., ge=0)


class ListingUpdate(BaseModel):
    """Schema for updating a listing."""
    price_kobo: Optional[int] = None
    available_quantity: Optional[int] = None
    is_active: Optional[bool] = None


class ListingOut(BaseModel):
    """Response schema for listing."""
    id: str
    product_id: str
    price_kobo: int
    available_quantity: int
    slug: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class MarketplaceProductOut(BaseModel):
    """Marketplace product response."""
    id: str
    name: str
    description: Optional[str]
    brand: Optional[str]
    price_kobo: int
    rating: float
    review_count: int
    image_url: Optional[str]
    available_quantity: int


class ProductSellerInfo(BaseModel):
    """Product seller information."""
    seller_id: str
    seller_name: str
    price_kobo: int
    available_quantity: int
    seller_rating: float
>>>>>>> 28426ae5 (ai asistance ui and update)
