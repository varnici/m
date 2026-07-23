"""
Clustering Service - Geospatial grouping of retailers into logistics routes
Implements the "Route Joiner" - groups retailers within 2km radius with shared manufacturer source
"""

from typing import List, Optional
from decimal import Decimal
from datetime import datetime
from uuid import uuid4

import numpy as np
from sklearn.neighbors import BallTree
from sqlalchemy import text, select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.logistics import (
    LogisticsRequestResponse,
    LogisticsRouteResponse,
    RouteMemberResponse,
    ClusteringResult,
    RouteWithMembersResponse,
)


class ClusterService:
    """
    Geospatial clustering service for creating logistics routes.
    
    Core functionality:
    - Groups retailers based on 2km GPS radius
    - Calculates Fill-to-Save progress bar (truck utilization)
    - Designates lead retailer based on SalesVelocityScore
    - Implements Medallion Architecture (Bronze→Silver→Gold)
    """

    EARTH_RADIUS_KM = 6371.0

    def __init__(self, db: AsyncSession):
        self.db = db

    # ========================================================================
    # CORE CLUSTERING
    # ========================================================================

    async def cluster_requests_into_route(
        self,
        manufacturer_id: str,
        radius_km: Decimal = 2.0,
        max_retailers_per_route: int = 50,
        truck_capacity_vu: Decimal = 100.0,
        fixed_trip_cost_kobo: int = 50000,
        venturehub_id: Optional[str] = None,
    ) -> ClusteringResult:
        """
        Main clustering algorithm:
        1. Fetch all pending requests from manufacturer
        2. Group by geospatial proximity (2km radius)
        3. Calculate volumetric units per member
        4. Calculate individual cost shares
        5. Designate lead retailer
        6. Create route and members
        """

        # Step 1: Fetch all pending logistics requests
        pending_requests = await self._fetch_pending_requests(manufacturer_id)

        if not pending_requests:
            raise ValueError(f"No pending requests for manufacturer {manufacturer_id}")

        # Step 2: Perform geospatial clustering
        clusters = await self._perform_geospatial_clustering(
            pending_requests, radius_km, max_retailers_per_route
        )

        # Use the first cluster (or largest cluster)
        if not clusters:
            raise ValueError("No valid clusters could be formed")

        best_cluster = max(clusters, key=lambda c: len(c))

        # Step 3: Calculate route metrics
        total_vu = sum(req["volumetric_units"] for req in best_cluster)
        
        # Validate truck capacity
        if total_vu > truck_capacity_vu:
            raise ValueError(
                f"Total VU ({total_vu}) exceeds truck capacity ({truck_capacity_vu})"
            )

        fill_percentage = (total_vu / truck_capacity_vu) * 100

        # Step 4: Designate lead retailer (highest SalesVelocityScore)
        lead_retailer_id = await self._get_lead_retailer(
            [req["retailer_id"] for req in best_cluster]
        )

        # Step 5: Create route in Silver layer
        route_id = await self._create_route(
            manufacturer_id=manufacturer_id,
            venturehub_id=venturehub_id,
            route_type="distribution",
            truck_capacity_vu=truck_capacity_vu,
            fixed_trip_cost_kobo=fixed_trip_cost_kobo,
            lead_retailer_id=lead_retailer_id,
            total_vu=total_vu,
            fill_percentage=fill_percentage,
        )

        # Step 6: Create route members with pricing
        member_responses = []
        for i, request in enumerate(best_cluster):
            member_response = await self._create_route_member(
                route_id=route_id,
                logistics_request=request,
                fixed_trip_cost_kobo=fixed_trip_cost_kobo,
                total_vu=total_vu,
                stop_sequence=i + 1,
            )
            member_responses.append(member_response)

        # Step 7: Get route number
        route_number = await self._get_route_number(route_id)

        return ClusteringResult(
            route_id=route_id,
            route_number=route_number,
            members_count=len(best_cluster),
            total_vu=total_vu,
            fill_percentage=Decimal(str(fill_percentage)),
            lead_retailer_id=lead_retailer_id,
            total_cost_kobo=fixed_trip_cost_kobo + sum(
                int(m.handling_fee_kobo) for m in member_responses
            ),
            avg_cost_per_retailer_kobo=int(
                (fixed_trip_cost_kobo + sum(int(m.handling_fee_kobo) for m in member_responses))
                / len(best_cluster)
            ),
        )

    # ========================================================================
    # GEOSPATIAL UTILITIES - BallTree (haversine metric)
    # ========================================================================

    async def _perform_geospatial_clustering(
        self,
        requests: List[dict],
        radius_km: Decimal,
        max_retailers_per_route: int,
    ) -> List[List[dict]]:
        """
        Cluster retailers by geospatial proximity.

        Algorithm:
        1. Build a BallTree spatial index over all valid coordinates (O(n log n))
        2. Greedily pick the highest-priority unclustered request as a seed
        3. Query the tree for every unclustered point within radius_km of the
           seed in a single O(log n) call, then cap the cluster size
        4. Repeat until every request is clustered

        NOTE: A prior hand-rolled implementation used a fixed-size grid hash
        (~1.2km cells, hardcoded regardless of radius_km) and only scanned the
        3x3 neighboring cells. That silently missed valid neighbors whenever
        radius_km exceeded ~1.8km. BallTree.query_radius is exact for any
        radius and still O(log n) per query.
        """
        # Requests without a real delivery location (0,0) can't be placed —
        # matches prior behavior of dropping them from clustering.
        valid_positions = [
            idx
            for idx, req in enumerate(requests)
            if not (
                float(req.get("delivery_latitude", 0)) == 0
                and float(req.get("delivery_longitude", 0)) == 0
            )
        ]
        if not valid_positions:
            return []

        coords_rad = np.radians(
            [
                (
                    float(requests[idx]["delivery_latitude"]),
                    float(requests[idx]["delivery_longitude"]),
                )
                for idx in valid_positions
            ]
        )
        tree = BallTree(coords_rad, metric="haversine")
        radius_rad = float(radius_km) / self.EARTH_RADIUS_KM
        priorities = [requests[idx].get("priority", 0) for idx in valid_positions]

        unclustered = set(range(len(valid_positions)))  # positions into coords_rad
        clusters: List[List[dict]] = []

        while unclustered:
            # Seed = highest priority/sales velocity among unclustered
            seed_pos = max(unclustered, key=lambda p: priorities[p])

            neighbor_positions = tree.query_radius(
                coords_rad[seed_pos : seed_pos + 1], r=radius_rad
            )[0]

            ordered = [seed_pos] + sorted(
                p for p in neighbor_positions if p != seed_pos and p in unclustered
            )
            cluster_positions = ordered[:max_retailers_per_route]

            unclustered.difference_update(cluster_positions)
            clusters.append(
                [requests[valid_positions[p]] for p in cluster_positions]
            )

        return clusters

    # ========================================================================
    # DATABASE OPERATIONS
    # ========================================================================

    async def _fetch_pending_requests(self, manufacturer_id: str) -> List[dict]:
        """
        Fetch all pending logistics requests from Bronze layer.
        Include geolocation and volumetric unit data.
        """
        query = text("""
            SELECT 
                lr.id,
                lr.retailer_id,
                lr.package_weight_kg,
                lr.package_length_cm,
                lr.package_width_cm,
                lr.package_height_cm,
                lr.volumetric_units,
                lr.base_handling_fee_kobo,
                lr.estimated_total_fee_kobo,
                lr.priority,
                COALESCE(s.latitude, 0) as delivery_latitude,
                COALESCE(s.longitude, 0) as delivery_longitude,
                COALESCE(p.sales_velocity_score, 0) as sales_velocity_score
            FROM logistics_requests lr
            LEFT JOIN stores s ON lr.delivery_location_id = s.id
            LEFT JOIN profiles p ON lr.retailer_id = p.id
            WHERE 
                lr.manufacturer_id = :manufacturer_id 
                AND lr.status = 'pending_grouping'
            ORDER BY p.sales_velocity_score DESC, lr.priority DESC
        """)

        result = await self.db.execute(
            query, {"manufacturer_id": manufacturer_id}
        )
        rows = result.fetchall()

        return [dict(row._mapping) for row in rows]

    async def _get_lead_retailer(self, retailer_ids: List[str]) -> str:
        """
        Get the lead retailer (highest SalesVelocityScore).
        Lead retailer coordinates the hub pickup.
        """
        if not retailer_ids:
            raise ValueError("No retailers to select from")

        query = text("""
            SELECT id FROM profiles
            WHERE id = ANY(:retailer_ids)
            ORDER BY sales_velocity_score DESC, updated_at DESC
            LIMIT 1
        """)

        result = await self.db.execute(query, {"retailer_ids": retailer_ids})
        row = result.first()

        return row[0] if row else retailer_ids[0]

    async def _create_route(
        self,
        manufacturer_id: str,
        venturehub_id: Optional[str],
        route_type: str,
        truck_capacity_vu: Decimal,
        fixed_trip_cost_kobo: int,
        lead_retailer_id: str,
        total_vu: Decimal,
        fill_percentage: float,
    ) -> str:
        """
        Create logistics route in Silver layer.
        Generate unique route number.
        """
        route_id = str(uuid4())
        route_number = f"RT-{datetime.now().strftime('%Y%m%d')}-{str(uuid4())[:8].upper()}"

        insert_query = text("""
            INSERT INTO logistics_routes (
                id,
                manufacturer_id,
                venturehub_id,
                route_number,
                route_type,
                truck_capacity_vu,
                fixed_trip_cost_kobo,
                lead_retailer_id,
                total_volumetric_units,
                fill_percentage,
                status,
                created_at,
                updated_at
            ) VALUES (
                :id,
                :manufacturer_id,
                :venturehub_id,
                :route_number,
                :route_type,
                :truck_capacity_vu,
                :fixed_trip_cost_kobo,
                :lead_retailer_id,
                :total_vu,
                :fill_percentage,
                'grouped',
                NOW(),
                NOW()
            )
        """)

        await self.db.execute(
            insert_query,
            {
                "id": route_id,
                "manufacturer_id": manufacturer_id,
                "venturehub_id": venturehub_id,
                "route_number": route_number,
                "route_type": route_type,
                "truck_capacity_vu": float(truck_capacity_vu),
                "fixed_trip_cost_kobo": fixed_trip_cost_kobo,
                "lead_retailer_id": lead_retailer_id,
                "total_vu": float(total_vu),
                "fill_percentage": fill_percentage,
            },
        )
        await self.db.commit()

        return route_id

    async def _create_route_member(
        self,
        route_id: str,
        logistics_request: dict,
        fixed_trip_cost_kobo: int,
        total_vu: Decimal,
        stop_sequence: int,
    ) -> RouteMemberResponse:
        """
        Create route member with calculated pricing.
        Formula: Individual_Share = (Fixed_Trip_Cost / Total_VUs) * User_VU + Handling_Fee
        """
        from app.services.volumetric_engine import VolumetricUnitEngine

        engine = VolumetricUnitEngine()
        
        individual_vu = Decimal(str(logistics_request["volumetric_units"]))
        handling_fee = logistics_request.get("base_handling_fee_kobo", 5000)
        
        individual_share = engine.calculate_individual_share(
            fixed_trip_cost_kobo=fixed_trip_cost_kobo,
            total_route_vu=total_vu,
            individual_vu=individual_vu,
            handling_fee_kobo=handling_fee,
        )
        
        total_cost = int(individual_share) + int(handling_fee)

        member_id = str(uuid4())

        insert_query = text("""
            INSERT INTO route_members (
                id,
                route_id,
                retailer_id,
                logistics_request_id,
                individual_volumetric_units,
                individual_share_kobo,
                handling_fee_kobo,
                total_cost_kobo,
                delivery_latitude,
                delivery_longitude,
                delivery_address,
                stop_sequence,
                status,
                created_at,
                joined_at
            ) VALUES (
                :id,
                :route_id,
                :retailer_id,
                :logistics_request_id,
                :individual_vu,
                :individual_share,
                :handling_fee,
                :total_cost,
                :delivery_latitude,
                :delivery_longitude,
                :delivery_address,
                :stop_sequence,
                'grouped',
                NOW(),
                NOW()
            )
        """)

        await self.db.execute(
            insert_query,
            {
                "id": member_id,
                "route_id": route_id,
                "retailer_id": logistics_request["retailer_id"],
                "logistics_request_id": logistics_request["id"],
                "individual_vu": float(individual_vu),
                "individual_share": int(individual_share),
                "handling_fee": int(handling_fee),
                "total_cost": total_cost,
                "delivery_latitude": float(
                    logistics_request.get("delivery_latitude", 0)
                ),
                "delivery_longitude": float(
                    logistics_request.get("delivery_longitude", 0)
                ),
                "delivery_address": logistics_request.get("delivery_address"),
                "stop_sequence": stop_sequence,
            },
        )
        await self.db.commit()

        return RouteMemberResponse(
            id=member_id,
            route_id=route_id,
            retailer_id=logistics_request["retailer_id"],
            logistics_request_id=logistics_request["id"],
            individual_volumetric_units=individual_vu,
            individual_share_kobo=int(individual_share),
            handling_fee_kobo=int(handling_fee),
            total_cost_kobo=total_cost,
            delivery_latitude=Decimal(str(logistics_request.get("delivery_latitude", 0))),
            delivery_longitude=Decimal(str(logistics_request.get("delivery_longitude", 0))),
            delivery_address=logistics_request.get("delivery_address"),
            stop_sequence=stop_sequence,
            status="grouped",
            joined_at=datetime.now(),
            created_at=datetime.now(),
        )

    async def _get_route_number(self, route_id: str) -> str:
        """Get route number from database"""
        query = text("""
            SELECT route_number FROM logistics_routes WHERE id = :route_id
        """)
        result = await self.db.execute(query, {"route_id": route_id})
        row = result.first()
        return row[0] if row else ""
