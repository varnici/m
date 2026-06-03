"""
VentureRoot — Geofence Service

Enforces Lagos bike ban zones and any future city-level restrictions.
Zones are stored in DB and can be updated without app redeployment (< 1 hour SLA).
"""

from dataclasses import dataclass
from typing import Optional
import json


@dataclass
class BanZone:
    name: str
    city: str
    min_lat: float
    max_lat: float
    min_lng: float
    max_lng: float
    banned_tiers: list[str]   # which vehicle tiers are banned
    effective_from: str       # ISO date
    is_active: bool


# ── Hardcoded seed zones (production loads from DB + CDN cache) ───────────────

SEED_BAN_ZONES: list[BanZone] = [
    BanZone(
        name="Victoria Island",
        city="Lagos",
        min_lat=6.4181, max_lat=6.4410,
        min_lng=3.3851, max_lng=3.4351,
        banned_tiers=["dispatch_bike"],
        effective_from="2020-01-14",
        is_active=True,
    ),
    BanZone(
        name="Ikoyi",
        city="Lagos",
        min_lat=6.4410, max_lat=6.4650,
        min_lng=3.3900, max_lng=3.4400,
        banned_tiers=["dispatch_bike"],
        effective_from="2020-01-14",
        is_active=True,
    ),
    BanZone(
        name="Lekki Phase 1 (up to toll gate)",
        city="Lagos",
        min_lat=6.4400, max_lat=6.4600,
        min_lng=3.4690, max_lng=3.5200,
        banned_tiers=["dispatch_bike"],
        effective_from="2020-01-14",
        is_active=True,
    ),
]


class GeofenceService:
    def __init__(self):
        # In production: load from database + Redis cache (TTL 1h)
        self._zones: list[BanZone] = list(SEED_BAN_ZONES)

    def is_in_bike_ban_zone(self, lat: float, lng: float) -> bool:
        """Returns True if the coordinate is inside any active bike ban zone."""
        for zone in self._zones:
            if not zone.is_active:
                continue
            if "dispatch_bike" not in zone.banned_tiers:
                continue
            if zone.min_lat <= lat <= zone.max_lat and zone.min_lng <= lng <= zone.max_lng:
                return True
        return False

    def get_banned_tiers(self, lat: float, lng: float) -> list[str]:
        """Returns all vehicle tiers banned at this coordinate."""
        banned: set[str] = set()
        for zone in self._zones:
            if not zone.is_active:
                continue
            if zone.min_lat <= lat <= zone.max_lat and zone.min_lng <= lng <= zone.max_lng:
                banned.update(zone.banned_tiers)
        return list(banned)

    def get_zone_name(self, lat: float, lng: float) -> Optional[str]:
        for zone in self._zones:
            if not zone.is_active:
                continue
            if zone.min_lat <= lat <= zone.max_lat and zone.min_lng <= lng <= zone.max_lng:
                return zone.name
        return None

    def add_zone(self, zone: BanZone) -> None:
        """
        Runtime zone update — called when a new ban announcement is processed.
        Hotloaded without app redeployment.
        """
        # Remove existing zone with same name if exists
        self._zones = [z for z in self._zones if z.name != zone.name]
        self._zones.append(zone)

    def deactivate_zone(self, zone_name: str) -> bool:
        for zone in self._zones:
            if zone.name == zone_name:
                zone.is_active = False
                return True
        return False

    def list_active_zones(self) -> list[BanZone]:
        return [z for z in self._zones if z.is_active]