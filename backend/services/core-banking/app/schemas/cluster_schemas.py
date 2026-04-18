from __future__ import annotations

from datetime import datetime
from pydantic import BaseModel, ConfigDict


class ClusterParticipantOut(BaseModel):
    id: str
    user_label: str
    order_reference: str
    latitude: float
    longitude: float
    joined_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ClusterDeliveryOut(BaseModel):
    id: str
    title: str
    description: str
    status: str
    target_participants: int
    participants_count: int
    discount_percent: int
    center_latitude: float
    center_longitude: float
    created_at: datetime
    participants: list[ClusterParticipantOut]

    model_config = ConfigDict(from_attributes=True)
