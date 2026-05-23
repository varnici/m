"""
VentureRoute Logistics Models
Pydantic schemas for the community logistics coordination system
"""

from typing import Optional, List
from datetime import datetime, time
from decimal import Decimal
from enum import Enum
from pydantic import BaseModel, Field, validator, conlist


# ============================================================================
# ENUMS
# ============================================================================

class LogisticsStatus(str, Enum):
    PENDING_GROUPING = "pending_grouping"
    GROUPED = "grouped"
    LEAD_ASSIGNED = "lead_assigned"
    PAYMENT_LOCKED = "payment_locked"
    READY_DISPATCH = "ready_dispatch"
    IN_TRANSIT = "in_transit"
    AT_TERMINAL = "at_terminal"
    DELIVERED = "delivered"
    FAILED = "failed"
    CANCELLED = "cancelled"


class RouteType(str, Enum):
    DISTRIBUTION = "distribution"
    COLLECTION = "collection"
    RETURN = "return"
    EMERGENCY = "emergency"


class QRHandshakeType(str, Enum):
    HUB_ARRIVAL = "hub_arrival"
    PACKAGE_PICKUP = "package_pickup"
    DELIVERY_CONFIRMATION = "delivery_confirmation"


class WalletFreezeStatus(str, Enum):
    ACTIVE = "active"
    RELEASED = "released"
    FORFEITED = "forfeited"
    REFUNDED = "refunded"


# ============================================================================
# VENTUREHUB MODELS
# ============================================================================

class VentureHubCreate(BaseModel):
    store_id: str
    name: str
    hub_qr_code: str
    latitude: Decimal = Field(..., ge=-90, le=90)
    longitude: Decimal = Field(..., ge=-180, le=180)
    address: str
    operational_hours_start: time
    operational_hours_end: time
    max_concurrent_retailers: Optional[int] = 50
    status: str = "active"

    class Config:
        use_enum_values = True


class VentureHubResponse(VentureHubCreate):
    id: str
    owner_id: str
    created_at: datetime
    updated_at: datetime


# ============================================================================
# LOGISTICS REQUEST MODELS
# ============================================================================

class LogisticsRequestCreate(BaseModel):
    manufacturer_id: str
    pickup_location_id: Optional[str] = None
    delivery_location_id: Optional[str] = None
    
    # Package dimensions
    package_weight_kg: Decimal = Field(..., gt=0)
    package_length_cm: Decimal = Field(..., gt=0)
    package_width_cm: Decimal = Field(..., gt=0)
    package_height_cm: Decimal = Field(..., gt=0)
    
    # Optional: pre-calculated VU (if None, calculated automatically)
    volumetric_units: Optional[Decimal] = None
    
    base_handling_fee_kobo: Optional[int] = 5000
    priority: Optional[int] = 0

    @validator('package_weight_kg', 'package_length_cm', 'package_width_cm', 'package_height_cm')
    def validate_dimensions(cls, v):
        if v <= 0:
            raise ValueError('Dimensions must be positive')
        return v

    class Config:
        use_enum_values = True


class LogisticsRequestResponse(LogisticsRequestCreate):
    id: str
    retailer_id: str
    volumetric_units: Decimal
    estimated_total_fee_kobo: Optional[int]
    status: LogisticsStatus
    requested_at: datetime
    created_at: datetime
    updated_at: datetime


# ============================================================================
# LOGISTICS ROUTE MODELS (SILVER LAYER)
# ============================================================================

class LogisticsRouteCreate(BaseModel):
    manufacturer_id: str
    venturehub_id: Optional[str] = None
    
    route_type: RouteType = RouteType.DISTRIBUTION
    truck_capacity_vu: Decimal = Field(..., gt=0)
    truck_plate_number: Optional[str] = None
    fixed_trip_cost_kobo: int = Field(..., gt=0)
    
    estimated_departure: Optional[datetime] = None

    class Config:
        use_enum_values = True


class LogisticsRouteResponse(LogisticsRouteCreate):
    id: str
    route_number: str
    total_volumetric_units: Decimal
    fill_percentage: Decimal
    lead_retailer_id: Optional[str]
    status: LogisticsStatus
    created_at: datetime
    updated_at: datetime


# ============================================================================
# ROUTE MEMBER MODELS (CLUSTERING)
# ============================================================================

class RouteMemberCreate(BaseModel):
    route_id: str
    retailer_id: str
    logistics_request_id: str
    
    delivery_latitude: Optional[Decimal] = None
    delivery_longitude: Optional[Decimal] = None
    delivery_address: Optional[str] = None
    
    stop_sequence: Optional[int] = None

    class Config:
        use_enum_values = True


