"""
Inventory Management Schemas - TypeScript-level type safety with Pydantic
"""

from __future__ import annotations

from datetime import date, datetime
from typing import List, Optional, Any, Dict
from decimal import Decimal
from enum import Enum

from pydantic import BaseModel, Field, field_validator, model_validator, ConfigDict


# ============================================================================
# MARKETPLACE SCHEMAS
# ============================================================================

class ListingCreate(BaseModel):
    product_id: str
    price_kobo: int = Field(..., ge=0)
    available_quantity: int = Field(..., ge=0)
    slug: str = Field(..., min_length=1, max_length=100, pattern="^[a-z0-9-]+$")
    is_active: bool = True

class ListingUpdate(BaseModel):
    price_kobo: Optional[int] = Field(None, ge=0)
    available_quantity: Optional[int] = Field(None, ge=0)
    is_active: Optional[bool] = None

class ListingOut(BaseModel):
    id: str
    product_id: str
    price_kobo: int
    available_quantity: int
    slug: str
    is_active: bool
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# ENUMS
# ============================================================================

class InputMethodEnum(str, Enum):
    MANUAL = "manual"
    VOICE = "voice"
    SCAN = "scan"
    API = "api"


class MovementTypeEnum(str, Enum):
    PURCHASE = "purchase"
    SALE = "sale"
    ADJUSTMENT = "adjustment"
    TRANSFER = "transfer"
    DAMAGE = "damage"
    RETURN = "return"


class StockStatusEnum(str, Enum):
    IN_STOCK = "in_stock"
    LOW_STOCK = "low_stock"
    OUT_OF_STOCK = "out_of_stock"
    DISCONTINUED = "discontinued"


class PurchaseOrderStatusEnum(str, Enum):
    DRAFT = "draft"
    PENDING = "pending"
    CONFIRMED = "confirmed"
    SHIPPED = "shipped"
    RECEIVED = "received"
    CANCELLED = "cancelled"


class StoreTypeEnum(str, Enum):
    RETAIL = "retail"
    WAREHOUSE = "warehouse"
    DISTRIBUTION = "distribution"


class ReservationStatusEnum(str, Enum):
    ACTIVE = "active"
    RELEASED = "released"
    COMMITTED = "committed"
    EXPIRED = "expired"
    CANCELLED = "cancelled"


# ============================================================================
# STORE/LOCATION SCHEMAS
# ============================================================================

class StoreCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    type: StoreTypeEnum = StoreTypeEnum.RETAIL
    address: str = Field(..., min_length=5)
    city: str = Field(..., min_length=2)
    state: str = Field(..., min_length=2)
    latitude: Optional[Decimal] = Field(None, ge=-90, le=90)
    longitude: Optional[Decimal] = Field(None, ge=-180, le=180)
    phone: Optional[str] = None
    email: Optional[str] = None
    is_primary: bool = False


class StoreOut(StoreCreate):
    id: str
    owner_id: str
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
        


# ============================================================================
# CATEGORY SCHEMAS
# ============================================================================

class CategoryCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    slug: str = Field(..., min_length=1, max_length=100, pattern="^[a-z0-9-]+$")
    description: Optional[str] = None
    parent_id: Optional[str] = None
    image_url: Optional[str] = None
    position: int = 0

    @field_validator("slug")
    @classmethod
    def validate_slug(cls, v: str) -> str:
        if not v.islower() and "-" in v:
            return v
        return v.lower().replace(" ", "-")


class CategoryOut(CategoryCreate):
    id: str
    owner_id: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
        


# ============================================================================
# PRODUCT SCHEMAS
# ============================================================================

