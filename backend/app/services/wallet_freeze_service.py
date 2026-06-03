"""
Wallet Freeze Service - Anti-leakage and escrow mechanism
Implements "No payment = No dispatch" and payment protection
"""

from datetime import datetime, timedelta
from typing import Optional, Tuple
from uuid import uuid4

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.logistics import WalletFreezeResponse, WalletFreezeStatus


class WalletFreezeService:
    """
    Wallet freeze and escrow service for payment protection.
    
    Key principle: "No payment = No dispatch"
    
    Operations:
    - Lock funds when retailer joins route
    - Release funds only upon QR handshake completion
    - Forfeit funds for failed deliveries
    - Implement escrow for payment security
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    # ========================================================================
    # CORE FREEZE OPERATIONS
    # ========================================================================

    async def freeze_payment(
        self,
        user_id: str,
        route_id: str,
        frozen_amount_kobo: int,
        freeze_reason: str = "logistics_route_participation",
        release_trigger: Optional[str] = "qr_handshake",
    ) -> WalletFreezeResponse:
        """
        Freeze payment when retailer joins a route.
        
        Security flow:
        1. Verify retailer has sufficient balance
        2. Lock funds in wallet freeze table
        3. Mark route member as "payment_locked"
        4. Set release trigger condition
        
        Args:
            user_id: Retailer user ID
            route_id: Route ID
            frozen_amount_kobo: Amount to freeze in kobo
            freeze_reason: Reason for freeze
            release_trigger: Condition for release
            
        Returns:
            WalletFreezeResponse with freeze details
        """
        # Step 1: Verify user has sufficient balance
        balance = await self._get_wallet_balance(user_id)
        
        if balance < frozen_amount_kobo:
            raise ValueError(
                f"Insufficient balance. Required: {frozen_amount_kobo} kobo, "
                f"Available: {balance} kobo"
            )

        # Step 2: Create freeze record
        freeze_id = str(uuid4())
        frozen_at = datetime.now()
        
        insert_query = text("""
            INSERT INTO wallet_freezes (
                id,
                user_id,
                route_id,
                frozen_amount_kobo,
                freeze_reason,
                release_trigger,
                status,
                frozen_at,
                created_at,
                updated_at
            ) VALUES (
                :id,
                :user_id,
                :route_id,
                :frozen_amount_kobo,
                :freeze_reason,
                :release_trigger,
                'active',
                :frozen_at,
                NOW(),
                NOW()
            )
        """)

        await self.db.execute(
            insert_query,
            {
                "id": freeze_id,
                "user_id": user_id,
                "route_id": route_id,
                "frozen_amount_kobo": frozen_amount_kobo,
                "freeze_reason": freeze_reason,
                "release_trigger": release_trigger,
                "frozen_at": frozen_at,
            },
        )
        await self.db.commit()

        # Step 3: Update route member status
        await self._update_route_member_status(
            route_id=route_id,
            user_id=user_id,
            status="payment_locked"
        )

        return WalletFreezeResponse(
            id=freeze_id,
            user_id=user_id,
            route_id=route_id,
            frozen_amount_kobo=frozen_amount_kobo,
            freeze_reason=freeze_reason,
            frozen_at=frozen_at,
            release_date=None,
            status=WalletFreezeStatus.ACTIVE,
            created_at=frozen_at,
            updated_at=frozen_at,
        )

    async def release_payment(
        self,
        freeze_id: str,
        trigger_reason: str,
    ) -> WalletFreezeResponse:
        """
        Release frozen payment after successful QR handshake.
        
        Args:
            freeze_id: Freeze record ID
            trigger_reason: Reason for release (e.g., "qr_handshake_completed")
            
        Returns:
            Updated WalletFreezeResponse
        """
        now = datetime.now()

        update_query = text("""
            UPDATE wallet_freezes
            SET 
                status = 'released',
                release_date = :release_date,
                updated_at = NOW()
            WHERE id = :freeze_id AND status = 'active'
            RETURNING *
        """)

        result = await self.db.execute(
            update_query,
            {"freeze_id": freeze_id, "release_date": now}
        )
        await self.db.commit()

        row = result.first()
        if not row:
            raise ValueError(f"Freeze record not found or already released: {freeze_id}")

        freeze_data = dict(row._mapping)

        return WalletFreezeResponse(
            id=freeze_data["id"],
            user_id=freeze_data["user_id"],
            route_id=freeze_data["route_id"],
            frozen_amount_kobo=freeze_data["frozen_amount_kobo"],
            freeze_reason=freeze_data["freeze_reason"],
            frozen_at=freeze_data["frozen_at"],
            release_date=freeze_data["release_date"],
            status=WalletFreezeStatus(freeze_data["status"]),
            created_at=freeze_data["created_at"],
            updated_at=freeze_data["updated_at"],
        )

    async def forfeit_payment(
        self,
        freeze_id: str,
        forfeit_reason: str,
    ) -> WalletFreezeResponse:
        """
        Forfeit frozen payment (penalty for failed delivery/non-compliance).
        
        Args:
            freeze_id: Freeze record ID
            forfeit_reason: Reason for forfeiture
            
        Returns:
            Updated WalletFreezeResponse
        """
        now = datetime.now()

        update_query = text("""
            UPDATE wallet_freezes
            SET 
                status = 'forfeited',
                release_date = :release_date,
                updated_at = NOW()
            WHERE id = :freeze_id AND status = 'active'
            RETURNING *
        """)

        result = await self.db.execute(
            update_query,
            {"freeze_id": freeze_id, "release_date": now}
        )
        await self.db.commit()

        row = result.first()
        if not row:
            raise ValueError(f"Freeze record not found: {freeze_id}")

        freeze_data = dict(row._mapping)

        return WalletFreezeResponse(
            id=freeze_data["id"],
            user_id=freeze_data["user_id"],
            route_id=freeze_data["route_id"],
            frozen_amount_kobo=freeze_data["frozen_amount_kobo"],
            freeze_reason=freeze_data["freeze_reason"],
            frozen_at=freeze_data["frozen_at"],
            release_date=freeze_data["release_date"],
            status=WalletFreezeStatus.FORFEITED,
            created_at=freeze_data["created_at"],
            updated_at=freeze_data["updated_at"],
        )

    # ========================================================================
    # VALIDATION & CHECKS
    # ========================================================================

    async def can_dispatch_route(self, route_id: str) -> Tuple[bool, str]:
        """
        Check if all route members have active payment freezes.
        Route can only dispatch if "No payment = No dispatch" rule is satisfied.
        
        Args:
            route_id: Route ID
            
        Returns:
            Tuple[bool, str]: (can_dispatch, error_message)
        """
        query = text("""
            SELECT 
                COUNT(DISTINCT rm.id) as total_members,
                COUNT(DISTINCT wf.id) as members_with_freeze
            FROM route_members rm
            LEFT JOIN wallet_freezes wf ON 
                wf.user_id = rm.retailer_id 
                AND wf.route_id = rm.route_id 
                AND wf.status = 'active'
            WHERE rm.route_id = :route_id
        """)

        result = await self.db.execute(query, {"route_id": route_id})
        row = result.first()

        if not row:
            return False, "Route not found"

        total_members = row[0]
        members_with_freeze = row[1]

        if total_members == 0:
            return False, "Route has no members"

        if members_with_freeze < total_members:
            missing = total_members - members_with_freeze
            return False, f"{missing} members do not have payment frozen"

        return True, "All members have frozen payments - route can dispatch"

    async def get_freeze_status(self, freeze_id: str) -> WalletFreezeResponse:
        """Get current freeze status"""
        query = text("""
            SELECT * FROM wallet_freezes WHERE id = :freeze_id
        """)

        result = await self.db.execute(query, {"freeze_id": freeze_id})
        row = result.first()

        if not row:
            raise ValueError(f"Freeze record not found: {freeze_id}")

        freeze_data = dict(row._mapping)

        return WalletFreezeResponse(
            id=freeze_data["id"],
            user_id=freeze_data["user_id"],
            route_id=freeze_data["route_id"],
            frozen_amount_kobo=freeze_data["frozen_amount_kobo"],
            freeze_reason=freeze_data["freeze_reason"],
            frozen_at=freeze_data["frozen_at"],
            release_date=freeze_data.get("release_date"),
            status=WalletFreezeStatus(freeze_data["status"]),
            created_at=freeze_data["created_at"],
            updated_at=freeze_data["updated_at"],
        )

    async def get_user_frozen_amount(self, user_id: str) -> int:
        """Get total amount currently frozen for a user"""
        query = text("""
            SELECT COALESCE(SUM(frozen_amount_kobo), 0)
            FROM wallet_freezes
            WHERE user_id = :user_id AND status = 'active'
        """)

        result = await self.db.execute(query, {"user_id": user_id})
        row = result.first()

        return int(row[0]) if row else 0

    # ========================================================================
    # DATABASE HELPERS
    # ========================================================================

    async def _get_wallet_balance(self, user_id: str) -> int:
        """
        Get user's current wallet balance.
        Should connect to payment/wallet service in production.
        """
        query = text("""
            SELECT COALESCE(wallet_balance_kobo, 0)
            FROM profiles
            WHERE id = :user_id
        """)

        result = await self.db.execute(query, {"user_id": user_id})
        row = result.first()

        return int(row[0]) if row else 0

    async def _update_route_member_status(
        self,
        route_id: str,
        user_id: str,
        status: str,
    ) -> None:
        """Update route member status"""
        update_query = text("""
            UPDATE route_members
            SET status = :status, updated_at = NOW()
            WHERE route_id = :route_id AND retailer_id = :user_id
        """)

        await self.db.execute(
            update_query,
            {"route_id": route_id, "user_id": user_id, "status": status}
        )
        await self.db.commit()

    # ========================================================================
    # AUTO-RELEASE LOGIC
    # ========================================================================

    async def auto_release_expired_freezes(self, days_threshold: int = 7) -> int:
        """
        Auto-release freezes that expired without completion.
        After N days without successful handshake, refund payment.
        
        Args:
            days_threshold: Number of days before auto-release
            
        Returns:
            Number of freezes auto-released
        """
        cutoff_date = datetime.now() - timedelta(days=days_threshold)

        update_query = text("""
            UPDATE wallet_freezes
            SET 
                status = 'refunded',
                release_date = NOW(),
                updated_at = NOW()
            WHERE 
                status = 'active'
                AND frozen_at < :cutoff_date
                AND release_trigger != 'manual_override'
            RETURNING id
        """)

        result = await self.db.execute(update_query, {"cutoff_date": cutoff_date})
        await self.db.commit()

        return len(result.fetchall())
