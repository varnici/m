"""Cluster delivery schemas."""
from __future__ import annotations

from datetime import datetime
from pydantic import BaseModel, Field
from typing import List, Optional


class ClusterParticipantOut(BaseModel):
    """Response schema for cluster participant."""
    id: str
    cluster_id: str
    user_label: str
    order_reference: str
    latitude: float
    longitude: float
    status: str
    share_kobo: int
    volume_units: float
    joined_at: datetime

    class Config:
        from_attributes = True


class ClusterDeliveryOut(BaseModel):
    """Response schema for cluster delivery."""
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
    participants: List[ClusterParticipantOut] = []

    class Config:
        from_attributes = True
