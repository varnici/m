-- ============================================================================
-- VENTUREROUTE LOGISTICS SYSTEM - PRODUCTION MIGRATION
-- ============================================================================
-- This migration implements the community logistics coordination system:
-- - Geospatial clustering (2km radius grouping)
-- - Volumetric unit pricing engine
-- - VentureHub terminal management
-- - Wallet freeze (anti-leakage) mechanism
-- - Dual OTP/QR handshake security
-- ============================================================================

-- ============================================================================
-- SECTION 1: ENUM TYPES
-- ============================================================================

DO $$ BEGIN
    CREATE TYPE logistics_status AS ENUM ('pending_grouping', 'grouped', 'lead_assigned', 'payment_locked', 'ready_dispatch', 'in_transit', 'at_terminal', 'delivered', 'failed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE route_type AS ENUM ('distribution', 'collection', 'return', 'emergency');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE qr_handshake_type AS ENUM ('hub_arrival', 'package_pickup', 'delivery_confirmation');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE wallet_freeze_status AS ENUM ('active', 'released', 'forfeited', 'refunded');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ============================================================================
-- SECTION 2: VENTUREHUB (TERMINAL) MANAGEMENT
-- ============================================================================

CREATE TABLE IF NOT EXISTS venturehubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  hub_qr_code TEXT UNIQUE NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  address TEXT NOT NULL,
  operational_hours_start TIME NOT NULL,
  operational_hours_end TIME NOT NULL,
  max_concurrent_retailers INTEGER DEFAULT 50,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_venturehubs_owner_id ON venturehubs(owner_id);
CREATE INDEX IF NOT EXISTS idx_venturehubs_store_id ON venturehubs(store_id);
CREATE INDEX IF NOT EXISTS idx_venturehubs_location ON venturehubs(latitude, longitude);

-- ============================================================================
-- SECTION 3: LOGISTICS REQUESTS (BRONZE LAYER - RAW DATA)
-- ============================================================================

CREATE TABLE IF NOT EXISTS logistics_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  retailer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  manufacturer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  pickup_location_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  delivery_location_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  
  -- Package dimensions for volumetric calculation
  package_weight_kg DECIMAL(10, 3) NOT NULL CHECK (package_weight_kg > 0),
  package_length_cm DECIMAL(10, 2) NOT NULL CHECK (package_length_cm > 0),
  package_width_cm DECIMAL(10, 2) NOT NULL CHECK (package_width_cm > 0),
  package_height_cm DECIMAL(10, 2) NOT NULL CHECK (package_height_cm > 0),
  
  -- Volumetric unit calculation (max of weight vs volume)
  volumetric_units DECIMAL(12, 4) NOT NULL,
  
  -- Cost estimation
  base_handling_fee_kobo BIGINT DEFAULT 5000,
  estimated_total_fee_kobo BIGINT,
  
  status logistics_status DEFAULT 'pending_grouping',
  priority INTEGER DEFAULT 0,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_logistics_requests_retailer ON logistics_requests(retailer_id);
CREATE INDEX IF NOT EXISTS idx_logistics_requests_manufacturer ON logistics_requests(manufacturer_id);
CREATE INDEX IF NOT EXISTS idx_logistics_requests_status ON logistics_requests(status);
CREATE INDEX IF NOT EXISTS idx_logistics_requests_location ON logistics_requests(pickup_location_id, delivery_location_id);

-- ============================================================================
-- SECTION 4: LOGISTICS ROUTES (SILVER LAYER - GROUPED & VALIDATED)
-- ============================================================================

CREATE TABLE IF NOT EXISTS logistics_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manufacturer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  venturehub_id UUID REFERENCES venturehubs(id) ON DELETE SET NULL,
  
  -- Route metadata
  route_number TEXT UNIQUE NOT NULL,
  route_type route_type DEFAULT 'distribution',
  estimated_departure TIMESTAMPTZ,
  
  -- Fleet info
  truck_capacity_vu DECIMAL(12, 4) NOT NULL CHECK (truck_capacity_vu > 0),
  truck_plate_number TEXT,
  
  -- Cost aggregation
  fixed_trip_cost_kobo BIGINT NOT NULL,
  total_volumetric_units DECIMAL(12, 4) DEFAULT 0,
  fill_percentage DECIMAL(5, 2) DEFAULT 0 CHECK (fill_percentage >= 0 AND fill_percentage <= 100),
  
  -- Lead retailer (highest SalesVelocityScore)
  lead_retailer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  
  status logistics_status DEFAULT 'pending_grouping',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_logistics_routes_manufacturer ON logistics_routes(manufacturer_id);
CREATE INDEX IF NOT EXISTS idx_logistics_routes_venturehub ON logistics_routes(venturehub_id);
CREATE INDEX IF NOT EXISTS idx_logistics_routes_lead_retailer ON logistics_routes(lead_retailer_id);
CREATE INDEX IF NOT EXISTS idx_logistics_routes_status ON logistics_routes(status);

-- ============================================================================
-- SECTION 5: ROUTE MEMBERS (CLUSTERING - RETAILERS IN ROUTES)
-- ============================================================================

CREATE TABLE IF NOT EXISTS route_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id UUID REFERENCES logistics_routes(id) ON DELETE CASCADE NOT NULL,
  retailer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  logistics_request_id UUID REFERENCES logistics_requests(id) ON DELETE CASCADE NOT NULL,
  
  -- Pricing breakdown
  individual_volumetric_units DECIMAL(12, 4) NOT NULL,
  individual_share_kobo BIGINT NOT NULL,
  handling_fee_kobo BIGINT DEFAULT 5000,
  total_cost_kobo BIGINT NOT NULL,
  
  -- Geospatial data
  delivery_latitude DECIMAL(10, 8),
  delivery_longitude DECIMAL(11, 8),
  delivery_address TEXT,
  
  -- Sequence in route
  stop_sequence INTEGER,
  
  status logistics_status DEFAULT 'grouped',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_retailer_per_route UNIQUE(route_id, retailer_id)
);