class ProductCreate(BaseModel):
    category_id: Optional[str] = None
    sku: str = Field(..., min_length=1, max_length=50, pattern="^[A-Z0-9-]+$")
    barcode: Optional[str] = None
    qr_code: Optional[str] = None
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    brand: Optional[str] = None
    unit_of_measure: str = Field(default="piece", min_length=1)
    cost_price_kobo: int = Field(..., ge=0)
    selling_price_kobo: int = Field(..., ge=0)
    minimum_stock_level: int = Field(default=10, ge=0)
    maximum_stock_level: int = Field(default=1000, gt=0)
    reorder_quantity: int = Field(default=100, gt=0)
    supplier_lead_time_days: int = Field(default=7, ge=1)
    is_perishable: bool = False
    shelf_life_days: Optional[int] = None
    requires_lot_tracking: bool = False
    nafdac_number: Optional[str] = None
    image_url: Optional[str] = None
    is_active: bool = True

    # Bulk/Packaging handling
    parent_id: Optional[str] = None
    conversion_factor: int = 1
    # Optional initial stock initialization
    quantity_on_hand: Optional[int] = Field(None, ge=0)
    store_id: Optional[str] = None

    @model_validator(mode="after")
    def validate_product_logic(self) -> ProductCreate:
        if self.selling_price_kobo < self.cost_price_kobo:
            raise ValueError("Selling price cannot be less than cost price")
        if self.maximum_stock_level <= self.minimum_stock_level:
            raise ValueError("Maximum stock must be greater than minimum stock")
        return self


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category_id: Optional[str] = None
    sku: Optional[str] = None
    barcode: Optional[str] = None
    brand: Optional[str] = None
    cost_price_kobo: Optional[int] = Field(None, ge=0)
    selling_price_kobo: Optional[int] = Field(None, ge=0)
    minimum_stock_level: Optional[int] = Field(None, ge=0)
    maximum_stock_level: Optional[int] = Field(None, gt=0)
    reorder_quantity: Optional[int] = Field(None, gt=0)
    supplier_lead_time_days: Optional[int] = Field(None, ge=1)
    is_perishable: Optional[bool] = None
    shelf_life_days: Optional[int] = None
    is_active: Optional[bool] = None


class ProductSellerInfo(BaseModel):
    business_name: str
    latitude: Optional[Decimal] = None
    longitude: Optional[Decimal] = None
    address: Optional[str] = None
    city: Optional[str] = None

class ProductOut(ProductCreate):
    id: str
    owner_id: str
    is_active: bool
    parent_id: Optional[str]
    conversion_factor: int
    created_at: datetime
    updated_at: datetime
    total_quantity_on_hand: int = 0
    total_reserved_quantity: int = 0
    rating: float = 5.0
    review_count: int = 0
    seller_info: Optional[ProductSellerInfo] = None

    model_config = ConfigDict(from_attributes=True)

class DemandForecastPoint(BaseModel):
    date: str
    quantity: int


class ProductIntelligence(BaseModel):
    headline: str
    subtitle: str
    impact: str # 'positive', 'negative', 'neutral'


class ProductDetailOut(ProductOut):
    """Extended product details including stock and pricing insights."""
    stock_by_location: List[StockLevelOut] = []
    total_quantity_on_hand: int = 0
    total_reserved_quantity: int = 0
    total_inventory_value_kobo: int = 0
    profit_per_unit_kobo: int = 0
    margin_percentage: Decimal = Field(default=0.0)
    inventory_turnover_7d: Decimal = 0.0
    last_sale_date: Optional[datetime] = None
    reorder_recommendation: Optional[int] = None
    preferred_supplier_id: Optional[str] = None
    is_dead_stock: bool = False
    children: List[ProductOut] = []
    demand_forecast: List[DemandForecastPoint] = []
    ai_intelligence: List[ProductIntelligence] = []


class MarketplaceProductOut(ProductOut):
    listing_id: Optional[str] = None
    marketplace_price_kobo: Optional[int] = None
    marketplace_available_quantity: Optional[int] = None
    marketplace_slug: Optional[str] = None


# ============================================================================
# STOCK LEVEL SCHEMAS
# ============================================================================

class StockLevelOut(BaseModel):
    id: str
    product_id: str
    store_id: str
    quantity_on_hand: int = Field(ge=0)
    quantity_reserved: int = Field(ge=0)
    quantity_available: int = Field(ge=0)
    status: StockStatusEnum
    last_counted_at: Optional[datetime] = None
    last_movement_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
        


