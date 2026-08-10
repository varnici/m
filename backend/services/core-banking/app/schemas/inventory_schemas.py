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
    icon: Optional[str] = Field(default="Package")
    tint: Optional[str] = Field(default="#2E6E9E")


class CategoryUpdate(BaseModel):
    """Schema for updating a category. All fields optional."""
    name: Optional[str] = None
    slug: Optional[str] = None
    description: Optional[str] = None
    parent_id: Optional[str] = None
    image_url: Optional[str] = None
    icon: Optional[str] = None
    tint: Optional[str] = None
    is_active: Optional[bool] = None
    position: Optional[int] = None


class CategoryBulkCreateItem(BaseModel):
    """A single category within a bulk-create request."""
    name: str = Field(..., min_length=1)
    slug: Optional[str] = None
    icon: Optional[str] = Field(default="Package")
    tint: Optional[str] = Field(default="#2E6E9E")
    parent_id: Optional[str] = None


class CategoryBulkCreateRequest(BaseModel):
    """Batch-create request, used to seed starter categories for a business type."""
    categories: List[CategoryBulkCreateItem] = Field(..., min_length=1)


class CategoryOut(BaseModel):
    """Response schema for category."""
    id: str
    owner_id: str
    name: str
    slug: str
    description: Optional[str]
    parent_id: Optional[str]
    image_url: Optional[str]
    icon: Optional[str] = "Package"
    tint: Optional[str] = "#2E6E9E"
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
    size: Optional[str] = None
    imei: Optional[str] = None
    expiry_date: Optional[date] = None
    image_url: Optional[str] = None
    quantity_on_hand: Optional[int] = Field(default=None, ge=0)
    store_id: Optional[str] = None
    expenses_kobo: int = Field(default=0, ge=0)
    quantity_sold: int = Field(default=0, ge=0)
    quantity_on_credit: int = Field(default=0, ge=0)
    trade_price_kobo: int = Field(default=0, ge=0)
    expected_amount: int = Field(default=0, ge=0)
    actual_amount: int = Field(default=0, ge=0)
    discrepancy_qty: int = Field(default=0)
    monthly_velocity: int = Field(default=0, ge=0)
    days_of_supply: int = Field(default=0, ge=0)
    trade_moq: int = Field(default=1, ge=1)
    is_wholesale_listed: bool = Field(default=False)
    # Bulk/packaging: set parent_id to sell this product as a pack/bag/carton
    # of an existing base-unit product. conversion_factor is how many of the
    # base unit one of these contains (e.g. "Bag of Rice" -> parent_id =
    # "Piece" product, conversion_factor = 50). Every purchase/sale recorded
    # against this product is then auto-converted onto the base unit's real
    # stock count (see StockService._handle_depletion/_handle_replenishment).
    parent_id: Optional[str] = None
    conversion_factor: int = Field(default=1, ge=1)


class ProductUpdate(BaseModel):
    """Schema for updating a product."""
    name: Optional[str] = None
    description: Optional[str] = None
    cost_price_kobo: Optional[int] = None
    selling_price_kobo: Optional[int] = None
    minimum_stock_level: Optional[int] = None
    maximum_stock_level: Optional[int] = None
    reorder_quantity: Optional[int] = None
    nafdac_number: Optional[str] = None
    size: Optional[str] = None
    imei: Optional[str] = None
    expiry_date: Optional[date] = None
    is_wholesale_listed: Optional[bool] = None
    unit_of_measure: Optional[str] = None
    category_id: Optional[str] = None
    image_url: Optional[str] = None
    is_active: Optional[bool] = None
    expenses_kobo: Optional[int] = None
    quantity_sold: Optional[int] = None
    quantity_on_credit: Optional[int] = None
    trade_price_kobo: Optional[int] = None
    expected_amount: Optional[int] = None
    actual_amount: Optional[int] = None
    discrepancy_qty: Optional[int] = None
    monthly_velocity: Optional[int] = None
    days_of_supply: Optional[int] = None
    trade_moq: Optional[int] = None
    parent_id: Optional[str] = None
    conversion_factor: Optional[int] = Field(default=None, ge=1)


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
    nafdac_number: Optional[str] = None
    size: Optional[str] = None
    imei: Optional[str] = None
    expiry_date: Optional[date] = None
    is_wholesale_listed: bool = False
    is_active: bool
    rating: float
    review_count: int
    expenses_kobo: int = 0
    quantity_sold: int = 0
    quantity_on_credit: int = 0
    retail_price_kobo: int = 0
    trade_price_kobo: int = 0
    retail_margin_pct: float = 0.0
    trade_margin_pct: float = 0.0
    expected_amount: int = 0
    actual_amount: int = 0
    discrepancy_qty: int = 0
    monthly_velocity: int = 0
    days_of_supply: int = 0
    trade_moq: int = 1
    parent_id: Optional[str] = None
    conversion_factor: int = 1
    # Aggregated across stock levels (and, for the list endpoint, reservations) —
    # populated by ProductService, not stored directly on the Product row.
    total_quantity_on_hand: int = 0
    total_reserved_quantity: int = 0
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
    stock_by_location: List[StockLevelOut] = []
    total_inventory_value_kobo: int = 0
    profit_per_unit_kobo: int = 0
    margin_percentage: Decimal = Decimal("0")
    is_dead_stock: bool = False
    children: List[ProductOut] = []
    demand_forecast: List[DemandForecastPoint] = []
    ai_intelligence: List[ProductIntelligence] = []


