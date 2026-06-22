from __future__ import annotations

from typing import cast
from fastapi import APIRouter, HTTPException, Query, Header
from geoalchemy2 import WKTElement
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.infrastructure.database import db_session
from app.models.cluster import ClusterDelivery, ClusterParticipant
from app.models.wallet import Wallet
from app.models.user import User
from app.schemas.cluster_schemas import ClusterDeliveryOut

router = APIRouter()


def _build_cluster_payload(lat: float, lon: float) -> ClusterDelivery:
    cluster = ClusterDelivery(
        title="Lekki Phase 1 Consolidator",
        description="A neighbourhood consolidation point for cheaper shared delivery and lower unit cost.",
        status="forming",
        target_participants=5,
        participants_count=4,
        discount_percent=40,
        center_latitude=lat,
        center_longitude=lon,
        center_geom=WKTElement(f"POINT({lon} {lat})", srid=4326),
    )
    # Match the mobile UI members list exactly for pixel-faithful alignment
    participants_config = [
        {"label": "Lekki Phase 1 (You)", "ref": "RT-ABC12345", "vu": 12.0, "share": 3500000, "lat_offset": 0.0, "lon_offset": 0.0, "status": "pending"},
        {"label": "Victoria Island Store", "ref": "VR-ORD-3810", "vu": 8.0, "share": 2500000, "lat_offset": -0.002, "lon_offset": 0.003, "status": "pending"},
        {"label": "Ikoyi Mart", "ref": "VR-ORD-7742", "vu": 10.0, "share": 3000000, "lat_offset": 0.003, "lon_offset": -0.002, "status": "pending"},
        {"label": "Ajah Hub", "ref": "VR-ORD-1194", "vu": 10.0, "share": 3000000, "lat_offset": -0.004, "lon_offset": 0.004, "status": "pending"},
    ]
    cluster.participants = [
        ClusterParticipant(
            cluster=cluster,
            user_label=cfg["label"],
            order_reference=cfg["ref"],
            latitude=lat + cfg["lat_offset"],
            longitude=lon + cfg["lon_offset"],
            volume_units=cfg["vu"],
            share_kobo=cfg["share"],
            status=cfg["status"],
        )
        for cfg in participants_config
    ]
    return cluster


@router.get("/active", response_model=ClusterDeliveryOut)
def get_active_cluster():
    """
    Get the current active forming/in-transit cluster delivery.
    If none exists in the database, automatically bootstrap a new Lekki Phase 1 cluster delivery.
    """
    with db_session() as db:
        q = (
            select(ClusterDelivery)
            .options(selectinload(ClusterDelivery.participants))
            .where(ClusterDelivery.status.in_(["forming", "in_transit"]))
            .order_by(ClusterDelivery.created_at.desc())
        )
        cluster = db.execute(q).scalars().first()

        if not cluster:
            # Bootstrap a realistic, highly polished development cluster
            cluster = _build_cluster_payload(6.4281, 3.4219)
            db.add(cluster)
            for participant in cluster.participants:
                db.add(participant)
            db.commit()
            db.refresh(cluster)

        return cluster


@router.post("/{cluster_id}/lock-payment", response_model=ClusterDeliveryOut)
def lock_payment(cluster_id: str, x_user_id: str = Header(..., alias="X-User-Id")):
    """
    Confirm payment lock and escrow deposit for the current user.
    Simulates live bank/wallet ledger debit.
    """
    with db_session() as db:
        cluster = db.execute(
            select(ClusterDelivery).options(selectinload(ClusterDelivery.participants)).where(ClusterDelivery.id == cluster_id)
        ).scalars().first()
        if not cluster:
            raise HTTPException(status_code=404, detail="Cluster not found")

        # Find the active user participant ("Lekki Phase 1 (You)")
        user_participant = None
        for p in cluster.participants:
            if "Lekki Phase 1" in p.user_label or p.user_label.endswith("(You)"):
                user_participant = p
                break

        if not user_participant:
            raise HTTPException(status_code=404, detail="User participant record not found in cluster")

        if user_participant.status == "confirmed":
            return cluster

        # Perform live escrow wallet deduction
        wallet = db.execute(
            select(Wallet).where(Wallet.user_id == x_user_id)
        ).scalar_one_or_none()

        if wallet:
            if wallet.balance_kobo < user_participant.share_kobo:
                raise HTTPException(status_code=400, detail="Insufficient wallet balance to lock delivery escrow")
            wallet.balance_kobo -= user_participant.share_kobo
            # Log standard transactional debit
            from app.models.wallet import WalletTransaction
            db.add(
                WalletTransaction(
                    wallet_id=wallet.id,
                    amount_kobo=-user_participant.share_kobo,
                    type="withdrawal",
                    description=f"Escrow lock for route group buy ({user_participant.order_reference})",
                )
            )

        user_participant.status = "confirmed"
        db.commit()
        db.refresh(cluster)
        return cluster


@router.post("/{cluster_id}/dispatch", response_model=ClusterDeliveryOut)
def dispatch_cluster(cluster_id: str):
    """
    Dispatch route cluster to driver, changing status to in_transit.
    """
    with db_session() as db:
        cluster = db.execute(
            select(ClusterDelivery).options(selectinload(ClusterDelivery.participants)).where(ClusterDelivery.id == cluster_id)
        ).scalars().first()
        if not cluster:
            raise HTTPException(status_code=404, detail="Cluster not found")

        # Confirm all participants to allow dispatch
        for p in cluster.participants:
            p.status = "confirmed"

        cluster.status = "in_transit"
        db.commit()
        db.refresh(cluster)
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
            .options(selectinload(ClusterDelivery.participants))
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
