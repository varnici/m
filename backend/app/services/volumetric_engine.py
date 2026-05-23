"""
Volumetric Unit Engine - Pricing utility for fair cost distribution
Implements dimensional weight calculation and cost sharing algorithm
"""

from decimal import Decimal
from typing import Tuple
import math


class VolumetricUnitEngine:
    """
    Cost calculation engine for VentureRoute.
    
    Key Formula:
    Individual_Share = (Fixed_Trip_Cost / Total_VUs) * Individual_VU + Handling_Fee
    
    VU (Volumetric Unit) = MAX(Actual_Weight_kg, Dimensional_Weight_kg)
    where Dimensional_Weight = Volume_m³ / 0.005
    """

    # Standard volumetric divisor (kg/m³) - industry standard
    VOLUMETRIC_DIVISOR = 0.005  # 5000 kg/m³

    # ========================================================================
    # VOLUMETRIC UNIT CALCULATION
    # ========================================================================

    def calculate_volumetric_units(
        self,
        weight_kg: Decimal,
        length_cm: Decimal,
        width_cm: Decimal,
        height_cm: Decimal,
    ) -> Decimal:
        """
        Calculate volumetric units based on dimensional weight.
        
        Formula:
        1. Volume = (L × W × H) / 1,000,000 (convert cm³ to m³)
        2. Dimensional_Weight = Volume / 0.005 (standard volumetric divisor)
        3. VU = MAX(Actual_Weight, Dimensional_Weight)
        
        OPTIMIZATION: Pre-convert Decimals to float for faster math operations,
        then convert back once. Avoids Decimal overhead in tight loops.
        
        Args:
            weight_kg: Actual weight in kilograms
            length_cm: Length in centimeters
            width_cm: Width in centimeters
            height_cm: Height in centimeters
            
        Returns:
            Decimal: Volumetric units
        """
        if weight_kg <= 0 or length_cm <= 0 or width_cm <= 0 or height_cm <= 0:
            raise ValueError("All dimensions must be positive")

        # OPTIMIZATION: Single float conversion (not per operation)
        weight_float = float(weight_kg)
        l_float = float(length_cm)
        w_float = float(width_cm)
        h_float = float(height_cm)

        # Step 1: Calculate volume in m³ using native float math (much faster)
        # Formula: (cm × cm × cm) / 1,000,000 = m³
        volume_m3 = (l_float * w_float * h_float) / 1_000_000.0

        # Step 2: Calculate dimensional weight
        # Standard: Volume / 0.005 (= Volume * 200)
        dimensional_weight_kg = volume_m3 * 200.0  # Multiplication faster than division

        # Step 3: VU = MAX(actual weight, dimensional weight)
        volumetric_units = max(weight_float, dimensional_weight_kg)

        # Convert back to Decimal once at the end
        return Decimal(str(round(volumetric_units, 4)))

    # ========================================================================
    # COST SHARING ALGORITHM
    # ========================================================================

    def calculate_individual_share(
        self,
        fixed_trip_cost_kobo: int,
        total_route_vu: Decimal,
        individual_vu: Decimal,
        handling_fee_kobo: int,
    ) -> Decimal:
        """
        Calculate individual retailer's share of trip cost.
        
        Formula:
        Individual_Share = (Fixed_Trip_Cost / Total_VUs) * Individual_VU + Handling_Fee
        
        This ensures:
        - Fair distribution based on volumetric share
        - Each person pays for what they use
        - Handling fee covers operational costs
        
        Args:
            fixed_trip_cost_kobo: Total fixed cost of trip in kobo
            total_route_vu: Total volumetric units in route
            individual_vu: Individual's volumetric units
            handling_fee_kobo: Operational handling fee in kobo
            
        Returns:
            Decimal: Individual's share in kobo (rounded to nearest kobo)
        """
        if total_route_vu <= 0:
            raise ValueError("Total route VU must be positive")
        if individual_vu < 0 or individual_vu > total_route_vu:
            raise ValueError("Individual VU must be between 0 and total route VU")

        # Calculate cost per volumetric unit
        cost_per_vu = Decimal(str(fixed_trip_cost_kobo)) / total_route_vu

        # Calculate individual's proportional share
        individual_share = cost_per_vu * individual_vu

        # Add handling fee
        total_share = individual_share + Decimal(str(handling_fee_kobo))

        # Round to nearest kobo
        return Decimal(str(int(total_share)))

    def calculate_all_shares(
        self,
        fixed_trip_cost_kobo: int,
        retailers_vu: dict,  # {retailer_id: vu}
        handling_fee_kobo: int,
    ) -> dict:
        """
        Calculate shares for all retailers in a route.
        
        OPTIMIZATION:
        - Convert cost_per_vu to float once (not per retailer)
        - Use list comprehension for faster iteration
        - Minimize Decimal conversions in tight loop
        
        Args:
            fixed_trip_cost_kobo: Total fixed cost
            retailers_vu: Dictionary mapping retailer_id to their VU
            handling_fee_kobo: Handling fee per retailer
            
        Returns:
            dict: {retailer_id: individual_share_kobo}
        """
        if not retailers_vu:
            return {}

        # OPTIMIZATION: Calculate total_vu once, not per iteration
        total_vu = Decimal(str(sum(retailers_vu.values())))
        
        if total_vu <= 0:
            return {}
        
        # OPTIMIZATION: Convert cost_per_vu to float for faster multiplication
        cost_per_vu_float = float(fixed_trip_cost_kobo) / float(total_vu)
        handling_fee_float = float(handling_fee_kobo)
        
        result = {}
        
        # OPTIMIZATION: Vectorized calculation using float math, then convert back
        for retailer_id, individual_vu in retailers_vu.items():
            # Avoid Decimal operations in tight loop
            vu_float = float(individual_vu)
            individual_share_float = (cost_per_vu_float * vu_float) + handling_fee_float
            # Convert to int once at the end
            result[retailer_id] = int(individual_share_float)
        
        return result

    # ========================================================================
    # COST VERIFICATION & VALIDATION
    # ========================================================================

    def verify_cost_distribution(
        self,
        fixed_trip_cost_kobo: int,
        retailers_vu: dict,
        individual_shares: dict,
        handling_fee_kobo: int,
    ) -> Tuple[bool, str]:
        """
        Verify that cost distribution is fair and complete.
        
        Checks:
        1. Sum of individual shares ≈ total trip cost + handling fees
        2. No negative costs
        3. Each retailer in shares dict
        
        Returns:
            Tuple[bool, str]: (is_valid, error_message)
        """
        try:
            total_vu = sum(retailers_vu.values())
            
            # Check all retailers are included
            if set(individual_shares.keys()) != set(retailers_vu.keys()):
                return False, "Not all retailers included in shares"

            # Calculate expected total
            expected_total = fixed_trip_cost_kobo + (
                handling_fee_kobo * len(retailers_vu)
            )
            
            # Sum actual shares
            actual_total = sum(individual_shares.values())
            
            # Allow 1% variance due to rounding
            tolerance = int(expected_total * 0.01)
            
            if abs(actual_total - expected_total) > tolerance:
                return False, (
                    f"Cost distribution mismatch: "
                    f"expected {expected_total}, got {actual_total} "
                    f"(variance: {abs(actual_total - expected_total)} kobo)"
                )
            
            # Check for negative costs
            if any(cost < 0 for cost in individual_shares.values()):
                return False, "Negative costs in distribution"
            
            return True, "Distribution is valid"
            
        except Exception as e:
            return False, f"Verification error: {str(e)}"

    # ========================================================================
    # FILL PERCENTAGE & CAPACITY
    # ========================================================================

    def calculate_fill_percentage(
        self,
        used_vu: Decimal,
        truck_capacity_vu: Decimal,
    ) -> Decimal:
        """
        Calculate truck utilization percentage.
        Used for "Fill-to-Save" progress bar.
        
        Args:
            used_vu: Total volumetric units used
            truck_capacity_vu: Truck capacity in volumetric units
            
        Returns:
            Decimal: Fill percentage (0-100)
        """
        if truck_capacity_vu <= 0:
            raise ValueError("Truck capacity must be positive")

        if used_vu > truck_capacity_vu:
            return Decimal("100")

        percentage = (used_vu / truck_capacity_vu) * 100
        return Decimal(str(round(percentage, 2)))

    def get_truck_status(
        self,
        used_vu: Decimal,
        truck_capacity_vu: Decimal,
    ) -> dict:
        """
        Get detailed truck status for UI/UX.
        
        Returns:
            dict with fill percentage, remaining capacity, status
        """
        fill_percentage = self.calculate_fill_percentage(used_vu, truck_capacity_vu)
        remaining_vu = truck_capacity_vu - used_vu

        # Determine status for UI feedback
        if fill_percentage >= 100:
            status = "full"
            color = "red"
            message = "Truck is at full capacity"
        elif fill_percentage >= 80:
            status = "almost_full"
            color = "orange"
            message = f"Truck is {fill_percentage}% full"
        elif fill_percentage >= 50:
            status = "half_full"
            color = "yellow"
            message = f"Truck is {fill_percentage}% full - Space available"
        else:
            status = "available"
            color = "green"
            message = f"Truck has {remaining_vu:.2f} VU available"

        return {
            "fill_percentage": float(fill_percentage),
            "used_vu": float(used_vu),
            "remaining_vu": float(remaining_vu),
            "truck_capacity_vu": float(truck_capacity_vu),
            "status": status,
            "color": color,
            "message": message,
        }

    # ========================================================================
    # COST ESTIMATION
    # ========================================================================

    def estimate_cost(
        self,
        weight_kg: Decimal,
        length_cm: Decimal,
        width_cm: Decimal,
        height_cm: Decimal,
        fixed_trip_cost_kobo: int,
        total_route_vu: Decimal,
        handling_fee_kobo: int,
    ) -> dict:
        """
        Get cost estimate for a package.
        
        Args:
            weight_kg: Package weight
            length_cm: Package length
            width_cm: Package width
            height_cm: Package height
            fixed_trip_cost_kobo: Trip cost
            total_route_vu: Total route volumetric units
            handling_fee_kobo: Handling fee
            
        Returns:
            dict: {vu, trip_cost_share, handling_fee, total_cost}
        """
        vu = self.calculate_volumetric_units(weight_kg, length_cm, width_cm, height_cm)

        trip_cost_share = self.calculate_individual_share(
            fixed_trip_cost_kobo=fixed_trip_cost_kobo,
            total_route_vu=total_route_vu,
            individual_vu=vu,
            handling_fee_kobo=0,  # Exclude handling fee from trip share
        )

        total_cost = int(trip_cost_share) + int(handling_fee_kobo)

        return {
            "volumetric_units": float(vu),
            "trip_cost_share_kobo": int(trip_cost_share),
            "handling_fee_kobo": int(handling_fee_kobo),
            "total_cost_kobo": total_cost,
            "breakdown": f"Trip: {int(trip_cost_share)} kobo + Handling: {int(handling_fee_kobo)} kobo",
        }

    # ========================================================================
    # VOLUME HELPERS
    # ========================================================================

    def format_vu_display(self, vu: Decimal) -> str:
        """Format VU for display"""
        return f"{float(vu):.2f} VU"

    def format_cost_display(self, kobo: int) -> str:
        """Format cost in kobo for display (convert to Naira)"""
        naira = kobo / 100
        return f"₦{naira:,.0f}"
