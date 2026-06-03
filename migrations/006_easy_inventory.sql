-- ============================================================
-- 006_easy_inventory.sql
-- Run in: Supabase → SQL Editor
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS inventory (
  id            UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  product_name  TEXT          NOT NULL CHECK (char_length(product_name) BETWEEN 1 AND 255),
  customer_id   TEXT          NOT NULL CHECK (char_length(customer_id) BETWEEN 1 AND 100),
  quantity      INTEGER       NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  pack_quantity INTEGER       NOT NULL DEFAULT 0 CHECK (pack_quantity >= 0),  -- units per pack
  product_cost  NUMERIC(14,2) NOT NULL CHECK (product_cost >= 0),
  price         NUMERIC(14,2) NOT NULL CHECK (price >= 0),
  sold          INTEGER       NOT NULL DEFAULT 0 CHECK (sold >= 0),
  -- Auto-calculated server-side (cannot be overwritten by client)
  profit        NUMERIC(14,2) GENERATED ALWAYS AS
                  (ROUND((price - product_cost) * sold, 2)) STORED,
  revenue       NUMERIC(14,2) GENERATED ALWAYS AS
                  (ROUND(price * sold, 2)) STORED,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Index for common queries
CREATE INDEX IF NOT EXISTS idx_inventory_customer  ON inventory (customer_id);
CREATE INDEX IF NOT EXISTS idx_inventory_created   ON inventory (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_product   ON inventory (product_name);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_inventory_updated_at ON inventory;
CREATE TRIGGER trg_inventory_updated_at
  BEFORE UPDATE ON inventory
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Row Level Security ─────────────────────────────────────
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;

-- Authenticated users can do everything
DROP POLICY IF EXISTS "authenticated_full_access" ON inventory;
CREATE POLICY "authenticated_full_access" ON inventory
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Service role (used by FastAPI backend) bypasses RLS automatically

-- ── Summary view ──────────────────────────────────────────
CREATE OR REPLACE VIEW inventory_summary AS
SELECT
  COUNT(*)                        AS total_items,
  COALESCE(SUM(sold), 0)          AS total_sold,
  COALESCE(SUM(revenue), 0)       AS total_revenue,
  COALESCE(SUM(profit), 0)        AS total_profit,
  CASE WHEN SUM(price) > 0
    THEN ROUND(SUM(profit) / NULLIF(SUM(revenue), 0) * 100, 1)
    ELSE 0
  END                             AS margin_pct
FROM inventory;
