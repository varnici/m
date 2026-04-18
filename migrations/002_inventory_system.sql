-- ============================================================================
-- INVENTORY MANAGEMENT SYSTEM - PRODUCTION MIGRATION
-- ============================================================================
-- This migration extends the inventory system with:
-- - Supplier management
-- - Purchase order tracking
-- - Multi-location/warehouse support
-- - Stock movement audit trail
-- - Inventory analytics views
-- - RLS policies for security
-- ============================================================================

-- ============================================================================
-- SECTION 1: ENUM TYPES
-- ============================================================================

CREATE TYPE input_method AS ENUM ('manual', 'voice', 'scan', 'api');
CREATE TYPE movement_type AS ENUM ('purchase', 'sale', 'adjustment', 'transfer', 'damage', 'return');
CREATE TYPE stock_status AS ENUM ('in_stock', 'low_stock', 'out_of_stock', 'discontinued');
CREATE TYPE purchase_order_status AS ENUM ('draft', 'pending', 'confirmed', 'shipped', 'received', 'cancelled');

-- ============================================================================
-- SECTION 2: STORES & LOCATIONS (MULTI-LOCATION SUPPORT)
-- ============================================================================

CREATE TABLE stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT DEFAULT 'retail' CHECK (type IN ('retail', 'warehouse', 'distribution')),
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  phone TEXT,
  email TEXT,
  is_primary BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'closed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_primary_store_per_owner UNIQUE(owner_id, is_primary) WHERE is_primary = TRUE
);

CREATE INDEX idx_stores_owner_id ON stores(owner_id);
CREATE INDEX idx_stores_city ON stores(city);

-- ============================================================================
-- SECTION 3: PRODUCT CATALOG (ENHANCED)
-- ============================================================================

CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  image_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_category_slug_per_owner UNIQUE(owner_id, slug)
);

CREATE INDEX idx_categories_owner_id ON categories(owner_id);
CREATE INDEX idx_categories_parent_id ON categories(parent_id);

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  sku TEXT NOT NULL,
  barcode TEXT,
  qr_code TEXT,
  name TEXT NOT NULL,
  description TEXT,
  brand TEXT,
  unit_of_measure TEXT NOT NULL DEFAULT 'piece',
  cost_price_kobo BIGINT NOT NULL CHECK (cost_price_kobo >= 0),
  selling_price_kobo BIGINT NOT NULL CHECK (selling_price_kobo >= cost_price_kobo),
  minimum_stock_level INTEGER NOT NULL CHECK (minimum_stock_level >= 0),
  maximum_stock_level INTEGER NOT NULL CHECK (maximum_stock_level > 0),
  reorder_quantity INTEGER NOT NULL CHECK (reorder_quantity > 0),
  supplier_lead_time_days INTEGER DEFAULT 7,
  is_perishable BOOLEAN DEFAULT FALSE,
  shelf_life_days INTEGER,
  requires_lot_tracking BOOLEAN DEFAULT FALSE,
  nafdac_number TEXT, -- For pharmaceutical products
  image_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_sku_per_owner UNIQUE(owner_id, sku)
);

CREATE INDEX idx_products_owner_id ON products(owner_id);
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_sku ON products(owner_id, sku);
CREATE INDEX idx_products_barcode ON products(owner_id, barcode) WHERE barcode IS NOT NULL;

-- ============================================================================
-- SECTION 4: SUPPLIER MANAGEMENT
-- ============================================================================

CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT NOT NULL,
  email TEXT,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  bank_name TEXT,
  bank_account_number TEXT,
  payment_terms TEXT DEFAULT 'net_30',
  lead_time_days INTEGER DEFAULT 7,
  minimum_order_value_kobo BIGINT DEFAULT 0,
  is_preferred BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blacklisted')),
  rating DECIMAL(3, 2) DEFAULT 5.00,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_suppliers_owner_id ON suppliers(owner_id);
CREATE INDEX idx_suppliers_status ON suppliers(owner_id, status);

-- Junction table: products to suppliers
CREATE TABLE product_suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE NOT NULL,
  supplier_sku TEXT,
  supplier_price_kobo BIGINT NOT NULL CHECK (supplier_price_kobo >= 0),
  lead_time_days INTEGER,
  minimum_order_qty INTEGER DEFAULT 1,
  pack_size INTEGER DEFAULT 1,
  is_preferred BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_product_supplier UNIQUE(product_id, supplier_id)
);

CREATE INDEX idx_product_suppliers_product_id ON product_suppliers(product_id);
CREATE INDEX idx_product_suppliers_supplier_id ON product_suppliers(supplier_id);