CREATE INDEX IF NOT EXISTS idx_route_members_route ON route_members(route_id);
CREATE INDEX IF NOT EXISTS idx_route_members_retailer ON route_members(retailer_id);
CREATE INDEX IF NOT EXISTS idx_route_members_request ON route_members(logistics_request_id);

-- ============================================================================
-- SECTION 6: WALLET FREEZE (ANTI-LEAKAGE ESCROW)
-- ============================================================================

CREATE TABLE IF NOT EXISTS wallet_freezes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  route_id UUID REFERENCES logistics_routes(id) ON DELETE CASCADE NOT NULL,
  
  -- Freezing details
  frozen_amount_kobo BIGINT NOT NULL CHECK (frozen_amount_kobo > 0),
  freeze_reason TEXT NOT NULL,
  frozen_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Release conditions
  release_trigger TEXT CHECK (release_trigger IN ('qr_handshake', 'delivery_confirmation', 'manual_override', 'timeout')),
  release_date TIMESTAMPTZ,
  
  status wallet_freeze_status DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallet_freezes_user ON wallet_freezes(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_freezes_route ON wallet_freezes(route_id);
CREATE INDEX IF NOT EXISTS idx_wallet_freezes_status ON wallet_freezes(status);

-- ============================================================================
-- SECTION 7: QR CODES & HANDSHAKE LOG
-- ============================================================================

CREATE TABLE IF NOT EXISTS qr_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code_value TEXT UNIQUE NOT NULL,
  code_type qr_handshake_type NOT NULL,
  
  -- Reference to entity (can be hub, package, or delivery)
  entity_type TEXT NOT NULL CHECK (entity_type IN ('venturehub', 'logistics_request', 'route_member')),
  entity_id UUID NOT NULL,
  
  -- QR metadata
  is_active BOOLEAN DEFAULT TRUE,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  scans_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_qr_codes_code_value ON qr_codes(code_value);
CREATE INDEX IF NOT EXISTS idx_qr_codes_entity ON qr_codes(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_qr_codes_active ON qr_codes(is_active);

-- ============================================================================
-- SECTION 8: QR HANDSHAKE LOG (SECURITY AUDIT TRAIL)
-- ============================================================================

CREATE TABLE IF NOT EXISTS qr_handshakes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_code_id UUID REFERENCES qr_codes(id) ON DELETE CASCADE NOT NULL,
  route_member_id UUID REFERENCES route_members(id) ON DELETE CASCADE,
  
  scanned_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  handshake_type qr_handshake_type NOT NULL,
  
  -- Geolocation at scan
  scan_latitude DECIMAL(10, 8),
  scan_longitude DECIMAL(11, 8),
  
  -- OTP verification
  otp_required BOOLEAN DEFAULT FALSE,
  otp_verified BOOLEAN DEFAULT FALSE,
  otp_verified_at TIMESTAMPTZ,
  
  -- Security validation
  is_valid BOOLEAN DEFAULT TRUE,
  validation_errors TEXT,
  
  scanned_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_qr_handshakes_qr_code ON qr_handshakes(qr_code_id);
CREATE INDEX IF NOT EXISTS idx_qr_handshakes_route_member ON qr_handshakes(route_member_id);
CREATE INDEX IF NOT EXISTS idx_qr_handshakes_scanned_by ON qr_handshakes(scanned_by);
CREATE INDEX IF NOT EXISTS idx_qr_handshakes_timestamp ON qr_handshakes(scanned_at);

-- ============================================================================
-- SECTION 9: VENTUREROUTE ANALYTICS (GOLD LAYER - AGGREGATED)
-- ============================================================================

CREATE TABLE IF NOT EXISTS logistics_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id UUID REFERENCES logistics_routes(id) ON DELETE CASCADE NOT NULL,
  
  -- Route performance
  total_cost_kobo BIGINT,
  cost_per_vu_kobo DECIMAL(10, 4),
  truck_utilization_percent DECIMAL(5, 2),
  
  -- Participant stats
  total_retailers INTEGER,
  avg_order_value_kobo BIGINT,
  
  -- Delivery stats
  successful_deliveries INTEGER DEFAULT 0,
  failed_deliveries INTEGER DEFAULT 0,
  delivery_success_rate DECIMAL(5, 2) DEFAULT 0,
  
  -- QR compliance
  qr_scans_completed INTEGER DEFAULT 0,
  qr_compliance_rate DECIMAL(5, 2) DEFAULT 0,
  
  -- Lead retailer performance
  lead_retailer_sales_velocity_score DECIMAL(10, 2),
  
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_logistics_analytics_route ON logistics_analytics(route_id);

-- ============================================================================
-- SECTION 10: RLS POLICIES
-- ============================================================================

ALTER TABLE venturehubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE logistics_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE logistics_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_freezes ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_handshakes ENABLE ROW LEVEL SECURITY;
ALTER TABLE logistics_analytics ENABLE ROW LEVEL SECURITY;

-- Retailers can only see their own requests and routes
CREATE POLICY "retailers_view_own_requests" ON logistics_requests
  FOR SELECT USING (retailer_id = auth.uid());

CREATE POLICY "manufacturers_view_own_routes" ON logistics_routes
  FOR SELECT USING (manufacturer_id = auth.uid());

CREATE POLICY "users_view_own_wallet_freezes" ON wallet_freezes
  FOR SELECT USING (user_id = auth.uid());

-- ============================================================================
-- SECTION 11: HELPER FUNCTIONS
-- ============================================================================

-- Calculate volumetric units (dimensional weight)
CREATE OR REPLACE FUNCTION calculate_volumetric_units(
  weight_kg DECIMAL,
  length_cm DECIMAL,
  width_cm DECIMAL,
  height_cm DECIMAL
) RETURNS DECIMAL AS $$
DECLARE
  volume_m3 DECIMAL;
  dimensional_weight_kg DECIMAL;
BEGIN
  -- Volume = (L × W × H) / 1,000,000 (convert cm³ to m³)
  volume_m3 := (length_cm * width_cm * height_cm) / 1000000;
  
  -- Dimensional weight = Volume (m³) / 0.005 (5000 kg/m³ standard)
  dimensional_weight_kg := volume_m3 / 0.005;
  
  -- Volumetric units = MAX(actual weight, dimensional weight)
  RETURN GREATEST(weight_kg, dimensional_weight_kg);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Calculate individual share in route
CREATE OR REPLACE FUNCTION calculate_individual_share(
  fixed_trip_cost_kobo BIGINT,
  total_route_vu DECIMAL,
  individual_vu DECIMAL,
  handling_fee_kobo BIGINT
) RETURNS BIGINT AS $$
BEGIN
  -- Individual share = (Fixed_Trip_Cost / Total_VUs) * Individual_VU + Handling_Fee
  RETURN ((fixed_trip_cost_kobo::DECIMAL / total_route_vu) * individual_vu)::BIGINT + handling_fee_kobo;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Calculate truck fill percentage
CREATE OR REPLACE FUNCTION calculate_fill_percentage(
  used_vu DECIMAL,
  truck_capacity_vu DECIMAL
) RETURNS DECIMAL AS $$
BEGIN
  RETURN ROUND((used_vu / truck_capacity_vu) * 100, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- SECTION 12: CONSTRAINTS & TRIGGERS
-- ============================================================================

-- Trigger: Update route fill percentage when route members change
CREATE OR REPLACE FUNCTION update_route_fill_percentage()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE logistics_routes
  SET 
    total_volumetric_units = (
      SELECT COALESCE(SUM(individual_volumetric_units), 0)
      FROM route_members
      WHERE route_id = NEW.route_id
    ),
    fill_percentage = calculate_fill_percentage(
      (SELECT COALESCE(SUM(individual_volumetric_units), 0)
       FROM route_members
       WHERE route_id = NEW.route_id),
      truck_capacity_vu
    ),
    updated_at = NOW()
  WHERE id = NEW.route_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_route_fill_percentage
AFTER INSERT OR UPDATE ON route_members
FOR EACH ROW EXECUTE FUNCTION update_route_fill_percentage();

-- Trigger: Validate wallet freeze before route dispatch
CREATE OR REPLACE FUNCTION validate_wallet_freeze_before_dispatch()
RETURNS TRIGGER AS $$
DECLARE
  frozen_count INTEGER;
BEGIN
  IF NEW.status = 'ready_dispatch' THEN
    -- Check if all route members have active wallet freezes
    SELECT COUNT(*) INTO frozen_count
    FROM route_members rm
    WHERE rm.route_id = NEW.id
    AND NOT EXISTS (
      SELECT 1 FROM wallet_freezes wf
      WHERE wf.user_id = rm.retailer_id
      AND wf.route_id = NEW.id
      AND wf.status = 'active'
    );
    
    IF frozen_count > 0 THEN
      RAISE EXCEPTION 'Cannot dispatch: Not all retailers have frozen payments';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_wallet_freeze
BEFORE UPDATE ON logistics_routes
FOR EACH ROW EXECUTE FUNCTION validate_wallet_freeze_before_dispatch();

COMMIT;
