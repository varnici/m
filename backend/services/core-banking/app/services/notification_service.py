from __future__ import annotations

from typing import Any, Optional

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.notification import Notification


class NotificationService:
    """
    Thin CRUD layer over `notifications`. `create()` is called internally by
    other services (order creation, fund-transfer settlement, loan status
    changes, etc.) — it is not exposed as a public write endpoint, since a
    notification's sender is always the system, never the recipient.
    """

    def __init__(self, db: Session):
        self.db = db

    def create(
        self,
        user_id: str,
        type: str,
        title: str,
        message: str,
        related_entity_type: Optional[str] = None,
        related_entity_id: Optional[str] = None,
        metadata: Optional[dict[str, Any]] = None,
    ) -> Notification:
        notification = Notification(
            user_id=user_id,
            type=type,
            title=title,
            message=message,
            related_entity_type=related_entity_type,
            related_entity_id=related_entity_id,
            notification_metadata=metadata,
        )
        self.db.add(notification)
        self.db.commit()
        self.db.refresh(notification)
        return notification

    def list_for_user(
        self,
        user_id: str,
        unread_only: bool = False,
        skip: int = 0,
        limit: int = 50,
    ) -> tuple[list[Notification], int]:
        query = select(Notification).where(Notification.user_id == user_id)
        count_query = select(func.count(Notification.id)).where(Notification.user_id == user_id)
        if unread_only:
            query = query.where(Notification.read == False)  # noqa: E712
            count_query = count_query.where(Notification.read == False)  # noqa: E712

        total = self.db.execute(count_query).scalar() or 0
        rows = (
            self.db.execute(
                query.order_by(Notification.created_at.desc()).offset(skip).limit(limit)
            )
            .scalars()
            .all()
        )
        return list(rows), total

    def mark_read(self, user_id: str, notification_id: str) -> Notification:
        notification = self.db.execute(
            select(Notification).where(
                Notification.id == notification_id,
                Notification.user_id == user_id,
            )
        ).scalar_one_or_none()
        if notification is None:
            raise HTTPException(status_code=404, detail="Notification not found")
        notification.read = True
        self.db.commit()
        self.db.refresh(notification)
        return notification

    def mark_all_read(self, user_id: str) -> int:
        rows = (
            self.db.execute(
                select(Notification).where(
                    Notification.user_id == user_id,
                    Notification.read == False,  # noqa: E712
                )
            )
            .scalars()
            .all()
        )
        for row in rows:
            row.read = True
        self.db.commit()
        return len(rows)

    def unread_count(self, user_id: str) -> int:
        return (
            self.db.execute(
                select(func.count(Notification.id)).where(
                    Notification.user_id == user_id,
                    Notification.read == False,  # noqa: E712
                )
            ).scalar()
            or 0
        )