-- ============================================================================
-- SECTION 5: INVENTORY TRACKING (MULTI-LOCATION)
-- ============================================================================

-- Stock by location (warehouse/store)
CREATE TABLE stock_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  quantity_on_hand INTEGER NOT NULL DEFAULT 0 CHECK (quantity_on_hand >= 0),
  quantity_reserved INTEGER NOT NULL DEFAULT 0 CHECK (quantity_reserved >= 0),
  quantity_available INTEGER GENERATED ALWAYS AS (quantity_on_hand - quantity_reserved) STORED,
  status stock_status DEFAULT 'in_stock',
  last_counted_at TIMESTAMPTZ,
  last_movement_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_product_store UNIQUE(product_id, store_id)
);

CREATE INDEX idx_stock_levels_product_id ON stock_levels(product_id);
CREATE INDEX idx_stock_levels_store_id ON stock_levels(store_id);
CREATE INDEX idx_stock_levels_status ON stock_levels(store_id, status);

-- Stock movements audit trail
CREATE TABLE stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE RESTRICT NOT NULL,
  from_store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  to_store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  movement_type movement_type NOT NULL,
  input_method input_method DEFAULT 'manual',
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  reference_id TEXT, -- Reference to sales, PO, or transfer
  reference_type TEXT, -- 'sale', 'purchase_order', 'transfer', 'adjustment'
  notes TEXT,
  voice_input_raw TEXT, -- Store raw voice input for audit
  staff_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_stock_movements_product_id ON stock_movements(product_id);
CREATE INDEX idx_stock_movements_owner_id ON stock_movements(owner_id);
CREATE INDEX idx_stock_movements_created_at ON stock_movements(owner_id, created_at);
CREATE INDEX idx_stock_movements_reference ON stock_movements(reference_type, reference_id);

-- ============================================================================
-- SECTION 6: PURCHASE ORDERS
-- ============================================================================

CREATE TABLE purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE RESTRICT NOT NULL,
  store_id UUID REFERENCES stores(id) ON DELETE RESTRICT NOT NULL,
  po_number TEXT NOT NULL,
  status purchase_order_status DEFAULT 'draft',
  total_amount_kobo BIGINT NOT NULL DEFAULT 0 CHECK (total_amount_kobo >= 0),
  expected_delivery_date DATE,
  actual_delivery_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_po_number_per_owner UNIQUE(owner_id, po_number)
);

CREATE INDEX idx_purchase_orders_owner_id ON purchase_orders(owner_id);
CREATE INDEX idx_purchase_orders_supplier_id ON purchase_orders(supplier_id);
CREATE INDEX idx_purchase_orders_status ON purchase_orders(owner_id, status);
CREATE INDEX idx_purchase_orders_created_at ON purchase_orders(owner_id, created_at);