# ============================================================================
# STOCK SCHEMAS
# ============================================================================

class StockMovementCreate(BaseModel):
    """Schema for creating a stock movement."""
    product_id: str
    store_id: Optional[str] = None
    from_store_id: Optional[str] = None
    to_store_id: Optional[str] = None
    quantity: int = Field(...)
    movement_type: str = Field(..., pattern=r"^(purchase|sale|adjustment|transfer|loss|return|damage)$")
    input_method: Optional[str] = "manual"
    reference_id: Optional[str] = None
    reference_type: Optional[str] = None
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
    store_id: Optional[str] = None
    from_store_id: Optional[str] = None
    to_store_id: Optional[str] = None
    quantity: int
    movement_type: str
    input_method: Optional[str] = None
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
    purpose: str = Field(default="sale")
    notes: Optional[str] = None
    expires_at: Optional[datetime] = None


class StockReservationAction(BaseModel):
    """Schema for managing a reservation."""
    action: str = Field(..., pattern=r"^(confirm|cancel|adjust)$")
    quantity: Optional[int] = None
    notes: Optional[str] = None


class StockReservationOut(BaseModel):
    """Response schema for stock reservation."""
    id: str
    owner_id: Optional[str] = None
    product_id: str
    store_id: str
    purpose: str = "sale"
    quantity: int
    quantity_reserved: int = 0
    quantity_committed: int = 0
    quantity_released: int = 0
    reference_type: str
    reference_id: Optional[str]
    notes: Optional[str] = None
    expires_at: Optional[datetime] = None
    status: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    released_at: Optional[datetime] = None
    committed_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


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
    business_type: Optional[str] = Field(default="custom")
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
    business_type: Optional[str] = "custom"
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
    po_number: Optional[str] = None


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
    total_value_kobo: int = 0
    total_revenue_kobo: int = 0
    total_profit_kobo: int = 0
    turnover_ratio: float = 0.0
    turnover_description: str = ""
    dead_stock_count: int = 0
    best_sellers: List[Dict[str, Any]] = Field(default_factory=list)
    categories: List[Dict[str, Any]] = Field(default_factory=list)
    recent_transactions: List[Dict[str, Any]] = Field(default_factory=list)
    revenue_trend: List[Dict[str, Any]] = Field(default_factory=list)
    global_recommendations: List[Dict[str, Any]] = Field(default_factory=list)


class InventoryOptimizationSummary(BaseModel):
    """Optimization summary for inventory."""
    optimization_score: float
    recommendations: List[str] = []


class DailyReportOut(BaseModel):
    """Opening/closing stock position and movement totals for a single day."""
    report_date: date
    store_id: Optional[str] = None
    opening_value_kobo: int = 0
    closing_value_kobo: int = 0
    units_received: int = 0
    units_issued: int = 0
    movement_count: int = 0
    is_closing_value_estimated: bool = False


class ProductHealthOut(BaseModel):
    """Health metrics for a product."""
    product_id: str
    sku: Optional[str] = None
    name: Optional[str] = None
    health_score: int = 0
    stock_status: str = "in_stock"
    margin_percentage: float = 0.0
    turnover_rate: float = 0.0


class AIInsightsOut(BaseModel):
    """AI-generated insights."""
    insight_type: str
    title: str
    description: str
    confidence: float
    recommendation: Optional[str] = None


class GlobalRecommendation(BaseModel):
    """Actionable recommendation shown across dashboard surfaces."""
    id: str
    type: str
    title: str
    description: str
    impact: str
    priority: int = 0
    action_text: Optional[str] = None
    action_route: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


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


class SalesTransactionItemOut(BaseModel):
    """Response schema for a sales transaction line item."""
    id: str
    product_id: str
    quantity_sold: int
    unit_price_kobo: int
    line_total_kobo: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SalesTransactionOut(BaseModel):
    """Response schema for sales transaction."""
    id: str
    owner_id: str
    store_id: Optional[str]
    customer_id: Optional[str]
    customer_name: Optional[str]
    payment_method: Optional[str]
    total_amount_kobo: int
    discount_amount_kobo: int
    shipping_fee_kobo: int
    status: str
    order_type: str
    shipping_address: Optional[str]
    shipping_city: Optional[str]
    shipping_state: Optional[str]
    notes: Optional[str]
    transaction_date: datetime
    created_at: datetime
    items: List[SalesTransactionItemOut]
    savings_suggestion: Optional[SavingsSuggestion] = None

    model_config = ConfigDict(from_attributes=True)

# ============================================================================
# RECONCILIATION SCHEMAS
# ============================================================================

