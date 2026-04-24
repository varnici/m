"""
Inventory reservation cleanup task.
Finds and releases expired stock reservations.
"""

from __future__ import annotations

import asyncio
import logging
import os

from app.infrastructure.database import db_session
from app.services.inventory_service_v2 import InventoryServiceV2

logger = logging.getLogger(__name__)


async def run_inventory_reservation_cleanup(owner_id: str | None = None) -> int:
    """Run the cleanup process for expired reservations."""
    with db_session() as session:
        # Note: We pass owner_id=None to cleanup across all owners if not specified,
        # but the service currently requires an owner_id for most operations.
        # However, cleanup_expired_reservations queries ALL owners if self.owner_id is None.
        service = InventoryServiceV2(session, owner_id=owner_id)
        count = await service.cleanup_expired_reservations()
        return count


if __name__ == "__main__":
    owner = os.getenv("CLEANUP_OWNER_ID") or None
    loop = asyncio.get_event_loop()
    count = loop.run_until_complete(run_inventory_reservation_cleanup(owner_id=owner))
    print(f"Inventory reservation cleanup complete: released {count} reservations.")
