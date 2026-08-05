from __future__ import annotations

from datetime import datetime
from typing import Any, List, Optional

from pydantic import BaseModel, ConfigDict, field_validator


class NotificationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    type: str
    title: str
    message: str
    read: bool
    related_entity_type: Optional[str] = None
    related_entity_id: Optional[str] = None
    notification_metadata: Optional[dict[str, Any]] = None
    created_at: datetime

    @field_validator("id", "user_id", mode="before")
    @classmethod
    def _coerce_str(cls, v):
        return str(v) if v is not None else v


class NotificationListOut(BaseModel):
    items: List[NotificationOut]
    total: int
    unread_count: int


class RegisterDeviceRequest(BaseModel):
    push_token: str
    platform: str  # ios | android

    @field_validator("platform")
    @classmethod
    def _valid_platform(cls, v: str) -> str:
        if v not in ("ios", "android"):
            raise ValueError("platform must be 'ios' or 'android'")
        return v
