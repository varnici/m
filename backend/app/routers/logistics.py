"""
VentureRoute Logistics API Endpoints
FastAPI routers for clustering, routing, QR codes, and wallet management
"""

from fastapi import APIRouter, HTTPException, status, Request, Depends
from uuid import UUID, uuid4
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from decimal import Decimal
from typing import Optional

from app.database import get_db_session
from app.models.logistics import (
    LogisticsRequestCreate,
    LogisticsRequestResponse,
    ClusteringRequestPayload,
    ClusteringResult,
    PaymentLockRequest,
    PaymentLockResponse,
    QRHandshakeType,
    QRHandshakeCreate,
    RouteWithMembersResponse,
)
from app.services.cluster_service import ClusterService
from app.services.volumetric_engine import VolumetricUnitEngine
from app.services.wallet_freeze_service import WalletFreezeService
from app.services.qr_handshake_service import QRHandshakeService
from app.middleware.security import limiter, get_current_user

router = APIRouter(prefix="/api/v1/logistics", tags=["logistics"])


# ============================================================================
# LOGISTICS REQUEST ENDPOINTS (BRONZE LAYER)
# ============================================================================

@router.post(
    "/requests",
    response_model=LogisticsRequestResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create logistics request",
)
@limiter.limit("60/minute")
async def create_logistics_request(
    request: Request,
    payload: LogisticsRequestCreate,
    db: AsyncSession = Depends(get_db_session),
    user_id: UUID = Depends(get_current_user),
):
    """
    Create a new logistics request.
    
    A retailer submits a request to move goods from manufacturer to their store.
    This is the "Bronze" layer - raw data.
    
    Request body:
    - manufacturer_id: Source of goods
    - package_weight_kg: Actual weight
    - package_length/width/height_cm: Dimensions
    - pickup_location_id: Where to pick up from
    - delivery_location_id: Where to deliver to
    
    Response: Generated request with:
    - volumetric_units: Calculated dimensional weight
    - estimated_total_fee_kobo: Estimated cost
    - status: "pending_grouping"
    """
    try:
        engine = VolumetricUnitEngine()
        
        # Calculate volumetric units if not provided
        volumetric_units = payload.volumetric_units or engine.calculate_volumetric_units(
            weight_kg=payload.package_weight_kg,
            length_cm=payload.package_length_cm,
            width_cm=payload.package_width_cm,
            height_cm=payload.package_height_cm,
        )
        
        # Estimate cost (rough estimate - will be exact after clustering)
        estimated_cost = int(volumetric_units) * 1000 + int(payload.base_handling_fee_kobo)
        
        req_id = uuid4()
        user_uuid = UUID(str(user_id))
        manufacturer_uuid = UUID(str(payload.manufacturer_id))
        pickup_uuid = UUID(str(payload.pickup_location_id)) if payload.pickup_location_id else None
        delivery_uuid = UUID(str(payload.delivery_location_id)) if payload.delivery_location_id else None
        
        insert_query = text("""
            INSERT INTO logistics_requests (
                id, retailer_id, manufacturer_id, pickup_location_id, delivery_location_id,
                package_weight_kg, package_length_cm, package_width_cm, package_height_cm,
                volumetric_units, base_handling_fee_kobo, estimated_total_fee_kobo,
                status, priority, requested_at, created_at, updated_at
            ) VALUES (
                :id, :retailer_id, :manufacturer_id, :pickup_location_id, :delivery_location_id,
                :package_weight_kg, :package_length_cm, :package_width_cm, :package_height_cm,
                :volumetric_units, :base_handling_fee_kobo, :estimated_cost,
                'pending_grouping', :priority, NOW(), NOW(), NOW()
            )
            RETURNING *
        """)
        
        result = await db.execute(
            insert_query,
            {
                "id": req_id,
                "retailer_id": user_uuid,
                "manufacturer_id": manufacturer_uuid,
                "pickup_location_id": pickup_uuid,
                "delivery_location_id": delivery_uuid,
                "package_weight_kg": float(payload.package_weight_kg),
                "package_length_cm": float(payload.package_length_cm),
                "package_width_cm": float(payload.package_width_cm),
                "package_height_cm": float(payload.package_height_cm),
                "volumetric_units": float(volumetric_units),
                "base_handling_fee_kobo": payload.base_handling_fee_kobo,
                "estimated_cost": estimated_cost,
                "priority": payload.priority,
            }
        )
        await db.commit()
        row = result.first()
        if not row:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create logistics request"
            )
            
        data = dict(row._mapping)
        return data
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


