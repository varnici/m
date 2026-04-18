from datetime import datetime
from random import uniform
from uuid import uuid4

from geoalchemy2 import WKTElement

from app.infrastructure.database import db_session
from app.models.cluster import ClusterDelivery, ClusterParticipant


def _uuid() -> str:
    return str(uuid4())


def create_demo_cluster(latitude: float = 6.5200, longitude: float = 3.3850) -> None:
    with db_session() as db:
        cluster = ClusterDelivery(
            id=_uuid(),
            title="Cluster delivery simulation",
            description="Simulated cluster of 5 users sharing a consolidated pickup point.",
            status="forming",
            target_participants=5,
            participants_count=5,
            discount_percent=40,
            center_latitude=latitude,
            center_longitude=longitude,
            center_geom=WKTElement(f"POINT({longitude} {latitude})", srid=4326),
            created_at=datetime.utcnow(),
        )

        db.add(cluster)
        db.flush()

        for index in range(5):
            delta_lat = uniform(-0.007, 0.007)
            delta_lon = uniform(-0.009, 0.009)
            participant = ClusterParticipant(
                id=_uuid(),
                cluster_id=cluster.id,
                user_label=f"Neighbor {index + 1}",
                order_reference=f"VR-ORD-{1000 + index}",
                latitude=latitude + delta_lat,
                longitude=longitude + delta_lon,
                joined_at=datetime.utcnow(),
            )
            db.add(participant)

        db.commit()
        print(f"Simulated cluster created: {cluster.id}")


if __name__ == "__main__":
    create_demo_cluster()