class StockMovementCreate(BaseModel):
    product_id: str
    from_store_id: Optional[str] = None
    to_store_id: Optional[str] = None
    movement_type: MovementTypeEnum
    input_method: InputMethodEnum = InputMethodEnum.MANUAL
    quantity: int = Field(..., gt=0)
    reference_id: Optional[str] = None
    reference_type: Optional[str] = None
    notes: Optional[str] = None
    voice_input_raw: Optional[str] = None

    @field_validator("quantity")
    @classmethod
    def validate_quantity(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("Quantity must be greater than 0")
        return v


class StockMovementOut(StockMovementCreate):
    id: str
    owner_id: str
    staff_id: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
        


class StockReservationCreate(BaseModel):
    product_id: str
    store_id: str
    quantity: int = Field(..., gt=0)
    purpose: str = Field(default="sale", min_length=1, max_length=50)
    reference_id: Optional[str] = None
    reference_type: Optional[str] = None
    notes: Optional[str] = None
    expires_at: Optional[datetime] = None


class StockReservationAction(BaseModel):
    quantity: Optional[int] = Field(None, gt=0)
    notes: Optional[str] = None


class StockReservationOut(BaseModel):
    id: str
    owner_id: str
    product_id: str
    store_id: str
    status: ReservationStatusEnum
    purpose: str
    quantity_reserved: int
    quantity_committed: int
    quantity_released: int
    reference_id: Optional[str] = None
    reference_type: Optional[str] = None
    notes: Optional[str] = None
    expires_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    released_at: Optional[datetime] = None
    committed_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
        


class OutboxMessageOut(BaseModel):
    id: str
    topic: str
    event_type: str
    owner_id: str
    command_id: str
    payload: Dict[str, Any]
    status: str
    error_message: Optional[str] = None
    published_at: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
        


class OutboxProcessResult(BaseModel):
    attempted: int
    published: int
    dead_lettered: int


class OutboxReplayResult(BaseModel):
    requeued: int


# ============================================================================
# SUPPLIER SCHEMAS
# ============================================================================

class SupplierCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    contact_person: Optional[str] = None
    phone: str = Field(..., min_length=10)
    email: Optional[str] = None
    address: str = Field(..., min_length=5)
    city: str = Field(..., min_length=2)
    state: str = Field(..., min_length=2)
    bank_name: Optional[str] = None
    bank_account_number: Optional[str] = None
    payment_terms: str = "net_30"
    lead_time_days: int = Field(default=7, ge=1)
    minimum_order_value_kobo: int = Field(default=0, ge=0)
    is_preferred: bool = False


class SupplierUpdate(BaseModel):
    name: Optional[str] = None
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    payment_terms: Optional[str] = None
    lead_time_days: Optional[int] = Field(None, ge=1)
    is_preferred: Optional[bool] = None
    status: Optional[str] = None


class SupplierOut(SupplierCreate):
    id: str
    owner_id: str
    status: str
    rating: Decimal
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
        


class ProductSupplierLink(BaseModel):
    """Link between product and supplier with pricing."""
    supplier_id: str
    supplier_sku: Optional[str] = None
    supplier_price_kobo: int = Field(..., ge=0)
    lead_time_days: Optional[int] = None
    minimum_order_qty: int = Field(default=1, gt=0)
    pack_size: int = Field(default=1, gt=0)
    is_preferred: bool = False


# ============================================================================
# PURCHASE ORDER SCHEMAS
# ============================================================================

class PurchaseOrderItemCreate(BaseModel):
    product_id: str
    quantity_ordered: int = Field(..., gt=0)
    unit_price_kobo: int = Field(..., ge=0)


class PurchaseOrderCreate(BaseModel):
    supplier_id: str
    store_id: Optional[str] = None  # Optional, will default to primary store in service
    po_number: Optional[str] = None  # Auto-generated if not provided
    items: List[PurchaseOrderItemCreate] = Field(..., min_items=1)
    expected_delivery_date: Optional[date] = None
    notes: Optional[str] = None

    @model_validator(mode='after')
    def validate_items(self) -> PurchaseOrderCreate:
        items = self.items
        if not items or len(items) == 0:
            raise ValueError("At least one item is required")
        return self


class PurchaseOrderUpdate(BaseModel):
    expected_delivery_date: Optional[date] = None
    notes: Optional[str] = None
    status: Optional[PurchaseOrderStatusEnum] = None


class PurchaseOrderItemOut(PurchaseOrderItemCreate):
    id: str
    purchase_order_id: str
    quantity_received: int = 0
    line_total_kobo: int

    model_config = ConfigDict(from_attributes=True)
        


class PurchaseOrderOut(BaseModel):
    id: str
    owner_id: str
    supplier_id: str
    store_id: str
    po_number: str
    status: PurchaseOrderStatusEnum
    total_amount_kobo: int
    expected_delivery_date: Optional[date] = None
    actual_delivery_date: Optional[date] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    supplier: Optional[SupplierOut] = None
    store: Optional[StoreOut] = None

    model_config = ConfigDict(from_attributes=True)
        


class PurchaseOrderDetailOut(PurchaseOrderOut):
    items: List[PurchaseOrderItemOut]
    supplier: Optional[SupplierOut] = None
    store: Optional[StoreOut] = None


# ============================================================================
# ANALYTICS SCHEMAS
# ============================================================================

class RecentTransactionItem(BaseModel):
    """Specific schema for recent dashboard transactions."""
    id: str
    date: str
    amount_kobo: int
    customer: str
    product_name: str
    quantity: int
    unit_price_kobo: int
    profit_kobo: int

class GlobalRecommendation(BaseModel):
    """Smart AI-driven recommendations displayed globally."""
    id: str
    type: str  # 'restock', 'cross_sell', 'bundle', 'insight', 'promo'
    title: str
    description: str
    impact: str  # 'high', 'medium', 'low'
    priority: int = 0
    action_text: str
    action_route: str
    metadata: Dict[str, Any] = {}

class InventoryDashboardSummary(BaseModel):
    """Simplified summary for the main inventory dashboard."""
    total_value_kobo: int
    total_revenue_kobo: int
    total_profit_kobo: int
    turnover_ratio: float
    turnover_description: str
    dead_stock_count: int
    best_sellers: List[Dict[str, Any]] = []
    categories: List[Dict[str, Any]] = []
    recent_transactions: List[RecentTransactionItem] = []
    global_recommendations: List[GlobalRecommendation] = []

class InventoryMetricsOut(BaseModel):
    """Comprehensive inventory dashboard metrics."""
    store_id: Optional[str] = None
    date: date
    total_inventory_value_kobo: int
    total_quantity_on_hand: int
    low_stock_items_count: int
    out_of_stock_items_count: int
    inventory_turnover_ratio: Decimal
    total_sku_count: int
    active_sku_count: int
    discontinued_sku_count: int
    average_inventory_age_days: Decimal
    seasonal_trend: Optional[str] = None
    top_selling_products: List[Dict[str, Any]] = []
    top_profit_products: List[Dict[str, Any]] = []
    dead_stock_value_kobo: int = 0
    obsolete_stock_percentage: Decimal = 0.0

    model_config = ConfigDict(from_attributes=True)
        


class ProductHealthOut(BaseModel):
    """Individual product health scorecard."""
    id: str
    sku: str
    name: str
    total_quantity_on_hand: int = 0
    total_cost_value_kobo: int = 0
    total_selling_value_kobo: int = 0
    profit_value_kobo: int = 0
    margin_percentage: Decimal = 0.0
    stock_health: str  # 'critical', 'low', 'healthy', 'overstocked'
    turnover_7d: Decimal = 0.0
    turnover_30d: Decimal = 0.0
    last_movement_date: Optional[datetime] = None
    minimum_stock_level: int = 0
    maximum_stock_level: int = 0
    reorder_status: Optional[str] = None
    expiry_status: Optional[str] = None  # 'critical', 'warning', 'safe'


class AIInsightsOut(BaseModel):
    """AI-powered inventory insights."""
    store_id: Optional[str] = None
    generated_at: datetime
    
    # Recommendations
    restock_recommendations: List[Dict[str, Any]] = []  # [{ product_id, needed_qty, supplier_id }]
    dead_stock_alerts: List[Dict[str, Any]] = []  # [{ product_id, quantity, days_no_sale }]
    excess_stock_alerts: List[Dict[str, Any]] = []  # [{ product_id, quantity, months_supply }]
    slow_moving_stock: List[Dict[str, Any]] = []  # [{ product_id, turnover_ratio }]
    
    # Predictions
    demand_forecast_7d: List[Dict[str, Any]] = []  # [{ product_id, forecasted_qty }]
    demand_forecast_30d: List[Dict[str, Any]] = []
    anomaly_detections: List[Dict[str, Any]] = []  # [{ product_id, anomaly_type, confidence }]
    
    # Dynamic pricing
    pricing_recommendations: List[Dict[str, Any]] = []  # [{ product_id, suggested_price, rationale }]
    
    # Supplier insights
    supplier_recommendations: List[Dict[str, Any]] = []  # For auto-restock
    
    # KPI summaries
    kpi_summary: Dict[str, Any] = {}


class DemandForecastOut(BaseModel):
    product_id: str
    forecast_date: date
    forecasted_quantity: int
    confidence_score: Decimal = Field(ge=0, le=1)
    factors: List[str] = []  # Factors influencing the forecast
    historical_average: int = 0


class AnomalyDetectionOut(BaseModel):
    product_id: str
    detected_at: datetime
    anomaly_type: str  # 'unusual_spike', 'unusual_dip', 'pattern_change'
    confidence_score: Decimal = Field(ge=0, le=1)
    description: str
    recommended_action: Optional[str] = None


class LedgerEntry(BaseModel):
    id: str
    product_name: str
    customer_name: Optional[str]
    customer_phone: Optional[str] = None
    customer_id: Optional[str]
    quantity: int
    unit_price_kobo: int
    revenue_kobo: int
    cost_price_kobo: int
    profit_kobo: int
    transaction_date: datetime

    model_config = ConfigDict(from_attributes=True)
        


# ============================================================================
# SALES TRANSACTION SCHEMAS
# ============================================================================

class SalesTransactionItemCreate(BaseModel):
    product_id: str
    quantity_sold: int
    unit_price_kobo: int
    reservation_id: Optional[str] = None

class SalesTransactionCreate(BaseModel):
    store_id: Optional[str] = None
    customer_id: Optional[str] = None
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    payment_method: Optional[str] = "cash"
    discount_amount_kobo: Optional[int] = 0
    
    # Marketplace Fields
    status: Optional[str] = "completed"
    order_type: Optional[str] = "pos"
    shipping_address: Optional[str] = None
    shipping_city: Optional[str] = None
    shipping_state: Optional[str] = None
    shipping_fee_kobo: Optional[int] = 0
    
    notes: Optional[str] = None
    items: List[SalesTransactionItemCreate]

class SalesTransactionUpdate(BaseModel):
    customer_id: Optional[str] = None
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    payment_method: Optional[str] = None
    discount_amount_kobo: Optional[int] = None
    notes: Optional[str] = None
    items: Optional[List[SalesTransactionItemCreate]] = None

class SalesTransactionItemOut(BaseModel):
    id: str
    product_id: str
    quantity_sold: int
    unit_price_kobo: int
    line_total_kobo: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
        

class ReconciliationResult(BaseModel):
    product_id: str
    sku: str
    name: str
    current_on_hand: int
    ledger_sum: int
    drift: int
    status: str
    timestamp: datetime

class SavingsSuggestion(BaseModel):
    title: str
    message: str
    suggested_amount_kobo: int
    goal_id: Optional[str] = None

class SalesTransactionOut(BaseModel):
    id: str
    owner_id: str
    store_id: Optional[str]
    customer_id: Optional[str]
    customer_name: Optional[str]
    customer_phone: Optional[str] = None
    total_amount_kobo: int
    discount_amount_kobo: int
    payment_method: Optional[str]
    
    # Marketplace Fields
    status: str
    order_type: str
    shipping_address: Optional[str]
    shipping_city: Optional[str]
    shipping_state: Optional[str]
    shipping_fee_kobo: int
    
    notes: Optional[str]
    transaction_date: datetime
    items: List[SalesTransactionItemOut]
    savings_suggestion: Optional[SavingsSuggestion] = None

    model_config = ConfigDict(from_attributes=True)
