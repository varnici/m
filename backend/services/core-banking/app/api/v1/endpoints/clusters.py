from __future__ import annotations

from random import choice, randint, uniform
from typing import cast

from fastapi import APIRouter, HTTPException, Query
from geoalchemy2 import WKTElement
from sqlalchemy import func, select

from app.infrastructure.database import db_session
from app.models.cluster import ClusterDelivery, ClusterParticipant
from app.schemas.cluster_schemas import ClusterDeliveryOut

router = APIRouter()


def _mock_user_label(index: int) -> str:
    return choice(["Ngozi", "Adebayo", "Fatima", "Damilola", "Emeka"]) + f" #{index + 1}"


def _build_cluster_payload(lat: float, lon: float) -> ClusterDelivery:
    cluster = ClusterDelivery(
        title="Community Cluster Pickup",
        description="A neighbourhood consolidation point for cheaper shared delivery and lower unit cost.",
        status="forming",
        target_participants=5,
        participants_count=3,
        discount_percent=40,
        center_latitude=lat,
        center_longitude=lon,
        center_geom=WKTElement(f"POINT({lon} {lat})", srid=4326),
    )
    cluster.participants = [
        ClusterParticipant(
            cluster=cluster,
            user_label=_mock_user_label(i),
            order_reference=f"VR-ORD-{randint(1000, 9999)}",
            latitude=lat + uniform(-0.004, 0.004),
            longitude=lon + uniform(-0.004, 0.004),
        )
        for i in range(3)
    ]
    return cluster


@router.get("/nearby", response_model=list[ClusterDeliveryOut])
def list_nearby_clusters(
    latitude: float = Query(..., description="Latitude of the user location"),
    longitude: float = Query(..., description="Longitude of the user location"),
    radius_meters: int = Query(1000, description="Search radius in meters"),
):
    with db_session() as db:
        q = (
            select(ClusterDelivery)
            .where(
                func.ST_DWithin(
                    ClusterDelivery.center_geom,
                    func.ST_SetSRID(func.ST_MakePoint(longitude, latitude), 4326),
                    radius_meters,
                )
            )
            .order_by(ClusterDelivery.created_at.desc())
        )
        deliveries = list(db.execute(q).scalars().all())
        return deliveries


@router.get("/simulate", response_model=ClusterDeliveryOut)
def simulate_cluster_session(
    latitude: float = Query(6.5200, description="Center latitude for the simulated cluster"),
    longitude: float = Query(3.3850, description="Center longitude for the simulated cluster"),
):
    with db_session() as db:
        cluster = _build_cluster_payload(latitude, longitude)
        db.add(cluster)
        for participant in cluster.participants:
            db.add(participant)
        db.flush()
        db.refresh(cluster)
        return cast(ClusterDeliveryOut, cluster)