# ============================================================================
# CLUSTERING ENDPOINTS (SILVER LAYER)
# ============================================================================

@router.post(
    "/routes/cluster",
    response_model=ClusteringResult,
    summary="Cluster logistics requests into route",
)
@limiter.limit("30/minute")
async def cluster_requests(
    request: Request,
    payload: ClusteringRequestPayload,
    db: AsyncSession = Depends(get_db_session),
):
    """
    Cluster pending logistics requests into a optimized route.
    
    This is the "Route Joiner" - groups retailers within 2km radius.
    
    Algorithm:
    1. Find all pending requests from manufacturer
    2. Group by geospatial proximity (2km radius)
    3. Calculate volumetric units
    4. Designate lead retailer (highest SalesVelocityScore)
    5. Create route and assign members
    
    Request body:
    - manufacturer_id: Manufacturer providing goods
    - radius_km: Clustering radius (default 2km)
    - truck_capacity_vu: Truck capacity in volumetric units
    - fixed_trip_cost_kobo: Base cost of trip
    
    Response: ClusteringResult with:
    - route_id: New route ID
    - members_count: Number of retailers in route
    - total_vu: Total volumetric units
    - fill_percentage: "Fill-to-Save" progress (0-100%)
    - lead_retailer_id: Lead coordinator
    - total_cost_kobo: Trip cost
    - avg_cost_per_retailer_kobo: Average per retailer
    """
    try:
        cluster_service = ClusterService(db)
        
        result = await cluster_service.cluster_requests_into_route(
            manufacturer_id=payload.manufacturer_id,
            radius_km=payload.radius_km or Decimal("2.0"),
            max_retailers_per_route=payload.max_retailers_per_route or 50,
            truck_capacity_vu=payload.truck_capacity_vu,
            fixed_trip_cost_kobo=payload.fixed_trip_cost_kobo,
            venturehub_id=payload.venturehub_id,
        )
        
        return result
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get(
    "/routes/{route_id}",
    response_model=RouteWithMembersResponse,
    summary="Get route details with members and analytics",
)
@limiter.limit("120/minute")
async def get_route_details(
    request: Request,
    route_id: str,
    db: AsyncSession = Depends(get_db_session),
):
    """
    Get detailed route information including:
    - Route metadata
    - All clustered members
    - Cost breakdown
    - Analytics (Gold layer)
    - Fill percentage
    """
    try:
        route_uuid = UUID(route_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid route ID format"
        )
        
    route_query = text("SELECT * FROM logistics_routes WHERE id = :route_id")
    result = await db.execute(route_query, {"route_id": route_uuid})
    route_row = result.first()
    if not route_row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Route {route_id} not found"
        )
        
    route_data = dict(route_row._mapping)
    
    members_query = text("SELECT * FROM route_members WHERE route_id = :route_id ORDER BY stop_sequence ASC")
    result = await db.execute(members_query, {"route_id": route_uuid})
    member_rows = result.fetchall()
    members_data = [dict(row._mapping) for row in member_rows]
    
    analytics_query = text("SELECT * FROM logistics_analytics WHERE route_id = :route_id LIMIT 1")
    result = await db.execute(analytics_query, {"route_id": route_uuid})
    analytics_row = result.first()
    analytics_data = dict(analytics_row._mapping) if analytics_row else None
    
    return {
        **route_data,
        "members": members_data,
        "analytics": analytics_data,
    }