CREATE TABLE purchase_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID REFERENCES purchase_orders(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE RESTRICT NOT NULL,
  quantity_ordered INTEGER NOT NULL CHECK (quantity_ordered > 0),
  quantity_received INTEGER NOT NULL DEFAULT 0 CHECK (quantity_received >= 0),
  unit_price_kobo BIGINT NOT NULL CHECK (unit_price_kobo >= 0),
  line_total_kobo BIGINT NOT NULL CHECK (line_total_kobo >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_po_items_purchase_order_id ON purchase_order_items(purchase_order_id);
CREATE INDEX idx_po_items_product_id ON purchase_order_items(product_id);

-- ============================================================================
-- SECTION 7: INVENTORY ANALYTICS & PREDICTIONS
-- ============================================================================

CREATE TABLE inventory_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  snapshot_date DATE NOT NULL,
  total_inventory_value_kobo BIGINT NOT NULL DEFAULT 0,
  total_quantity_on_hand BIGINT NOT NULL DEFAULT 0,
  low_stock_items_count INTEGER DEFAULT 0,
  out_of_stock_items_count INTEGER DEFAULT 0,
  inventory_turnover_ratio DECIMAL(10, 4) DEFAULT 0.0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_snapshot UNIQUE(owner_id, store_id, snapshot_date)
);

CREATE INDEX idx_inventory_snapshots_owner_date ON inventory_snapshots(owner_id, snapshot_date);
CREATE INDEX idx_inventory_snapshots_store_date ON inventory_snapshots(store_id, snapshot_date);

CREATE TABLE ai_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  prediction_type TEXT NOT NULL CHECK (prediction_type IN (
    'demand_forecast', 'restock_recommendation', 'dead_stock_alert', 
    'anomaly_detection', 'dynamic_pricing', 'expiry_alert'
  )),
  prediction_date DATE NOT NULL,
  value BIGINT, -- For numeric predictions (qty, price, etc.)
  value_float DECIMAL(12, 4), -- For ratio predictions (turnover, margin, etc.)
  confidence_score DECIMAL(5, 4) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  metadata JSONB, -- Store prediction details, model version, features used
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_predictions_owner_product ON ai_predictions(owner_id, product_id);
CREATE INDEX idx_ai_predictions_type_date ON ai_predictions(prediction_type, prediction_date);

-- ============================================================================
-- SECTION 8: SALES TRANSACTIONS (LINKED TO INVENTORY)
-- ============================================================================

CREATE TABLE sales_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  transaction_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  total_amount_kobo BIGINT NOT NULL CHECK (total_amount_kobo > 0),
  payment_method TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sales_transactions_owner_date ON sales_transactions(owner_id, transaction_date);
CREATE INDEX idx_sales_transactions_store_date ON sales_transactions(store_id, transaction_date);

CREATE TABLE sales_transaction_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_transaction_id UUID REFERENCES sales_transactions(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE RESTRICT NOT NULL,
  quantity_sold INTEGER NOT NULL CHECK (quantity_sold > 0),
  unit_price_kobo BIGINT NOT NULL CHECK (unit_price_kobo >= 0),
  line_total_kobo BIGINT NOT NULL CHECK (line_total_kobo >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sales_items_transaction_id ON sales_transaction_items(sales_transaction_id);
CREATE INDEX idx_sales_items_product_id ON sales_transaction_items(product_id);

-- ============================================================================
-- SECTION 9: MATERIALIZED VIEWS FOR ANALYTICS (INDEXED & FAST)
-- ============================================================================

-- Product health scorecard
CREATE MATERIALIZED VIEW mv_product_health AS
SELECT 
  p.id,
  p.owner_id,
  p.sku,
  p.name,
  COALESCE(SUM(sl.quantity_on_hand), 0) as total_quantity,
  COALESCE(SUM(sl.quantity_on_hand) * p.cost_price_kobo, 0)::BIGINT as total_cost_value_kobo,
  COALESCE(SUM(sl.quantity_on_hand) * p.selling_price_kobo, 0)::BIGINT as total_selling_value_kobo,
  (COALESCE(SUM(sl.quantity_on_hand) * p.selling_price_kobo, 0) - 
   COALESCE(SUM(sl.quantity_on_hand) * p.cost_price_kobo, 0))::BIGINT as profit_value_kobo,
  p.minimum_stock_level,
  p.maximum_stock_level,
  CASE 
    WHEN COALESCE(SUM(sl.quantity_on_hand), 0) <= p.minimum_stock_level THEN 'critical'
    WHEN COALESCE(SUM(sl.quantity_on_hand), 0) <= (p.minimum_stock_level * 1.5) THEN 'low'
    WHEN COALESCE(SUM(sl.quantity_on_hand), 0) >= p.maximum_stock_level THEN 'overstocked'
    ELSE 'healthy'
  END as stock_health,
  ((p.selling_price_kobo - p.cost_price_kobo)::DECIMAL / NULLIF(p.cost_price_kobo, 0) * 100)::DECIMAL(10, 2) as margin_percentage,
  COALESCE(MAX(sm.created_at), p.created_at) as last_movement_date
FROM products p
LEFT JOIN stock_levels sl ON p.id = sl.product_id
LEFT JOIN stock_movements sm ON p.id = sm.product_id
WHERE p.is_active = TRUE
GROUP BY p.id, p.owner_id, p.sku, p.name, p.minimum_stock_level, p.maximum_stock_level, 
         p.cost_price_kobo, p.selling_price_kobo, p.created_at;

CREATE INDEX idx_mv_product_health_owner ON mv_product_health(owner_id);
CREATE INDEX idx_mv_product_health_stock_health ON mv_product_health(stock_health);

-- Daily inventory metrics
CREATE MATERIALIZED VIEW mv_daily_inventory_metrics AS
SELECT 
  owner_id,
  store_id,
  snapshot_date,
  total_inventory_value_kobo,
  total_quantity_on_hand,
  low_stock_items_count,
  out_of_stock_items_count,
  inventory_turnover_ratio,
  RANK() OVER (PARTITION BY owner_id ORDER BY snapshot_date DESC) as days_recent_rank
FROM inventory_snapshots
WHERE snapshot_date >= CURRENT_DATE - INTERVAL '90 days';

CREATE INDEX idx_mv_daily_metrics_owner_date ON mv_daily_inventory_metrics(owner_id, snapshot_date);

-- ============================================================================
-- SECTION 10: ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_transaction_items ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SECTION 11: RLS POLICIES - STORES
-- ============================================================================

CREATE POLICY "Users can view their own stores"
  ON stores FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert their own stores"
  ON stores FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own stores"
  ON stores FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own stores"
  ON stores FOR DELETE
  USING (auth.uid() = owner_id);

-- ============================================================================
-- SECTION 12: RLS POLICIES - PRODUCTS
-- ============================================================================

CREATE POLICY "Users can view their own products"
  ON products FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert products"
  ON products FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own products"
  ON products FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own products"
  ON products FOR DELETE
  USING (auth.uid() = owner_id);

-- ============================================================================
-- SECTION 13: RLS POLICIES - INVENTORY
-- ============================================================================

CREATE POLICY "Users can view stock levels of their products"
  ON stock_levels FOR SELECT
  USING (
    product_id IN (SELECT id FROM products WHERE owner_id = auth.uid())
  );

CREATE POLICY "Users can insert stock levels for their products"
  ON stock_levels FOR INSERT
  WITH CHECK (
    product_id IN (SELECT id FROM products WHERE owner_id = auth.uid())
  );

CREATE POLICY "Users can update stock levels of their products"
  ON stock_levels FOR UPDATE
  USING (
    product_id IN (SELECT id FROM products WHERE owner_id = auth.uid())
  );

CREATE POLICY "Users can view stock movements of their products"
  ON stock_movements FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert stock movements"
  ON stock_movements FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- ============================================================================
-- SECTION 14: RLS POLICIES - PURCHASE ORDERS
-- ============================================================================

CREATE POLICY "Users can view their purchase orders"
  ON purchase_orders FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert purchase orders"
  ON purchase_orders FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their purchase orders"
  ON purchase_orders FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own POs"
  ON purchase_orders FOR DELETE
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can view PO items of their orders"
  ON purchase_order_items FOR SELECT
  USING (
    purchase_order_id IN (SELECT id FROM purchase_orders WHERE owner_id = auth.uid())
  );

-- ============================================================================
-- SECTION 15: RLS POLICIES - SUPPLIERS & OTHERS
-- ============================================================================

CREATE POLICY "Users can view their suppliers"
  ON suppliers FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert suppliers"
  ON suppliers FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their suppliers"
  ON suppliers FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can view their AI predictions"
  ON ai_predictions FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can view their sales transactions"
  ON sales_transactions FOR SELECT
  USING (auth.uid() = owner_id);

-- ============================================================================
-- SECTION 16: MATERIALIZED VIEW REFRESH
-- ============================================================================

-- Schedule daily refresh (use pg_cron or application job)
-- SELECT cron.schedule('refresh_mv_product_health', '0 2 * * *', 
--   'REFRESH MATERIALIZED VIEW CONCURRENTLY mv_product_health');

-- ============================================================================
-- SECTION 17: AUDIT FUNCTION - STOCK LEVEL UPDATES
-- ============================================================================

CREATE OR REPLACE FUNCTION update_stock_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Update status based on quantity
  IF NEW.quantity_on_hand <= 0 THEN
    NEW.status := 'out_of_stock';
  ELSIF NEW.quantity_on_hand <= (
    SELECT minimum_stock_level FROM products WHERE id = NEW.product_id
  ) THEN
    NEW.status := 'low_stock';
  ELSIF NEW.quantity_on_hand >= (
    SELECT maximum_stock_level FROM products WHERE id = NEW.product_id
  ) THEN
    NEW.status := 'overstocked';
  ELSE
    NEW.status := 'in_stock';
  END IF;
  
  NEW.last_movement_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_update_stock_status
BEFORE UPDATE ON stock_levels
FOR EACH ROW
EXECUTE FUNCTION update_stock_status();

-- ============================================================================
-- SECTION 18: SEED DATA (OPTIONAL - Remove for production)
-- ============================================================================

-- Uncomment for demo/testing purposes only
-- INSERT INTO categories (owner_id, name, slug) VALUES
--   ((SELECT id FROM profiles LIMIT 1), 'Grains', 'grains'),
--   ((SELECT id FROM profiles LIMIT 1), 'Beverages', 'beverages'),
--   ((SELECT id FROM profiles LIMIT 1), 'Snacks', 'snacks');
