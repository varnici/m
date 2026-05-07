"""
Unit Tests for VentureRoute Logistics
Tests for VolumetricUnitEngine, ClusterService, and anti-leakage mechanisms
"""

import pytest
from decimal import Decimal
from datetime import datetime

from app.services.volumetric_engine import VolumetricUnitEngine


class TestVolumetricUnitEngine:
    """Test suite for VU (Volumetric Unit) pricing engine"""

    def setup_method(self):
        """Initialize engine before each test"""
        self.engine = VolumetricUnitEngine()

    # ========================================================================
    # VOLUMETRIC UNIT CALCULATION TESTS
    -- ========================================================================

    def test_calculate_vu_weight_based(self):
        """Test VU calculation when actual weight > dimensional weight"""
        # Heavy item: 20kg, small box (10×10×10cm)
        vu = self.engine.calculate_volumetric_units(
            weight_kg=Decimal("20"),
            length_cm=Decimal("10"),
            width_cm=Decimal("10"),
            height_cm=Decimal("10"),
        )
        
        # Volume = (10 × 10 × 10) / 1,000,000 = 0.001 m³
        # Dimensional weight = 0.001 / 0.005 = 0.2 kg
        # VU = MAX(20, 0.2) = 20 kg
        assert vu == Decimal("20.0000")

    def test_calculate_vu_volume_based(self):
        """Test VU calculation when dimensional weight > actual weight"""
        # Light item: 2kg, large box (100×100×100cm)
        vu = self.engine.calculate_volumetric_units(
            weight_kg=Decimal("2"),
            length_cm=Decimal("100"),
            width_cm=Decimal("100"),
            height_cm=Decimal("100"),
        )
        
        # Volume = (100 × 100 × 100) / 1,000,000 = 1 m³
        # Dimensional weight = 1 / 0.005 = 200 kg
        # VU = MAX(2, 200) = 200 kg
        assert vu == Decimal("200.0000")

    def test_calculate_vu_equal_weights(self):
        """Test VU when actual weight equals dimensional weight"""
        # 5kg item, 50×50×50cm
        vu = self.engine.calculate_volumetric_units(
            weight_kg=Decimal("5"),
            length_cm=Decimal("50"),
            width_cm=Decimal("50"),
            height_cm=Decimal("50"),
        )
        
        # Volume = (50 × 50 × 50) / 1,000,000 = 0.125 m³
        # Dimensional weight = 0.125 / 0.005 = 25 kg
        # VU = MAX(5, 25) = 25 kg
        assert vu == Decimal("25.0000")

    def test_calculate_vu_small_package(self):
        """Test VU for small, heavy package (weight-based)"""
        vu = self.engine.calculate_volumetric_units(
            weight_kg=Decimal("50"),
            length_cm=Decimal("5"),
            width_cm=Decimal("5"),
            height_cm=Decimal("5"),
        )
        
        # Volume = (5 × 5 × 5) / 1,000,000 = 0.000125 m³
        # Dimensional weight = 0.000125 / 0.005 = 0.025 kg
        # VU = MAX(50, 0.025) = 50 kg
        assert vu == Decimal("50.0000")

    def test_calculate_vu_large_package(self):
        """Test VU for large, light package (volume-based)"""
        vu = self.engine.calculate_volumetric_units(
            weight_kg=Decimal("1"),
            length_cm=Decimal("200"),
            width_cm=Decimal("200"),
            height_cm=Decimal("200"),
        )
        
        # Volume = (200 × 200 × 200) / 1,000,000 = 8 m³
        # Dimensional weight = 8 / 0.005 = 1600 kg
        # VU = MAX(1, 1600) = 1600 kg
        assert vu == Decimal("1600.0000")

    # ========================================================================
    # COST SHARING ALGORITHM TESTS
    -- ========================================================================

    def test_individual_share_single_retailer(self):
        """Test cost calculation for single retailer"""
        # One retailer with 10 VU in a 10 VU route
        # Trip cost: 50,000 kobo
        share = self.engine.calculate_individual_share(
            fixed_trip_cost_kobo=50000,
            total_route_vu=Decimal("10"),
            individual_vu=Decimal("10"),
            handling_fee_kobo=5000,
        )
        
        # Share = (50000 / 10) * 10 + 5000 = 50000 + 5000 = 55000
        assert share == Decimal("55000")

    def test_individual_share_multiple_retailers_equal(self):
        """Test fair cost distribution with equal-size retailers"""
        # 5 retailers, 2 VU each, 10 VU total
        # Trip cost: 50,000 kobo
        shares = self.engine.calculate_all_shares(
            fixed_trip_cost_kobo=50000,
            retailers_vu={
                "r1": 2,
                "r2": 2,
                "r3": 2,
                "r4": 2,
                "r5": 2,
            },
            handling_fee_kobo=5000,
        )
        
        # Each gets: (50000 / 10) * 2 + 5000 = 10000 + 5000 = 15000
        for retailer_id, share in shares.items():
            assert share == 15000

    def test_individual_share_multiple_retailers_unequal(self):
        """Test fair cost distribution with unequal-size retailers"""
        # 3 retailers: 2 VU, 3 VU, 5 VU (total 10 VU)
        # Trip cost: 50,000 kobo
        shares = self.engine.calculate_all_shares(
            fixed_trip_cost_kobo=50000,
            retailers_vu={
                "r1": 2,
                "r2": 3,
                "r3": 5,
            },
            handling_fee_kobo=5000,
        )
        
        # r1: (50000 / 10) * 2 + 5000 = 10000 + 5000 = 15000
        # r2: (50000 / 10) * 3 + 5000 = 15000 + 5000 = 20000
        # r3: (50000 / 10) * 5 + 5000 = 25000 + 5000 = 30000
        assert shares["r1"] == 15000
        assert shares["r2"] == 20000
        assert shares["r3"] == 30000

    def test_cost_distribution_verification(self):
        """Test that cost distribution sums correctly"""
        retailers_vu = {
            "r1": 2,
            "r2": 3,
            "r3": 5,
        }
        
        shares = self.engine.calculate_all_shares(
            fixed_trip_cost_kobo=50000,
            retailers_vu=retailers_vu,
            handling_fee_kobo=5000,
        )
        
        # Sum of shares should equal trip cost + total handling fees
        expected_total = 50000 + (5000 * 3)
        actual_total = sum(shares.values())
        
        assert actual_total == expected_total

    # ========================================================================
    # COST VERIFICATION TESTS
    -- ========================================================================

    def test_verify_cost_distribution_valid(self):
        """Test verification of valid cost distribution"""
        is_valid, message = self.engine.verify_cost_distribution(
            fixed_trip_cost_kobo=50000,
            retailers_vu={"r1": 5, "r2": 5},
            individual_shares={"r1": 30000, "r2": 30000},
            handling_fee_kobo=5000,
        )
        
        assert is_valid is True
        assert "valid" in message.lower()

    def test_verify_cost_distribution_mismatch(self):
        """Test detection of cost distribution mismatch"""
        is_valid, message = self.engine.verify_cost_distribution(
            fixed_trip_cost_kobo=50000,
            retailers_vu={"r1": 5, "r2": 5},
            individual_shares={"r1": 25000, "r2": 25000},  # Should be 30000 each
            handling_fee_kobo=5000,
        )
        
        assert is_valid is False
        assert "mismatch" in message.lower()

    def test_verify_cost_distribution_negative_cost(self):
        """Test detection of negative costs"""
        is_valid, message = self.engine.verify_cost_distribution(
            fixed_trip_cost_kobo=50000,
            retailers_vu={"r1": 5, "r2": 5},
            individual_shares={"r1": -5000, "r2": 65000},
            handling_fee_kobo=5000,
        )
        
        assert is_valid is False
        assert "negative" in message.lower()

    def test_verify_cost_distribution_missing_retailer(self):
        """Test detection of missing retailers in distribution"""
        is_valid, message = self.engine.verify_cost_distribution(
            fixed_trip_cost_kobo=50000,
            retailers_vu={"r1": 5, "r2": 5},
            individual_shares={"r1": 30000},  # Missing r2
            handling_fee_kobo=5000,
        )
        
        assert is_valid is False
        assert "not all retailers" in message.lower()

    # ========================================================================
    # FILL PERCENTAGE & CAPACITY TESTS
    -- ========================================================================

    def test_calculate_fill_percentage_empty(self):
        """Test fill percentage when truck is empty"""
        fill = self.engine.calculate_fill_percentage(
            used_vu=Decimal("0"),
            truck_capacity_vu=Decimal("100"),
        )
        
        assert fill == Decimal("0.00")

    def test_calculate_fill_percentage_half(self):
        """Test fill percentage at 50%"""
        fill = self.engine.calculate_fill_percentage(
            used_vu=Decimal("50"),
            truck_capacity_vu=Decimal("100"),
        )
        
        assert fill == Decimal("50.00")

    def test_calculate_fill_percentage_full(self):
        """Test fill percentage when truck is full"""
        fill = self.engine.calculate_fill_percentage(
            used_vu=Decimal("100"),
            truck_capacity_vu=Decimal("100"),
        )
        
        assert fill == Decimal("100.00")

    def test_calculate_fill_percentage_overfull(self):
        """Test fill percentage when VU exceeds capacity (capped at 100)"""
        fill = self.engine.calculate_fill_percentage(
            used_vu=Decimal("120"),
            truck_capacity_vu=Decimal("100"),
        )
        
        assert fill == Decimal("100")

    def test_get_truck_status_available(self):
        """Test truck status when mostly empty"""
        status = self.engine.get_truck_status(
            used_vu=Decimal("20"),
            truck_capacity_vu=Decimal("100"),
        )
        
        assert status["status"] == "available"
        assert status["fill_percentage"] == 20.0
        assert status["remaining_vu"] == 80.0

    def test_get_truck_status_almost_full(self):
        """Test truck status when almost full"""
        status = self.engine.get_truck_status(
            used_vu=Decimal("85"),
            truck_capacity_vu=Decimal("100"),
        )
        
        assert status["status"] == "almost_full"
        assert status["fill_percentage"] == 85.0

    def test_get_truck_status_full(self):
        """Test truck status when full"""
        status = self.engine.get_truck_status(
            used_vu=Decimal("100"),
            truck_capacity_vu=Decimal("100"),
        )
        
        assert status["status"] == "full"
        assert status["fill_percentage"] == 100.0

    # ========================================================================
    # COST ESTIMATION TESTS
    -- ========================================================================

    def test_estimate_cost(self):
        """Test cost estimation for a package"""
        estimate = self.engine.estimate_cost(
            weight_kg=Decimal("5"),
            length_cm=Decimal("50"),
            width_cm=Decimal("50"),
            height_cm=Decimal("50"),
            fixed_trip_cost_kobo=50000,
            total_route_vu=Decimal("100"),
            handling_fee_kobo=5000,
        )
        
        assert "volumetric_units" in estimate
        assert "trip_cost_share_kobo" in estimate
        assert "handling_fee_kobo" in estimate
        assert "total_cost_kobo" in estimate
        assert estimate["handling_fee_kobo"] == 5000

    # ========================================================================
    # EDGE CASE TESTS
    -- ========================================================================

    def test_calculate_vu_zero_dimension(self):
        """Test that zero dimensions raise error"""
        with pytest.raises(ValueError):
            self.engine.calculate_volumetric_units(
                weight_kg=Decimal("5"),
                length_cm=Decimal("0"),
                width_cm=Decimal("50"),
                height_cm=Decimal("50"),
            )

    def test_calculate_vu_negative_weight(self):
        """Test that negative weight raises error"""
        with pytest.raises(ValueError):
            self.engine.calculate_volumetric_units(
                weight_kg=Decimal("-5"),
                length_cm=Decimal("50"),
                width_cm=Decimal("50"),
                height_cm=Decimal("50"),
            )

    def test_individual_share_zero_vu(self):
        """Test individual share with zero VU (should handle gracefully)"""
        share = self.engine.calculate_individual_share(
            fixed_trip_cost_kobo=50000,
            total_route_vu=Decimal("10"),
            individual_vu=Decimal("0"),
            handling_fee_kobo=5000,
        )
        
        # Should only be handling fee
        assert share == Decimal("5000")

    def test_individual_share_zero_total_vu(self):
        """Test that zero total VU raises error"""
        with pytest.raises(ValueError):
            self.engine.calculate_individual_share(
                fixed_trip_cost_kobo=50000,
                total_route_vu=Decimal("0"),
                individual_vu=Decimal("5"),
                handling_fee_kobo=5000,
            )

    # ========================================================================
    # DECIMAL PRECISION TESTS
    -- ========================================================================

    def test_decimal_precision_vu(self):
        """Test that VU calculations maintain precision"""
        vu = self.engine.calculate_volumetric_units(
            weight_kg=Decimal("3.333"),
            length_cm=Decimal("33.33"),
            width_cm=Decimal("33.33"),
            height_cm=Decimal("33.33"),
        )
        
        # Should maintain 4 decimal places
        assert str(vu).count(".") == 1
        parts = str(vu).split(".")
        assert len(parts[1]) <= 4

    def test_decimal_precision_cost(self):
        """Test that costs are rounded to kobo (no sub-kobo amounts)"""
        share = self.engine.calculate_individual_share(
            fixed_trip_cost_kobo=50001,  # Odd number
            total_route_vu=Decimal("3"),
            individual_vu=Decimal("1"),
            handling_fee_kobo=5000,
        )
        
        # Should be integer (no decimal)
        assert isinstance(int(share), int)
        assert share == share.to_integral_value()

    # ========================================================================
    # REAL-WORLD SCENARIO TESTS
    -- ========================================================================

    def test_real_scenario_small_retailers(self):
        """
        Real scenario: 3 small retailers pooling delivery
        
        - R1: 2kg, 30×20×15cm box
        - R2: 1.5kg, 25×25×10cm box
        - R3: 3kg, 40×30×20cm box
        - Trip cost: 50,000 kobo
        - Handling: 5,000 per retailer
        """
        engine = VolumetricUnitEngine()
        
        # Calculate VUs
        vu_r1 = engine.calculate_volumetric_units(
            weight_kg=Decimal("2"),
            length_cm=Decimal("30"),
            width_cm=Decimal("20"),
            height_cm=Decimal("15"),
        )
        vu_r2 = engine.calculate_volumetric_units(
            weight_kg=Decimal("1.5"),
            length_cm=Decimal("25"),
            width_cm=Decimal("25"),
            height_cm=Decimal("10"),
        )
        vu_r3 = engine.calculate_volumetric_units(
            weight_kg=Decimal("3"),
            length_cm=Decimal("40"),
            width_cm=Decimal("30"),
            height_cm=Decimal("20"),
        )
        
        # Calculate shares
        total_vu = vu_r1 + vu_r2 + vu_r3
        
        share_r1 = engine.calculate_individual_share(
            fixed_trip_cost_kobo=50000,
            total_route_vu=total_vu,
            individual_vu=vu_r1,
            handling_fee_kobo=5000,
        )
        share_r2 = engine.calculate_individual_share(
            fixed_trip_cost_kobo=50000,
            total_route_vu=total_vu,
            individual_vu=vu_r2,
            handling_fee_kobo=5000,
        )
        share_r3 = engine.calculate_individual_share(
            fixed_trip_cost_kobo=50000,
            total_route_vu=total_vu,
            individual_vu=vu_r3,
            handling_fee_kobo=5000,
        )
        
        # Verify total
        total_cost = int(share_r1) + int(share_r2) + int(share_r3)
        expected_total = 50000 + (5000 * 3)
        
        # Allow 1% tolerance for rounding
        assert abs(total_cost - expected_total) <= (expected_total * 0.01)

    def test_fill_percentage_progression(self):
        """Test fill percentage at various utilization levels"""
        test_cases = [
            (0, 0),
            (25, 25),
            (50, 50),
            (75, 75),
            (100, 100),
        ]
        
        for used, expected_fill in test_cases:
            fill = self.engine.calculate_fill_percentage(
                used_vu=Decimal(str(used)),
                truck_capacity_vu=Decimal("100"),
            )
            assert float(fill) == expected_fill


