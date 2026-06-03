from __future__ import annotations

import uuid
from datetime import datetime

from geoalchemy2 import Geometry
from geoalchemy2.elements import WKTElement
from sqlalchemy import DateTime, Float, Integer, String, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import TypeDecorator

from app.infrastructure.database import Base


def _id() -> str:
    return str(uuid.uuid4())


class PointGeometry(TypeDecorator):
    """Use PostGIS geometry in production, plain WKT text in SQLite tests."""

    impl = Text
    cache_ok = True

    def __init__(self, geometry_type: str = "POINT", srid: int = 4326):
        super().__init__()
        self.geometry_type = geometry_type
        self.srid = srid
        self._geometry = Geometry(geometry_type=geometry_type, srid=srid)

    def load_dialect_impl(self, dialect):
        if dialect.name == "sqlite":
            return dialect.type_descriptor(Text())
        return dialect.type_descriptor(self._geometry)

    def process_bind_param(self, value, dialect):
        if dialect.name != "sqlite" or value is None:
            return value
        if isinstance(value, WKTElement):
            if value.srid and value.srid > 0:
                return f"SRID={value.srid};{value.data}"
            return value.data
        return str(value)


class ClusterDelivery(Base):
    __tablename__ = "cluster_deliveries"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_id)
    title: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String, nullable=False, default="forming")
    target_participants: Mapped[int] = mapped_column(Integer, nullable=False, default=5)
    participants_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    discount_percent: Mapped[int] = mapped_column(Integer, nullable=False, default=40)
    center_latitude: Mapped[float] = mapped_column(Float, nullable=False)
    center_longitude: Mapped[float] = mapped_column(Float, nullable=False)
    center_geom: Mapped[str] = mapped_column(PointGeometry(geometry_type="POINT", srid=4326), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

    participants = relationship("ClusterParticipant", back_populates="cluster")


class ClusterParticipant(Base):
    __tablename__ = "cluster_participants"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_id)
    cluster_id: Mapped[str] = mapped_column(String, ForeignKey("cluster_deliveries.id"), nullable=False)
    user_label: Mapped[str] = mapped_column(String, nullable=False)
    order_reference: Mapped[str] = mapped_column(String, nullable=False)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    status: Mapped[str] = mapped_column(String, nullable=False, default="pending")
    share_kobo: Mapped[int] = mapped_column(Integer, nullable=False, default=3000000)
    volume_units: Mapped[float] = mapped_column(Float, nullable=False, default=10.0)
    joined_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

    cluster = relationship("ClusterDelivery", back_populates="participants")