class RouteMemberResponse(RouteMemberCreate):
    id: str
    individual_volumetric_units: Decimal
    individual_share_kobo: int
    handling_fee_kobo: int
    total_cost_kobo: int
    status: LogisticsStatus
    joined_at: datetime
    created_at: datetime


# ============================================================================
# WALLET FREEZE MODELS (ANTI-LEAKAGE)
# ============================================================================

class WalletFreezeCreate(BaseModel):
    route_id: str
    frozen_amount_kobo: int = Field(..., gt=0)
    freeze_reason: str
    release_trigger: Optional[str] = None

    class Config:
        use_enum_values = True


class WalletFreezeResponse(WalletFreezeCreate):
    id: str
    user_id: str
    frozen_at: datetime
    release_date: Optional[datetime]
    status: WalletFreezeStatus
    created_at: datetime
    updated_at: datetime


# ============================================================================
# QR CODE MODELS
# ============================================================================

class QRCodeCreate(BaseModel):
    code_value: str
    code_type: QRHandshakeType
    entity_type: str = Field(..., pattern="^(venturehub|logistics_request|route_member)$")
    entity_id: str
    expires_at: Optional[datetime] = None

    class Config:
        use_enum_values = True


class QRCodeResponse(QRCodeCreate):
    id: str
    is_active: bool
    generated_at: datetime
    scans_count: int


# ============================================================================
# QR HANDSHAKE MODELS (SECURITY AUDIT)
# ============================================================================

class QRHandshakeCreate(BaseModel):
    qr_code_id: str
    route_member_id: Optional[str] = None
    handshake_type: QRHandshakeType
    
    scan_latitude: Optional[Decimal] = None
    scan_longitude: Optional[Decimal] = None
    
    otp_required: Optional[bool] = False
    otp_code: Optional[str] = None

    class Config:
        use_enum_values = True


class QRHandshakeResponse(BaseModel):
    id: str
    qr_code_id: str
    route_member_id: Optional[str]
    scanned_by: Optional[str]
    handshake_type: QRHandshakeType
    scan_latitude: Optional[Decimal]
    scan_longitude: Optional[Decimal]
    otp_verified: bool
    is_valid: bool
    validation_errors: Optional[str]
    scanned_at: datetime
    created_at: datetime

    class Config:
        use_enum_values = True


# ============================================================================
# ANALYTICS MODELS (GOLD LAYER)
# ============================================================================

class LogisticsAnalyticsResponse(BaseModel):
    id: str
    route_id: str
    total_cost_kobo: Optional[int]
    cost_per_vu_kobo: Optional[Decimal]
    truck_utilization_percent: Optional[Decimal]
    total_retailers: Optional[int]
    avg_order_value_kobo: Optional[int]
    successful_deliveries: int
    failed_deliveries: int
    delivery_success_rate: Decimal
    qr_scans_completed: int
    qr_compliance_rate: Decimal
    lead_retailer_sales_velocity_score: Optional[Decimal]
    calculated_at: datetime


# ============================================================================
# COMPOSITE MODELS FOR API RESPONSES
# ============================================================================

class RouteWithMembersResponse(LogisticsRouteResponse):
    """Route with all clustered members"""
    members: List[RouteMemberResponse]
    analytics: Optional[LogisticsAnalyticsResponse] = None


class ClusteringRequestPayload(BaseModel):
    """Request to cluster logistics requests into routes"""
    manufacturer_id: str
    radius_km: Optional[Decimal] = 2.0  # Default 2km radius
    max_retailers_per_route: Optional[int] = 50
    truck_capacity_vu: Decimal = Field(..., gt=0)
    fixed_trip_cost_kobo: int = Field(..., gt=0)
    venturehub_id: Optional[str] = None


class ClusteringResult(BaseModel):
    """Result of clustering operation"""
    route_id: str
    route_number: str
    members_count: int
    total_vu: Decimal
    fill_percentage: Decimal
    lead_retailer_id: Optional[str]
    total_cost_kobo: int
    avg_cost_per_retailer_kobo: int


class PaymentLockRequest(BaseModel):
    """Request to lock payment (freeze wallet)"""
    route_id: str
    retailer_id: str


class PaymentLockResponse(BaseModel):
    """Response from payment lock"""
    freeze_id: str
    frozen_amount_kobo: int
    status: WalletFreezeStatus
    message: str
