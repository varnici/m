from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.infrastructure.database import get_db
from app.infrastructure.auth import get_current_user_id
from app.models.notification import DeviceToken
from app.schemas.notification_schemas import (
    NotificationListOut,
    NotificationOut,
    RegisterDeviceRequest,
)
from app.services.notification_service import NotificationService

router = APIRouter()


@router.get("", response_model=NotificationListOut)
def list_notifications(
    unread_only: bool = Query(False),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    service = NotificationService(db)
    items, total = service.list_for_user(user_id, unread_only=unread_only, skip=skip, limit=limit)
    return NotificationListOut(
        items=[NotificationOut.model_validate(n) for n in items],
        total=total,
        unread_count=service.unread_count(user_id),
    )


@router.patch("/{notification_id}/read", response_model=NotificationOut)
def mark_notification_read(
    notification_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    service = NotificationService(db)
    notification = service.mark_read(user_id, notification_id)
    return NotificationOut.model_validate(notification)


@router.post("/read-all")
def mark_all_read(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    service = NotificationService(db)
    count = service.mark_all_read(user_id)
    return {"marked_read": count}


@router.post("/register-device", status_code=201)
def register_device(
    payload: RegisterDeviceRequest,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """
    Store an Expo push token. Scaffolding only — actual remote delivery
    (APNs/FCM via Expo's push service) needs push credentials not yet
    configured on this server; notifications remain in-app-only until then.
    """
    existing = db.query(DeviceToken).filter(DeviceToken.push_token == payload.push_token).one_or_none()
    if existing:
        existing.user_id = user_id
        existing.platform = payload.platform
    else:
        db.add(DeviceToken(user_id=user_id, push_token=payload.push_token, platform=payload.platform))
    db.commit()
    return {"registered": True}
