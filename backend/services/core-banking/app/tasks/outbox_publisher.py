"""
Inventory outbox publisher task.
Can be called by scheduler/cron to drain pending outbox messages.
"""

from __future__ import annotations

import os

from app.core.config import settings
from app.infrastructure.database import db_session
from app.services.inventory_outbox_service import InventoryOutboxService


def run_inventory_outbox_publisher(owner_id: str | None = None, batch_size: int | None = None) -> dict[str, int]:
    with db_session() as session:
        service = InventoryOutboxService(session, owner_id=owner_id)
        stats = service.process_pending_messages(batch_size=batch_size)
        return {
            "attempted": stats.attempted,
            "published": stats.published,
            "dead_lettered": stats.dead_lettered,
        }


if __name__ == "__main__":
    owner = os.getenv("OUTBOX_OWNER_ID") or None
    stats = run_inventory_outbox_publisher(
        owner_id=owner,
        batch_size=settings.inventory_outbox_batch_size,
    )
    print(
        "inventory outbox publisher run complete: "
        f"attempted={stats['attempted']} published={stats['published']} dead_lettered={stats['dead_lettered']}"
    )
