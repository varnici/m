"""
Inventory outbox processing service.
Provides list/process/replay operations for durable domain events.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
import logging
from typing import List, Optional

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.inventory_domain import DomainOutboxMessageModel

logger = logging.getLogger(__name__)


@dataclass
class OutboxProcessStats:
    attempted: int = 0
    published: int = 0
    dead_lettered: int = 0


class InventoryOutboxService:
    """Manage outbox delivery lifecycle for inventory domain events."""

    def __init__(self, db: Session, owner_id: Optional[str] = None):
        self.db = db
        self.owner_id = owner_id

    def list_messages(
        self,
        status: Optional[str] = None,
        topic: Optional[str] = None,
        limit: int = 100,
    ) -> List[DomainOutboxMessageModel]:
        query = self.db.query(DomainOutboxMessageModel)
        if self.owner_id:
            query = query.filter(DomainOutboxMessageModel.owner_id == self.owner_id)
        if status:
            query = query.filter(DomainOutboxMessageModel.status == status)
        if topic:
            query = query.filter(DomainOutboxMessageModel.topic == topic)
        return query.order_by(DomainOutboxMessageModel.created_at.desc()).limit(limit).all()

    def process_pending_messages(self, batch_size: Optional[int] = None) -> OutboxProcessStats:
        size = batch_size or settings.inventory_outbox_batch_size
        query = self.db.query(DomainOutboxMessageModel).filter(
            DomainOutboxMessageModel.status == "pending"
        )
        if self.owner_id:
            query = query.filter(DomainOutboxMessageModel.owner_id == self.owner_id)

        pending_messages = (
            query.order_by(DomainOutboxMessageModel.created_at.asc())
            .limit(size)
            .all()
        )

        stats = OutboxProcessStats()
        for message in pending_messages:
            stats.attempted += 1
            try:
                self._publish_message(message)
                message.status = "published"
                message.published_at = datetime.utcnow()
                message.error_message = None
                stats.published += 1
            except Exception as exc:
                message.status = "dead_letter"
                message.error_message = str(exc)[:2000]
                stats.dead_lettered += 1
                logger.exception(
                    "Outbox publish failed for message_id=%s owner_id=%s event_type=%s",
                    message.id,
                    message.owner_id,
                    message.event_type,
                )

        self.db.commit()
        return stats

    def replay_dead_letters(self, message_id: Optional[str] = None, limit: int = 100) -> int:
        query = self.db.query(DomainOutboxMessageModel).filter(
            DomainOutboxMessageModel.status == "dead_letter"
        )
        if self.owner_id:
            query = query.filter(DomainOutboxMessageModel.owner_id == self.owner_id)
        if message_id:
            query = query.filter(DomainOutboxMessageModel.id == message_id)

        dead_letters = (
            query.order_by(DomainOutboxMessageModel.created_at.asc())
            .limit(limit)
            .all()
        )

        for message in dead_letters:
            message.status = "pending"
            message.error_message = None
            message.published_at = None

        self.db.commit()
        return len(dead_letters)

    def _publish_message(self, message: DomainOutboxMessageModel) -> None:
        mode = settings.inventory_outbox_publisher.lower()

        if mode == "noop":
            return

        if mode == "log":
            logger.info(
                "inventory_outbox_published id=%s topic=%s event_type=%s owner_id=%s command_id=%s payload=%s",
                message.id,
                message.topic,
                message.event_type,
                message.owner_id,
                message.command_id,
                message.payload,
            )
            return

        raise ValueError(f"Unsupported inventory outbox publisher mode: {mode}")
