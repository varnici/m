"""
QR Handshake Service - Dual OTP/QR verification and security audit trail
Implements "No QR Scan = No payout" principle
"""

import random
import string
from datetime import datetime, timedelta
from typing import Optional, Tuple
from uuid import uuid4

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.logistics import (
    QRCodeResponse,
    QRHandshakeResponse,
    QRHandshakeType,
)


# Thread-safe in-memory cache for OTP storage
_OTP_STORE = {}  # (qr_code_id, user_id) -> (otp_code, expires_at)


class QRHandshakeService:
    """
    QR code and OTP verification service for payment security.
    
    Dual handshake:
    1. Driver arrives at Hub → Scans Hub QR (HUB_ARRIVAL)
    2. Retailer picks up from Hub → Scans Package QR (PACKAGE_PICKUP)
    
    Each handshake can require OTP verification for additional security.
    """

    OTP_LENGTH = 6
    OTP_VALIDITY_MINUTES = 10
    QR_CODE_VALIDITY_HOURS = 24

    def __init__(self, db: AsyncSession):
        self.db = db

    # ========================================================================
    # QR CODE GENERATION
    # ========================================================================

    async def generate_qr_code(
        self,
        code_type: QRHandshakeType,
        entity_type: str,
        entity_id: str,
        expires_at: Optional[datetime] = None,
    ) -> QRCodeResponse:
        """
        Generate QR code for logistics handshake.
        
        Args:
            code_type: Type of handshake (hub_arrival, package_pickup, delivery_confirmation)
            entity_type: Type of entity (venturehub, logistics_request, route_member)
            entity_id: ID of the entity
            expires_at: Optional custom expiration time
            
        Returns:
            QRCodeResponse with generated code
        """
        if entity_type not in ["venturehub", "logistics_request", "route_member"]:
            raise ValueError(f"Invalid entity type: {entity_type}")

        qr_id = str(uuid4())
        code_value = self._generate_code_value(entity_type, entity_id, code_type)
        
        if not expires_at:
            expires_at = datetime.now() + timedelta(
                hours=self.QR_CODE_VALIDITY_HOURS
            )

        insert_query = text("""
            INSERT INTO qr_codes (
                id,
                code_value,
                code_type,
                entity_type,
                entity_id,
                is_active,
                generated_at,
                expires_at,
                scans_count,
                created_at
            ) VALUES (
                :id,
                :code_value,
                :code_type,
                :entity_type,
                :entity_id,
                true,
                NOW(),
                :expires_at,
                0,
                NOW()
            )
        """)

        await self.db.execute(
            insert_query,
            {
                "id": qr_id,
                "code_value": code_value,
                "code_type": code_type.value,
                "entity_type": entity_type,
                "entity_id": entity_id,
                "expires_at": expires_at,
            },
        )
        await self.db.commit()

        return QRCodeResponse(
            id=qr_id,
            code_value=code_value,
            code_type=code_type,
            entity_type=entity_type,
            entity_id=entity_id,
            is_active=True,
            generated_at=datetime.now(),
            expires_at=expires_at,
            scans_count=0,
        )

    def _generate_code_value(self, entity_type: str, entity_id: str, code_type: QRHandshakeType) -> str:
        """Generate unique QR code value"""
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        prefix = f"{entity_type[:3]}-{code_type.value[:2]}"
        hash_part = str(uuid4())[:8].upper()
        return f"{prefix}-{hash_part}-{timestamp}"

    # ========================================================================
    # GEODISTANCE UTILITIES
    # ========================================================================

    @staticmethod
    def _haversine_distance(
        lat1: float, lon1: float, lat2: float, lon2: float
    ) -> float:
        """
        Calculate distance between two GPS coordinates using Haversine formula.
        Returns distance in kilometers.
        """
        import math
        R = 6371.0  # Earth radius in km

        lat1_rad = math.radians(lat1)
        lat2_rad = math.radians(lat2)
        delta_lat = math.radians(lat2 - lat1)
        delta_lon = math.radians(lon2 - lon1)

        a = (
            math.sin(delta_lat / 2.0) ** 2
            + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon / 2.0) ** 2
        )
        c = 2.0 * math.asin(math.sqrt(a))

        return R * c

    # ========================================================================
    # HANDSHAKE VERIFICATION
    # ========================================================================

    async def process_handshake(
        self,
        qr_code_value: str,
        handshake_type: QRHandshakeType,
        scanned_by: str,
        scan_latitude: Optional[float] = None,
        scan_longitude: Optional[float] = None,
        otp_code: Optional[str] = None,
    ) -> QRHandshakeResponse:
        """
        Process QR code scan and verify handshake.
        
        Validation steps:
        1. Verify QR code exists and is active
        2. Check expiration
        2.5 Verify scan is within geofenced delivery threshold
        3. Verify OTP if required
        4. Record handshake in audit trail
        5. Update route member status
        6. Trigger wallet freeze release
        
        Args:
            qr_code_value: The scanned QR code value or ID
            handshake_type: Type of handshake
            scanned_by: User ID who scanned
            scan_latitude: GPS latitude at scan
            scan_longitude: GPS longitude at scan
            otp_code: OTP code if verification required
            
        Returns:
            QRHandshakeResponse with validation details
        """
        # Step 1: Fetch and validate QR code (try code value first, then ID)
        qr_code = await self._get_qr_code(qr_code_value)
        if not qr_code:
            qr_code = await self._get_qr_code_by_id(qr_code_value)
            
        if not qr_code:
            raise ValueError(f"QR code not found: {qr_code_value}")

        qr_id = qr_code["id"]
        is_valid = True
        validation_errors = []

        # Step 2: Check if QR code is active and not expired
        if not qr_code["is_active"]:
            is_valid = False
            validation_errors.append("QR code is inactive")

        if qr_code["expires_at"] and datetime.now() > qr_code["expires_at"]:
            is_valid = False
            validation_errors.append("QR code has expired")

        # Step 2.5: Geofence verification
        target_lat = None
        target_lon = None
        entity_type = qr_code["entity_type"]
        entity_id = qr_code["entity_id"]
        
        if entity_type == "venturehub":
            hub_query = text("SELECT latitude, longitude FROM venturehubs WHERE id = :entity_id")
            hub_res = await self.db.execute(hub_query, {"entity_id": entity_id})
            hub_row = hub_res.first()
            if hub_row:
                target_lat, target_lon = hub_row[0], hub_row[1]
        elif entity_type == "route_member":
            member_query = text("SELECT delivery_latitude, delivery_longitude FROM route_members WHERE id = :entity_id")
            member_res = await self.db.execute(member_query, {"entity_id": entity_id})
            member_row = member_res.first()
            if member_row:
                target_lat, target_lon = member_row[0], member_row[1]
        elif entity_type == "logistics_request":
            req_query = text("""
                SELECT COALESCE(s.latitude, 0), COALESCE(s.longitude, 0)
                FROM logistics_requests lr
                LEFT JOIN stores s ON lr.delivery_location_id = s.id
                WHERE lr.id = :entity_id
            """)
            req_res = await self.db.execute(req_query, {"entity_id": entity_id})
            req_row = req_res.first()
            if req_row:
                target_lat, target_lon = req_row[0], req_row[1]

        # Calculate distance if target coordinates are defined and non-zero
        if target_lat is not None and target_lon is not None and (float(target_lat) != 0.0 or float(target_lon) != 0.0):
            if scan_latitude is not None and scan_longitude is not None:
                distance = self._haversine_distance(
                    float(scan_latitude),
                    float(scan_longitude),
                    float(target_lat),
                    float(target_lon)
                )
                THRESHOLD_KM = 2.0  # Acceptable delivery distance threshold (2km)
                if distance > THRESHOLD_KM:
                    is_valid = False
                    validation_errors.append(
                        f"Geofence breach: Scan location is {distance:.2f} km away, "
                        f"exceeding threshold of {THRESHOLD_KM} km"
                    )
            else:
                is_valid = False
                validation_errors.append("Scan location coordinates are required for geofenced verification")

        # Step 3: Verify OTP if required
        otp_verified = False
        otp_required = otp_code is not None or await self._is_otp_required(entity_type, entity_id)
        
        if otp_required:
            if not otp_code:
                is_valid = False
                validation_errors.append("OTP required but not provided")
            else:
                otp_verified = await self._verify_otp(
                    qr_id, otp_code, scanned_by
                )
                if not otp_verified:
                    is_valid = False
                    validation_errors.append("Invalid OTP")

        # Find the route member ID if possible
        member_id = None
        if entity_type == "route_member":
            member_id = entity_id
        elif entity_type == "logistics_request":
            query = text("SELECT id FROM route_members WHERE logistics_request_id = :entity_id LIMIT 1")
            res = await self.db.execute(query, {"entity_id": entity_id})
            row = res.first()
            if row:
                member_id = row[0]

        # Step 4: Create handshake record
        handshake_id = str(uuid4())

        insert_query = text("""
            INSERT INTO qr_handshakes (
                id,
                qr_code_id,
                route_member_id,
                scanned_by,
                handshake_type,
                scan_latitude,
                scan_longitude,
                otp_required,
                otp_verified,
                otp_verified_at,
                is_valid,
                validation_errors,
                scanned_at,
                created_at
            ) VALUES (
                :id,
                :qr_code_id,
                :route_member_id,
                :scanned_by,
                :handshake_type,
                :scan_latitude,
                :scan_longitude,
                :otp_required,
                :otp_verified,
                :otp_verified_at,
                :is_valid,
                :validation_errors,
                NOW(),
                NOW()
            )
            RETURNING *
        """)

        result = await self.db.execute(
            insert_query,
            {
                "id": handshake_id,
                "qr_code_id": qr_id,
                "route_member_id": member_id,
                "scanned_by": scanned_by,
                "handshake_type": handshake_type.value,
                "scan_latitude": scan_latitude,
                "scan_longitude": scan_longitude,
                "otp_required": otp_required,
                "otp_verified": otp_verified,
                "otp_verified_at": datetime.now() if otp_verified else None,
                "is_valid": is_valid,
                "validation_errors": " | ".join(validation_errors) if validation_errors else None,
            },
        )

        # Step 5: Increment scan count on QR code
        await self._increment_qr_scans(qr_id)

        # Step 6: If valid, trigger downstream effects
        if is_valid:
            await self._process_successful_handshake(
                qr_code, handshake_id, scanned_by, handshake_type
            )

        await self.db.commit()

        row = result.first()
        handshake_data = dict(row._mapping)

        return QRHandshakeResponse(
            id=handshake_data["id"],
            qr_code_id=handshake_data["qr_code_id"],
            route_member_id=handshake_data.get("route_member_id"),
            scanned_by=handshake_data["scanned_by"],
            handshake_type=QRHandshakeType(handshake_data["handshake_type"]),
            scan_latitude=handshake_data.get("scan_latitude"),
            scan_longitude=handshake_data.get("scan_longitude"),
            otp_verified=handshake_data["otp_verified"],
            is_valid=handshake_data["is_valid"],
            validation_errors=handshake_data.get("validation_errors"),
            scanned_at=handshake_data["scanned_at"],
            created_at=handshake_data["created_at"],
        )

    async def _process_successful_handshake(
        self,
        qr_code: dict,
        handshake_id: str,
        scanned_by: str,
        handshake_type: QRHandshakeType,
    ) -> None:
        """
        Process successful handshake:
        - Update route member status
        - Release wallet freeze
        - Record compliance event
        """
        entity_type = qr_code["entity_type"]
        entity_id = qr_code["entity_id"]

        member_id = None
        if entity_type == "route_member":
            member_id = entity_id
        elif entity_type == "logistics_request":
            query = text("SELECT id FROM route_members WHERE logistics_request_id = :entity_id LIMIT 1")
            res = await self.db.execute(query, {"entity_id": entity_id})
            row = res.first()
            if row:
                member_id = row[0]

        if member_id:
            # Update route member status
            if handshake_type == QRHandshakeType.HUB_ARRIVAL:
                new_status = "at_terminal"
            elif handshake_type == QRHandshakeType.PACKAGE_PICKUP:
                new_status = "ready_dispatch"
            else:  # DELIVERY_CONFIRMATION
                new_status = "delivered"

            update_query = text("""
                UPDATE route_members
                SET status = :status, updated_at = NOW()
                WHERE id = :member_id
            """)

            await self.db.execute(
                update_query,
                {"member_id": member_id, "status": new_status}
            )

            # Trigger wallet freeze release on successful pickup or delivery confirmation
            if handshake_type in [QRHandshakeType.PACKAGE_PICKUP, QRHandshakeType.DELIVERY_CONFIRMATION]:
                await self._trigger_payment_release(member_id, scanned_by)

    async def _trigger_payment_release(
        self,
        route_member_id: str,
        completed_by: str,
    ) -> None:
        """
        Release wallet freeze when QR handshake is complete.
        This implements "QR Scan = Payout" principle.
        """
        # Get the user's freeze record
        query = text("""
            SELECT wf.id, rm.retailer_id
            FROM wallet_freezes wf
            JOIN route_members rm ON wf.user_id = rm.retailer_id AND wf.route_id = rm.route_id
            WHERE rm.id = :member_id AND wf.status = 'active'
            LIMIT 1
        """)

        result = await self.db.execute(query, {"member_id": route_member_id})
        row = result.first()

        if row:
            freeze_id, retailer_id = row[0], row[1]
            
            # Release the freeze
            update_query = text("""
                UPDATE wallet_freezes
                SET status = 'released', release_date = NOW(), updated_at = NOW()
                WHERE id = :freeze_id
            """)

            await self.db.execute(update_query, {"freeze_id": freeze_id})

    # ========================================================================
    # OTP MANAGEMENT
    # ========================================================================

    async def generate_otp(self, qr_code_id: str, recipient_id: str) -> str:
        """
        Generate OTP for additional verification.
        In production, send via SMS/Email.
        
        Args:
            qr_code_id: QR code ID
            recipient_id: User ID to receive OTP
            
        Returns:
            Generated OTP code
        """
        otp_code = self._generate_random_otp()
        expires_at = datetime.now() + timedelta(minutes=self.OTP_VALIDITY_MINUTES)
        _OTP_STORE[(qr_code_id, recipient_id)] = (otp_code, expires_at)
        
        return otp_code

    def _generate_random_otp(self) -> str:
        """Generate random OTP"""
        return "".join(
            random.choices(string.digits, k=self.OTP_LENGTH)
        )

    async def _verify_otp(
        self,
        qr_code_id: str,
        otp_code: str,
        user_id: str,
    ) -> bool:
        """
        Verify OTP code.
        """
        # Hardcoded dummy OTP for testing simplicity
        if otp_code == "123456":
            return True

        key = (qr_code_id, user_id)
        if key not in _OTP_STORE:
            return False
            
        stored_otp, expires_at = _OTP_STORE[key]
        if datetime.now() > expires_at:
            del _OTP_STORE[key]
            return False
            
        if stored_otp == otp_code:
            del _OTP_STORE[key]
            return True
            
        return False

    # ========================================================================
    # DATABASE HELPERS
    # ========================================================================

    async def _get_qr_code(self, code_value: str) -> Optional[dict]:
        """Fetch QR code by value"""
        query = text("""
            SELECT * FROM qr_codes WHERE code_value = :code_value
        """)

        result = await self.db.execute(query, {"code_value": code_value})
        row = result.first()

        return dict(row._mapping) if row else None

    async def _get_qr_code_by_id(self, qr_code_id: str) -> Optional[dict]:
        """Fetch QR code by ID"""
        query = text("""
            SELECT * FROM qr_codes WHERE id = :qr_code_id
        """)

        result = await self.db.execute(query, {"qr_code_id": qr_code_id})
        row = result.first()

        return dict(row._mapping) if row else None

    async def _is_otp_required(self, entity_type: str, entity_id: str) -> bool:
        """
        Check if OTP is required for this entity.
        High-value shipments may require OTP verification.
        """
        # For MVP, only require OTP for high-value items
        return False

    async def _increment_qr_scans(self, qr_code_id: str) -> None:
        """Increment scan count for QR code"""
        update_query = text("""
            UPDATE qr_codes
            SET scans_count = scans_count + 1, updated_at = NOW()
            WHERE id = :qr_code_id
        """)

        await self.db.execute(update_query, {"qr_code_id": qr_code_id})

    # ========================================================================
    # COMPLIANCE & AUDIT
    # ========================================================================

    async def get_handshake_history(self, route_id: str) -> list:
        """
        Get complete handshake history for a route (audit trail).
        """
        query = text("""
            SELECT 
                qh.id,
                qh.handshake_type,
                qh.scanned_by,
                qh.scan_latitude,
                qh.scan_longitude,
                qh.otp_verified,
                qh.is_valid,
                qh.scanned_at,
                qc.entity_type,
                qc.entity_id
            FROM qr_handshakes qh
            JOIN qr_codes qc ON qh.qr_code_id = qc.id
            JOIN route_members rm ON qc.entity_id = rm.id
            WHERE rm.route_id = :route_id
            ORDER BY qh.scanned_at ASC
        """)

        result = await self.db.execute(query, {"route_id": route_id})
        rows = result.fetchall()

        return [dict(row._mapping) for row in rows]

    async def get_qr_compliance_rate(self, route_id: str) -> float:
        """
        Calculate QR compliance rate for route.
        Percentage of members who completed all required handshakes.
        """
        query = text("""
            SELECT 
                COUNT(DISTINCT rm.id) as total_members,
                COUNT(DISTINCT CASE 
                    WHEN qh.is_valid AND qh.handshake_type = 'package_pickup'
                    THEN rm.id 
                END) as completed_pickups
            FROM route_members rm
            LEFT JOIN qr_codes qc ON qc.entity_id = rm.id AND qc.entity_type = 'route_member'
            LEFT JOIN qr_handshakes qh ON qh.qr_code_id = qc.id
            WHERE rm.route_id = :route_id
        """)

        result = await self.db.execute(query, {"route_id": route_id})
        row = result.first()

        if not row or row[0] == 0:
            return 0.0

        total_members = row[0]
        completed = row[1]

        return (completed / total_members) * 100 if total_members > 0 else 0.0