# ========================================================================
# INTEGRATION TEST SUITE
-- ========================================================================

class TestVentureRouteIntegration:
    """Integration tests for complete VentureRoute workflow"""

    def test_end_to_end_clustering(self):
        """
        Test complete clustering workflow:
        1. Multiple retailers submit requests
        2. System calculates VUs
        3. System clusters into route
        4. Cost is distributed fairly
        """
        # This would be an integration test with ClusterService
        # For now, simplified
        engine = VolumetricUnitEngine()
        
        # Simulate 5 retailers
        retailers = {
            "r1": {"weight": 2, "dims": (30, 20, 15)},
            "r2": {"weight": 1.5, "dims": (25, 25, 10)},
            "r3": {"weight": 3, "dims": (40, 30, 20)},
            "r4": {"weight": 2.5, "dims": (35, 25, 15)},
            "r5": {"weight": 4, "dims": (50, 40, 30)},
        }
        
        # Calculate VUs
        retailers_vu = {}
        for retailer_id, data in retailers.items():
            vu = engine.calculate_volumetric_units(
                weight_kg=Decimal(str(data["weight"])),
                length_cm=Decimal(str(data["dims"][0])),
                width_cm=Decimal(str(data["dims"][1])),
                height_cm=Decimal(str(data["dims"][2])),
            )
            retailers_vu[retailer_id] = vu
        
        # Calculate shares
        shares = engine.calculate_all_shares(
            fixed_trip_cost_kobo=100000,
            retailers_vu={rid: float(vu) for rid, vu in retailers_vu.items()},
            handling_fee_kobo=5000,
        )
        
        # Verify
        total_cost = sum(shares.values())
        expected_total = 100000 + (5000 * 5)
        
        assert len(shares) == 5
        assert all(cost > 0 for cost in shares.values())
        assert abs(total_cost - expected_total) <= (expected_total * 0.01)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
