-- ============================================================================
-- INVENTORY RESERVATIONS
-- Reserve / release / commit flow foundation.
-- ============================================================================

CREATE TABLE IF NOT EXISTS inventory_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'released', 'committed', 'expired', 'cancelled')),
  purpose TEXT NOT NULL DEFAULT 'sale',
  quantity_reserved INTEGER NOT NULL CHECK (quantity_reserved > 0),
  quantity_committed INTEGER NOT NULL DEFAULT 0 CHECK (quantity_committed >= 0),
  quantity_released INTEGER NOT NULL DEFAULT 0 CHECK (quantity_released >= 0),
  reference_id TEXT,
  reference_type TEXT,
  notes TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  released_at TIMESTAMPTZ,
  committed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_inventory_reservations_owner_status
  ON inventory_reservations(owner_id, status);
CREATE INDEX IF NOT EXISTS idx_inventory_reservations_owner_product_store
  ON inventory_reservations(owner_id, product_id, store_id);
CREATE INDEX IF NOT EXISTS idx_inventory_reservations_owner_created
  ON inventory_reservations(owner_id, created_at DESC);