class ReconciliationResult(BaseModel):
    """A single ledger-vs-stock reconciliation row."""
    product_id: str
    sku: Optional[str] = None
    name: Optional[str] = None
    current_on_hand: int = 0
    ledger_sum: int = 0
    drift: int = 0
    status: str = "reconciled"
    timestamp: datetime


class StocktakeCountIn(BaseModel):
    """Physical stock count for one product."""
    product_id: str
    actual_amount: int = Field(..., ge=0)


class StocktakeReconcileRequest(BaseModel):
    """Payload for applying a physical stocktake."""
    store_id: str
    counts: List[StocktakeCountIn] = Field(..., min_length=1)


class StocktakeReconcileItem(BaseModel):
    """Result of reconciling one product against a physical count."""
    product_id: str
    sku: str
    product_name: str
    expected_amount: int
    actual_amount: int
    discrepancy_qty: int
    variance_status: str


class StocktakeReconcileOut(BaseModel):
    """Result of applying a physical stocktake."""
    reconciled_count: int
    discrepancies_count: int
    total_missing: int
    total_overage: int
    items: List[StocktakeReconcileItem] = []


# ============================================================================
# MARKETPLACE SCHEMAS
# ============================================================================

class ListingCreate(BaseModel):
    """Schema for creating a marketplace listing."""
    product_id: str
    price_kobo: int = Field(..., ge=0)
    available_quantity: int = Field(..., ge=0)
    slug: Optional[str] = None
    is_active: bool = True


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
    price_kobo: int = 0
    rating: float = 0
    review_count: int = 0
    image_url: Optional[str]
    available_quantity: int = 0
    listing_id: Optional[str] = None
    marketplace_price_kobo: Optional[int] = None
    marketplace_available_quantity: Optional[int] = None
    marketplace_slug: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class ProductSellerInfo(BaseModel):
    """Product seller information."""
    seller_id: str
    seller_name: str
    price_kobo: int
    available_quantity: int
    seller_rating: float


# ============================================================================
# ACTIVITY LOG SCHEMAS
# ============================================================================

class ActivityLogOut(BaseModel):
    """Response schema for activity log entry."""
    id: str
    actor_id: Optional[str]
    actor_name: str
    action: str
    entity_type: str
    entity_id: Optional[str]
    entity_name: Optional[str]
    details: Optional[Dict[str, Any]] = None
    ip_address: Optional[str] = None
    is_owner: bool = False
    created_at: str

class StaffSummaryOut(BaseModel):
    """Summary of staff activity."""
    actor_id: str
    actor_name: str
    is_owner: bool = False
    total_actions: int
    last_active: Optional[str] = None
    actions_breakdown: Dict[str, int] = {}


# ============================================================================
# SALES INTEGRITY SCHEMAS
# ============================================================================

class IntegrityFlagOut(BaseModel):
    """A single integrity flag on a product."""
    type: str
    severity: str
    message: str

class ProductIntegrityOut(BaseModel):
    """Integrity score for a single product."""
    product_id: str
    product_name: str
    sku: str
    integrity_score: int
    quantity_on_hand: int
    quantity_sold: int
    quantity_on_credit: int
    flags: List[IntegrityFlagOut] = []

class SalesIntegrityReportOut(BaseModel):
    """Overall sales integrity report."""
    overall_score: int
    risk_level: str
    total_products_checked: int
    flagged_products: int = 0
    critical_flags: int = 0
    total_flags: int = 0
    product_scores: List[ProductIntegrityOut] = []


# ============================================================================
# TRADE (B2B) SCHEMAS
# ============================================================================

class TradeClientCreate(BaseModel):
    """Schema for creating a B2B trade client."""
    company_name: str = Field(..., min_length=1)
    vat_number: Optional[str] = None
    delivery_address: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    default_payment_terms: str = Field(default="immediate", pattern=r"^(immediate|net30)$")


class TradeClientOut(BaseModel):
    """Response schema for a trade client."""
    id: str
    owner_id: str
    company_name: str
    vat_number: Optional[str] = None
    delivery_address: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    default_payment_terms: str
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TradeOrderLineCreate(BaseModel):
    """Schema for a single line on a trade order."""
    product_id: str
    quantity: int = Field(..., ge=1)
    unit_price_kobo: int = Field(..., ge=0)


class TradeOrderCreate(BaseModel):
    """Schema for creating a draft trade order."""
    client_id: str
    store_id: str
    payment_terms: str = Field(default="immediate", pattern=r"^(immediate|net30)$")
    lines: List[TradeOrderLineCreate] = Field(..., min_length=1)


class TradeOrderLineOut(BaseModel):
    """Response schema for a trade order line."""
    id: str
    product_id: str
    quantity: int
    unit_price_kobo: int
    reservation_id: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class TradeOrderOut(BaseModel):
    """Response schema for a trade order."""
    id: str
    owner_id: str
    client_id: str
    store_id: str
    status: str
    payment_terms: str
    total_kobo: int
    sale_id: Optional[str] = None
    lines: List[TradeOrderLineOut] = []
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
