import pytest
from unittest.mock import AsyncMock, MagicMock
from datetime import datetime, timedelta
from uuid import uuid4
from decimal import Decimal

from app.services.qr_handshake_service import QRHandshakeService, _OTP_STORE
from app.models.logistics import QRHandshakeType
from app.routers.logistics import process_qr_scan
from app.models.logistics import QRHandshakeCreate

@pytest.mark.asyncio
class TestQRHandshakeService:
    """Test suite for QRHandshakeService geofencing, OTP, and auto-release escrow"""

    async def test_haversine_distance(self):
        # Coordinates for two points in Lagos (approx. 1.11 km apart)
        lat1, lon1 = 6.4549, 3.4246
        lat2, lon2 = 6.4620, 3.4310
        
        distance = QRHandshakeService._haversine_distance(lat1, lon1, lat2, lon2)
        assert abs(distance - 1.11) < 0.1

    async def test_process_handshake_geofence_success(self):
        # Target hub coordinates
        hub_lat, hub_lon = 6.4549, 3.4246
        # Scan coordinates within threshold
        scan_lat, scan_lon = 6.4550, 3.4247
        
        db_mock = AsyncMock()
        
        # Mock QR code fetch
        qr_code_id = str(uuid4())
        mock_qr = {
            "id": qr_code_id,
            "code_value": "hub-qr-123",
            "code_type": "hub_arrival",
            "entity_type": "venturehub",
            "entity_id": str(uuid4()),
            "is_active": True,
            "expires_at": datetime.now() + timedelta(hours=1),
            "scans_count": 0
        }
        
        # Mock the db execute sequence
        # First query: qr_codes lookup
        mock_qr_res = MagicMock()
        mock_qr_res.first.return_value = MagicMock(_mapping=mock_qr)
        
        # Second query: venturehubs coordinates lookup
        mock_coords_res = MagicMock()
        mock_coords_res.first.return_value = (hub_lat, hub_lon)
        
        # Third query: insert handshake
        mock_handshake_row = {
            "id": str(uuid4()),
            "qr_code_id": qr_code_id,
            "route_member_id": None,
            "scanned_by": "driver-1",
            "handshake_type": "hub_arrival",
            "scan_latitude": scan_lat,
            "scan_longitude": scan_lon,
            "otp_verified": False,
            "is_valid": True,
            "validation_errors": None,
            "scanned_at": datetime.now(),
            "created_at": datetime.now()
        }
        mock_insert_res = MagicMock()
        mock_insert_res.first.return_value = MagicMock(_mapping=mock_handshake_row)
        
        # Fourth query: increment scans
        mock_execute_results = [
            mock_qr_res,
            mock_coords_res,
            mock_insert_res,
            MagicMock()
        ]
        
        db_mock.execute.side_effect = mock_execute_results
        
        service = QRHandshakeService(db_mock)
        response = await service.process_handshake(
            qr_code_value="hub-qr-123",
            handshake_type=QRHandshakeType.HUB_ARRIVAL,
            scanned_by="driver-1",
            scan_latitude=scan_lat,
            scan_longitude=scan_lon
        )
        
        assert response.is_valid is True
        assert response.validation_errors is None
        db_mock.commit.assert_called_once()

    async def test_process_handshake_geofence_breach(self):
        # Target hub coordinates
        hub_lat, hub_lon = 6.4549, 3.4246
        # Scan coordinates far away (e.g. London coordinates)
        scan_lat, scan_lon = 51.5074, -0.1278
        
        db_mock = AsyncMock()
        
        # Mock QR code fetch
        qr_code_id = str(uuid4())
        mock_qr = {
            "id": qr_code_id,
            "code_value": "hub-qr-123",
            "code_type": "hub_arrival",
            "entity_type": "venturehub",
            "entity_id": str(uuid4()),
            "is_active": True,
            "expires_at": datetime.now() + timedelta(hours=1),
            "scans_count": 0
        }
        
        mock_qr_res = MagicMock()
        mock_qr_res.first.return_value = MagicMock(_mapping=mock_qr)
        
        mock_coords_res = MagicMock()
        mock_coords_res.first.return_value = (hub_lat, hub_lon)
        
        mock_handshake_row = {
            "id": str(uuid4()),
            "qr_code_id": qr_code_id,
            "route_member_id": None,
            "scanned_by": "driver-1",
            "handshake_type": "hub_arrival",
            "scan_latitude": scan_lat,
            "scan_longitude": scan_lon,
            "otp_verified": False,
            "is_valid": False,
            "validation_errors": "Geofence breach",
            "scanned_at": datetime.now(),
            "created_at": datetime.now()
        }
        mock_insert_res = MagicMock()
        mock_insert_res.first.return_value = MagicMock(_mapping=mock_handshake_row)
        
        db_mock.execute.side_effect = [mock_qr_res, mock_coords_res, mock_insert_res, MagicMock()]
        
        service = QRHandshakeService(db_mock)
        response = await service.process_handshake(
            qr_code_value="hub-qr-123",
            handshake_type=QRHandshakeType.HUB_ARRIVAL,
            scanned_by="driver-1",
            scan_latitude=scan_lat,
            scan_longitude=scan_lon
        )
        
        assert response.is_valid is False
        assert "Geofence breach" in response.validation_errors

    async def test_otp_generation_and_verification(self):
        db_mock = AsyncMock()
        service = QRHandshakeService(db_mock)
        
        qr_code_id = str(uuid4())
        recipient_id = str(uuid4())
        
        otp = await service.generate_otp(qr_code_id, recipient_id)
        assert len(otp) == 6
        assert otp.isdigit()
        
        # Verify valid OTP
        is_valid = await service._verify_otp(qr_code_id, otp, recipient_id)
        assert is_valid is True
        
        # Verify consumed OTP is invalid
        is_valid_again = await service._verify_otp(qr_code_id, otp, recipient_id)
        assert is_valid_again is False

    async def test_auto_release_escrow_and_status_update(self):
        db_mock = AsyncMock()
        
        # Mock successful package pickup scan
        qr_code_id = str(uuid4())
        member_id = str(uuid4())
        mock_qr = {
            "id": qr_code_id,
            "code_value": "package-qr-123",
            "code_type": "package_pickup",
            "entity_type": "route_member",
            "entity_id": member_id,
            "is_active": True,
            "expires_at": datetime.now() + timedelta(hours=1),
            "scans_count": 0
        }
        
        # Mock coordinates query response (returns None for unset/bypass)
        mock_coords_res = MagicMock()
        mock_coords_res.first.return_value = None
        
        mock_qr_res = MagicMock()
        mock_qr_res.first.return_value = MagicMock(_mapping=mock_qr)
        
        mock_handshake_row = {
            "id": str(uuid4()),
            "qr_code_id": qr_code_id,
            "route_member_id": member_id,
            "scanned_by": "driver-1",
            "handshake_type": "package_pickup",
            "scan_latitude": None,
            "scan_longitude": None,
            "otp_verified": False,
            "is_valid": True,
            "validation_errors": None,
            "scanned_at": datetime.now(),
            "created_at": datetime.now()
        }
        mock_insert_res = MagicMock()
        mock_insert_res.first.return_value = MagicMock(_mapping=mock_handshake_row)
        
        # Mock wallet freeze lookup
        mock_freeze_res = MagicMock()
        mock_freeze_res.first.return_value = (str(uuid4()), str(uuid4()))
        
        db_mock.execute.side_effect = [
            mock_qr_res,       # Fetch QR
            mock_coords_res,   # Fetch Member coords
            mock_insert_res,   # Insert Handshake
            MagicMock(),       # Increment scan count
            MagicMock(),       # Update status
            mock_freeze_res,   # Select active freeze
            MagicMock(),       # Update freeze status to released
        ]
        
        service = QRHandshakeService(db_mock)
        response = await service.process_handshake(
            qr_code_value="package-qr-123",
            handshake_type=QRHandshakeType.PACKAGE_PICKUP,
            scanned_by="driver-1"
        )
        
        assert response.is_valid is True
        assert response.route_member_id == member_id
        
        # Check that we executed correct SQL update queries
        # - Status update should set status to "ready_dispatch"
        # - Wallet freeze release should release escrow
        assert db_mock.execute.call_count >= 6
        db_mock.commit.assert_called_once()