# ============================================================================
# PAYMENT LOCKING ENDPOINTS (WALLET FREEZE)
# ============================================================================

@router.post(
    "/payments/freeze",
    response_model=PaymentLockResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Lock payment for route participation",
)
@limiter.limit("60/minute")
async def lock_payment(
    request: Request,
    payload: PaymentLockRequest,
    db: AsyncSession = Depends(get_db_session),
):
    """
    Freeze retailer's payment when joining a route.
    
    Security: "No payment = No dispatch"
    
    Flow:
    1. Verify retailer has sufficient balance
    2. Lock funds in wallet_freezes table
    3. Mark route_member as "payment_locked"
    4. Set up release trigger (QR handshake)
    
    Request body:
    - route_id: Route to join
    - retailer_id: Retailer ID
    
    Response:
    - freeze_id: Freeze record ID
    - frozen_amount_kobo: Amount frozen
    - status: "active"
    """
    try:
        try:
            route_uuid = UUID(payload.route_id)
            retailer_uuid = UUID(payload.retailer_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid ID format"
            )
            
        member_query = text("""
            SELECT total_cost_kobo FROM route_members
            WHERE route_id = :route_id AND retailer_id = :retailer_id
            LIMIT 1
        """)
        result = await db.execute(
            member_query,
            {"route_id": route_uuid, "retailer_id": retailer_uuid}
        )
        row = result.first()
        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Retailer {payload.retailer_id} is not a member of route {payload.route_id}"
            )
            
        member_cost_kobo = int(row[0])
        
        wallet_service = WalletFreezeService(db)
        
        freeze_response = await wallet_service.freeze_payment(
            user_id=payload.retailer_id,
            route_id=payload.route_id,
            frozen_amount_kobo=member_cost_kobo,
            freeze_reason="logistics_route_participation",
            release_trigger="qr_handshake",
        )
        
        return {
            "freeze_id": freeze_response.id,
            "frozen_amount_kobo": freeze_response.frozen_amount_kobo,
            "status": freeze_response.status,
            "message": f"Payment of {freeze_response.frozen_amount_kobo} kobo has been locked until QR handshake",
        }
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post(
    "/payments/dispatch-check",
)
@limiter.limit("60/minute")
async def check_dispatch_ready(
    request: Request,
    route_id: str,
    db: AsyncSession = Depends(get_db_session),
):
    """
    Verify all route members have locked payments.
    
    Route can only dispatch if:
    - All members have active wallet freezes
    - All freezes are sufficient
    - Route status is "grouped" or "lead_assigned"
    
    Response:
    - can_dispatch: Boolean
    - members_locked: Number with frozen payments
    - total_members: Total in route
    - message: Detailed status
    """
    try:
        wallet_service = WalletFreezeService(db)
        
        can_dispatch, message = await wallet_service.can_dispatch_route(route_id)
        
        return {
            "can_dispatch": can_dispatch,
            "message": message,
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


# ============================================================================
# QR CODE ENDPOINTS
# ============================================================================

@router.post(
    "/qr/generate",
)
@limiter.limit("120/minute")
async def generate_qr_code(
    request: Request,
    handshake_type: QRHandshakeType,
    entity_type: str,
    entity_id: str,
    db: AsyncSession = Depends(get_db_session),
):
    """
    Generate QR code for logistics handshake.
    
    Handshake types:
    - hub_arrival: Driver arrives at terminal
    - package_pickup: Retailer picks up package
    - delivery_confirmation: Package delivered
    
    Entity types:
    - venturehub: Hub/terminal QR
    - logistics_request: Package QR
    - route_member: Retailer/member QR
    
    Response:
    - qr_id: Generated QR code ID
    - code_value: QR code content (string to encode)
    - code_type: Type of handshake
    - expires_at: When this QR code expires
    """
    try:
        qr_service = QRHandshakeService(db)
        
        qr_code = await qr_service.generate_qr_code(
            code_type=handshake_type,
            entity_type=entity_type,
            entity_id=entity_id,
        )
        
        return {
            "qr_id": qr_code.id,
            "code_value": qr_code.code_value,
            "code_type": qr_code.code_type,
            "expires_at": qr_code.expires_at,
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post(
    "/qr/scan",
    summary="Process QR code scan",
)
@limiter.limit("60/minute")
async def process_qr_scan(
    request: Request,
    payload: QRHandshakeCreate,
    user_id: UUID = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """
    Process QR code scan with optional OTP verification.
    
    Dual handshake flow:
    1. Driver scans Hub QR (hub_arrival)
    2. Retailer scans Package QR (package_pickup)
    
    On successful package_pickup:
    - Release wallet freeze
    - Trigger payment payout
    - Update route member status to "ready_dispatch"
    
    Request body:
    - qr_code: The scanned QR code value (string)
    - handshake_type: Type of handshake
    - otp_code: Optional OTP for verification
    
    Response:
    - is_valid: Was handshake successful?
    - message: Status message
    - freeze_released: Was payment released?
    """
    try:
        qr_service = QRHandshakeService(db)
        
        handshake = await qr_service.process_handshake(
            qr_code_value=payload.qr_code_id,
            handshake_type=payload.handshake_type,
            scanned_by=str(user_id),
            scan_latitude=float(payload.scan_latitude) if payload.scan_latitude else None,
            scan_longitude=float(payload.scan_longitude) if payload.scan_longitude else None,
            otp_code=payload.otp_code,
        )
        
        message = "QR handshake successful - Payment released" if handshake.is_valid else "QR handshake failed"
        
        return {
            "is_valid": handshake.is_valid,
            "handshake_id": handshake.id,
            "message": message,
            "validation_errors": handshake.validation_errors,
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get(
    "/routes/{route_id}/compliance",
    summary="Get QR compliance rate for route",
)
@limiter.limit("120/minute")
async def get_compliance_rate(
    request: Request,
    route_id: str,
    db: AsyncSession = Depends(get_db_session),
):
    """
    Calculate QR compliance rate for a route.
    Percentage of members who completed required handshakes.
    """
    try:
        qr_service = QRHandshakeService(db)
        
        compliance_rate = await qr_service.get_qr_compliance_rate(route_id)
        
        return {
            "route_id": route_id,
            "compliance_rate_percent": compliance_rate,
            "status": "compliant" if compliance_rate >= 95 else "non-compliant",
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


# ============================================================================
# COST ESTIMATION ENDPOINTS
# ============================================================================

@router.post(
    "/estimate-cost",
    summary="Estimate logistics cost for package",
)
@limiter.limit("60/minute")
async def estimate_logistics_cost(
    request: Request,
    weight_kg: float,
    length_cm: float,
    width_cm: float,
    height_cm: float,
    fixed_trip_cost_kobo: int = 50000,
    total_route_vu: float = 100.0,
    handling_fee_kobo: int = 5000,
):
    """
    Estimate cost for a package in a route.
    
    Uses VolumetricUnitEngine to calculate fair cost distribution.
    
    Query params:
    - weight_kg: Package weight
    - length/width/height_cm: Package dimensions
    - fixed_trip_cost_kobo: Total trip cost
    - total_route_vu: Total volumetric units in route
    - handling_fee_kobo: Handling fee
    
    Response:
    - volumetric_units: Calculated VU
    - trip_cost_share_kobo: Individual's trip share
    - handling_fee_kobo: Handling fee
    - total_cost_kobo: Total cost
    - breakdown: Readable breakdown
    """
    try:
        engine = VolumetricUnitEngine()
        
        estimate = engine.estimate_cost(
            weight_kg=Decimal(str(weight_kg)),
            length_cm=Decimal(str(length_cm)),
            width_cm=Decimal(str(width_cm)),
            height_cm=Decimal(str(height_cm)),
            fixed_trip_cost_kobo=fixed_trip_cost_kobo,
            total_route_vu=Decimal(str(total_route_vu)),
            handling_fee_kobo=handling_fee_kobo,
        )
        
        return estimate
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
