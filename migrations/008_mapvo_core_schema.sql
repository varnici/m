-- =============================================================================
-- MAPVO / VENTUREROOT — MASTER SUPABASE MIGRATION
-- Migration: 008_mapvo_core_schema.sql
-- Run in: Supabase → SQL Editor (once, idempotent)
-- =============================================================================
-- This migration creates ALL core tables needed by the VentureRoot backend.
-- Tables are created in strict foreign-key dependency order:
--   users → wallets, stores, products, …
-- All tables have RLS enabled with per-user access policies.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- EXTENSIONS
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---------------------------------------------------------------------------
-- ENUM TYPES (idempotent)
-- ---------------------------------------------------------------------------

DO $$ BEGIN CREATE TYPE store_type_enum AS ENUM ('retail', 'warehouse', 'distribution');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE TYPE input_method_enum AS ENUM ('manual', 'voice', 'scan', 'api');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE TYPE movement_type_enum AS ENUM ('purchase', 'sale', 'adjustment', 'transfer', 'damage', 'return');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE TYPE stock_status_enum AS ENUM ('in_stock', 'low_stock', 'out_of_stock', 'overstocked', 'discontinued');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE TYPE savings_goal_status AS ENUM ('active', 'completed', 'paused', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE TYPE savings_tx_type AS ENUM ('deposit', 'withdrawal', 'interest', 'fee_rebate', 'adjustment');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE TYPE savings_tx_status AS ENUM ('pending', 'completed', 'failed', 'reversed');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ---------------------------------------------------------------------------
-- SECTION 1 — USERS (core identity table)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone           TEXT UNIQUE NOT NULL,
  email           TEXT UNIQUE,
  full_name       TEXT,
  category        TEXT NOT NULL DEFAULT 'personal'
                  CHECK (category IN ('personal', 'nine_to_five', 'business_owner')),
  business_name   TEXT,
  trading_name    TEXT,
  business_category TEXT,
  bank_name       TEXT,
  account_number  TEXT,
  tin             TEXT,
  ownership_type  TEXT CHECK (ownership_type IN ('sole_proprietorship', 'partnership', 'corporation')),
  registration_status TEXT CHECK (registration_status IN ('registered', 'unregistered', 'pending')),
  location        JSONB,
  profile_image_url TEXT,
  settings        JSONB DEFAULT '{}',
  hashed_pin      TEXT,
  hashed_pattern  TEXT,
  security_type   TEXT NOT NULL DEFAULT 'pin' CHECK (security_type IN ('pin', 'pattern')),
  trust_level     TEXT NOT NULL DEFAULT 'bronze'
                  CHECK (trust_level IN ('bronze', 'silver', 'gold', 'platinum')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_phone      ON users (phone);
CREATE INDEX IF NOT EXISTS idx_users_email      ON users (email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_category   ON users (category);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON users;
CREATE POLICY "Users can view own profile" ON users FOR SELECT
  USING (auth.uid()::text = id::text);

DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile" ON users FOR UPDATE
  USING (auth.uid()::text = id::text);

-- Service-role backend insert (no RLS bypass needed — service_role skips RLS by default)

-- ---------------------------------------------------------------------------
-- SECTION 2 — WALLETS
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS wallets (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  balance_kobo          BIGINT NOT NULL DEFAULT 0 CHECK (balance_kobo >= 0),
  credit_limit_kobo     BIGINT CHECK (credit_limit_kobo >= 0),
  available_credit_kobo BIGINT CHECK (available_credit_kobo >= 0),
  total_debt_kobo       BIGINT NOT NULL DEFAULT 0 CHECK (total_debt_kobo >= 0),
  next_repayment_date   TIMESTAMPTZ,
  repayment_amount_kobo BIGINT,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets (user_id);

ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own wallet" ON wallets;
CREATE POLICY "Users can view own wallet" ON wallets FOR SELECT
  USING (user_id::text = auth.uid()::text);

-- ---------------------------------------------------------------------------
-- SECTION 3 — TRANSACTIONS
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id       UUID REFERENCES wallets(id) ON DELETE CASCADE NOT NULL,
  amount_kobo     BIGINT NOT NULL,
  transaction_type TEXT NOT NULL,
  description     TEXT,
  reference       TEXT UNIQUE,
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'completed', 'failed', 'reversed')),
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_wallet_id    ON transactions (wallet_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at   ON transactions (wallet_id, created_at DESC);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;
CREATE POLICY "Users can view own transactions" ON transactions FOR SELECT
  USING (
    wallet_id IN (SELECT id FROM wallets WHERE user_id::text = auth.uid()::text)
  );

-- ---------------------------------------------------------------------------
-- SECTION 4 — STORES (multi-location)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS stores (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  name        TEXT NOT NULL,
  description TEXT,
  type        TEXT DEFAULT 'retail'
              CHECK (type IN ('retail', 'warehouse', 'distribution')),
  address     TEXT NOT NULL,
  city        TEXT NOT NULL,
  state       TEXT NOT NULL,
  latitude    DECIMAL(10, 8),
  longitude   DECIMAL(11, 8),
  phone       TEXT,
  email       TEXT,
  is_primary  BOOLEAN DEFAULT FALSE,
  status      TEXT DEFAULT 'active'
              CHECK (status IN ('active', 'inactive', 'closed')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS unique_primary_store_per_owner
  ON stores (owner_id) WHERE is_primary = TRUE;
CREATE INDEX IF NOT EXISTS idx_stores_owner_id ON stores (owner_id);
CREATE INDEX IF NOT EXISTS idx_stores_city     ON stores (city);

ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own stores" ON stores;
CREATE POLICY "Users can view own stores" ON stores FOR SELECT
  USING (owner_id::text = auth.uid()::text);
DROP POLICY IF EXISTS "Users can insert own stores" ON stores;
CREATE POLICY "Users can insert own stores" ON stores FOR INSERT
  WITH CHECK (owner_id::text = auth.uid()::text);
DROP POLICY IF EXISTS "Users can update own stores" ON stores;
CREATE POLICY "Users can update own stores" ON stores FOR UPDATE
  USING (owner_id::text = auth.uid()::text);
DROP POLICY IF EXISTS "Users can delete own stores" ON stores;
CREATE POLICY "Users can delete own stores" ON stores FOR DELETE
  USING (owner_id::text = auth.uid()::text);

-- ---------------------------------------------------------------------------
-- SECTION 5 — CATEGORIES
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL,
  description TEXT,
  parent_id   UUID REFERENCES categories(id) ON DELETE SET NULL,
  image_url   TEXT,
  is_active   BOOLEAN DEFAULT TRUE,
  position    INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_category_slug_per_owner UNIQUE (owner_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_categories_owner_id  ON categories (owner_id);
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories (parent_id);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own categories" ON categories;
CREATE POLICY "Users can manage own categories" ON categories FOR ALL
  USING (owner_id::text = auth.uid()::text)
  WITH CHECK (owner_id::text = auth.uid()::text);

-- ---------------------------------------------------------------------------
-- SECTION 6 — PRODUCTS
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS products (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id                UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  category_id             UUID REFERENCES categories(id) ON DELETE SET NULL,
  sku                     TEXT NOT NULL,
  barcode                 TEXT,
  qr_code                 TEXT,
  name                    TEXT NOT NULL,
  description             TEXT,
  brand                   TEXT,
  unit_of_measure         TEXT NOT NULL DEFAULT 'piece',
  cost_price_kobo         BIGINT NOT NULL CHECK (cost_price_kobo >= 0),
  selling_price_kobo      BIGINT NOT NULL CHECK (selling_price_kobo >= 0),
  minimum_stock_level     INTEGER NOT NULL DEFAULT 10 CHECK (minimum_stock_level >= 0),
  maximum_stock_level     INTEGER NOT NULL DEFAULT 1000 CHECK (maximum_stock_level > 0),
  reorder_quantity        INTEGER NOT NULL DEFAULT 100 CHECK (reorder_quantity > 0),
  supplier_lead_time_days INTEGER DEFAULT 7,
  is_perishable           BOOLEAN DEFAULT FALSE,
  shelf_life_days         INTEGER,
  requires_lot_tracking   BOOLEAN DEFAULT FALSE,
  nafdac_number           TEXT,
  image_url               TEXT,
  is_active               BOOLEAN DEFAULT TRUE,
  rating                  FLOAT DEFAULT 5.0,
  review_count            INTEGER DEFAULT 0,
  -- Marketplace fields
  unit_price_kobo         BIGINT,
  estate                  TEXT,
  city                    TEXT,
  latitude                FLOAT,
  longitude               FLOAT,
  -- Bulk/packaging
  parent_id               UUID REFERENCES products(id) ON DELETE SET NULL,
  conversion_factor       INTEGER DEFAULT 1,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_sku_per_owner UNIQUE (owner_id, sku)
);

CREATE INDEX IF NOT EXISTS idx_products_owner_id    ON products (owner_id);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products (category_id);
CREATE INDEX IF NOT EXISTS idx_products_sku         ON products (owner_id, sku);
CREATE INDEX IF NOT EXISTS idx_products_barcode     ON products (owner_id, barcode) WHERE barcode IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_owner_active ON products (owner_id, is_active);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own products" ON products;
CREATE POLICY "Users can manage own products" ON products FOR ALL
  USING (owner_id::text = auth.uid()::text)
  WITH CHECK (owner_id::text = auth.uid()::text);

-- ---------------------------------------------------------------------------
-- SECTION 7 — SUPPLIERS
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS suppliers (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id                  UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  name                      TEXT NOT NULL,
  contact_person            TEXT,
  phone                     TEXT NOT NULL,
  email                     TEXT,
  address                   TEXT NOT NULL,
  city                      TEXT NOT NULL,
  state                     TEXT NOT NULL,
  bank_name                 TEXT,
  bank_account_number       TEXT,
  payment_terms             TEXT DEFAULT 'net_30',
  lead_time_days            INTEGER DEFAULT 7,
  minimum_order_value_kobo  BIGINT DEFAULT 0,
  is_preferred              BOOLEAN DEFAULT FALSE,
  status                    TEXT DEFAULT 'active'
                            CHECK (status IN ('active', 'inactive', 'blacklisted')),
  rating                    DECIMAL(3, 2) DEFAULT 5.00,
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_suppliers_owner_id ON suppliers (owner_id);

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own suppliers" ON suppliers;
CREATE POLICY "Users can manage own suppliers" ON suppliers FOR ALL
  USING (owner_id::text = auth.uid()::text)
  WITH CHECK (owner_id::text = auth.uid()::text);

-- ---------------------------------------------------------------------------
-- SECTION 8 — STOCK LEVELS
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS stock_levels (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id        UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  store_id          UUID REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  quantity_on_hand  INTEGER NOT NULL DEFAULT 0 CHECK (quantity_on_hand >= 0),
  quantity_reserved INTEGER NOT NULL DEFAULT 0 CHECK (quantity_reserved >= 0),
  -- computed: quantity_available = quantity_on_hand - quantity_reserved
  -- Use a generated column (no FK — depends only on sibling columns)
  quantity_available INTEGER GENERATED ALWAYS AS (quantity_on_hand - quantity_reserved) STORED,
  status            stock_status_enum DEFAULT 'in_stock',
  last_counted_at   TIMESTAMPTZ,
  last_movement_at  TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_product_store UNIQUE (product_id, store_id)
);

CREATE INDEX IF NOT EXISTS idx_stock_levels_product_id ON stock_levels (product_id);
CREATE INDEX IF NOT EXISTS idx_stock_levels_store_id   ON stock_levels (store_id);
CREATE INDEX IF NOT EXISTS idx_stock_levels_status     ON stock_levels (store_id, status);

ALTER TABLE stock_levels ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own stock levels" ON stock_levels;
CREATE POLICY "Users can view own stock levels" ON stock_levels FOR SELECT
  USING (
    product_id IN (SELECT id FROM products WHERE owner_id::text = auth.uid()::text)
  );
DROP POLICY IF EXISTS "Backend can manage stock levels" ON stock_levels;
CREATE POLICY "Backend can manage stock levels" ON stock_levels FOR ALL
  USING (
    product_id IN (SELECT id FROM products WHERE owner_id::text = auth.uid()::text)
  )
  WITH CHECK (
    product_id IN (SELECT id FROM products WHERE owner_id::text = auth.uid()::text)
  );

-- ---------------------------------------------------------------------------
-- SECTION 9 — STOCK MOVEMENTS
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS stock_movements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      UUID REFERENCES products(id) ON DELETE RESTRICT NOT NULL,
  from_store_id   UUID REFERENCES stores(id) ON DELETE SET NULL,
  to_store_id     UUID REFERENCES stores(id) ON DELETE SET NULL,
  movement_type   TEXT NOT NULL
                  CHECK (movement_type IN ('purchase', 'sale', 'adjustment', 'transfer', 'damage', 'return')),
  input_method    TEXT DEFAULT 'manual'
                  CHECK (input_method IN ('manual', 'voice', 'scan', 'api')),
  quantity        INTEGER NOT NULL CHECK (quantity > 0),
  reference_id    TEXT,
  reference_type  TEXT,
  notes           TEXT,
  voice_input_raw TEXT,
  staff_id        UUID REFERENCES users(id) ON DELETE SET NULL,
  owner_id        UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_product_id  ON stock_movements (product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_owner_id    ON stock_movements (owner_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at  ON stock_movements (owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_movements_reference   ON stock_movements (reference_type, reference_id);

ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own stock movements" ON stock_movements;
CREATE POLICY "Users can manage own stock movements" ON stock_movements FOR ALL
  USING (owner_id::text = auth.uid()::text)
  WITH CHECK (owner_id::text = auth.uid()::text);

-- ---------------------------------------------------------------------------
-- SECTION 10 — PURCHASE ORDERS
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS purchase_orders (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id               UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  supplier_id            UUID REFERENCES suppliers(id) ON DELETE RESTRICT NOT NULL,
  store_id               UUID REFERENCES stores(id) ON DELETE RESTRICT NOT NULL,
  po_number              TEXT NOT NULL,
  status                 TEXT DEFAULT 'draft'
                         CHECK (status IN ('draft', 'pending', 'confirmed', 'shipped', 'received', 'cancelled')),
  total_amount_kobo      BIGINT NOT NULL DEFAULT 0 CHECK (total_amount_kobo >= 0),
  expected_delivery_date DATE,
  actual_delivery_date   DATE,
  notes                  TEXT,
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  updated_at             TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_po_number_per_owner UNIQUE (owner_id, po_number)
);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_owner_id    ON purchase_orders (owner_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier_id ON purchase_orders (supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status      ON purchase_orders (owner_id, status);

ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own purchase orders" ON purchase_orders;
CREATE POLICY "Users can manage own purchase orders" ON purchase_orders FOR ALL
  USING (owner_id::text = auth.uid()::text)
  WITH CHECK (owner_id::text = auth.uid()::text);

CREATE TABLE IF NOT EXISTS purchase_order_items (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id   UUID REFERENCES purchase_orders(id) ON DELETE CASCADE NOT NULL,
  product_id          UUID REFERENCES products(id) ON DELETE RESTRICT NOT NULL,
  quantity_ordered    INTEGER NOT NULL CHECK (quantity_ordered > 0),
  quantity_received   INTEGER NOT NULL DEFAULT 0 CHECK (quantity_received >= 0),
  unit_price_kobo     BIGINT NOT NULL CHECK (unit_price_kobo >= 0),
  line_total_kobo     BIGINT NOT NULL CHECK (line_total_kobo >= 0),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_po_items_purchase_order_id ON purchase_order_items (purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_po_items_product_id        ON purchase_order_items (product_id);

ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own PO items" ON purchase_order_items;
CREATE POLICY "Users can manage own PO items" ON purchase_order_items FOR ALL
  USING (
    purchase_order_id IN (SELECT id FROM purchase_orders WHERE owner_id::text = auth.uid()::text)
  )
  WITH CHECK (
    purchase_order_id IN (SELECT id FROM purchase_orders WHERE owner_id::text = auth.uid()::text)
  );

-- ---------------------------------------------------------------------------
-- SECTION 11 — SALES TRANSACTIONS
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS sales_transactions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id            UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  store_id            UUID REFERENCES stores(id) ON DELETE SET NULL,
  customer_id         UUID REFERENCES users(id) ON DELETE SET NULL,
  customer_name       TEXT,
  customer_phone      TEXT,
  total_amount_kobo   BIGINT NOT NULL CHECK (total_amount_kobo >= 0),
  discount_amount_kobo BIGINT DEFAULT 0 CHECK (discount_amount_kobo >= 0),
  payment_method      TEXT,
  status              TEXT DEFAULT 'completed'
                      CHECK (status IN ('completed', 'pending', 'processing', 'shipped', 'delivered', 'cancelled')),
  order_type          TEXT DEFAULT 'pos' CHECK (order_type IN ('pos', 'online')),
  shipping_address    TEXT,
  shipping_city       TEXT,
  shipping_state      TEXT,
  shipping_fee_kobo   BIGINT DEFAULT 0 CHECK (shipping_fee_kobo >= 0),
  notes               TEXT,
  transaction_date    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sales_transactions_owner_date ON sales_transactions (owner_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_sales_transactions_store_date ON sales_transactions (store_id, transaction_date DESC);

ALTER TABLE sales_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own sales" ON sales_transactions;
CREATE POLICY "Users can manage own sales" ON sales_transactions FOR ALL
  USING (owner_id::text = auth.uid()::text)
  WITH CHECK (owner_id::text = auth.uid()::text);

CREATE TABLE IF NOT EXISTS sales_transaction_items (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id          UUID REFERENCES sales_transactions(id) ON DELETE CASCADE NOT NULL,
  product_id       UUID REFERENCES products(id) ON DELETE RESTRICT NOT NULL,
  quantity_sold    INTEGER NOT NULL CHECK (quantity_sold > 0),
  unit_price_kobo  BIGINT NOT NULL CHECK (unit_price_kobo >= 0),
  line_total_kobo  BIGINT NOT NULL CHECK (line_total_kobo >= 0),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sales_items_sale_id    ON sales_transaction_items (sale_id);
CREATE INDEX IF NOT EXISTS idx_sales_items_product_id ON sales_transaction_items (product_id);

ALTER TABLE sales_transaction_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own sale items" ON sales_transaction_items;
CREATE POLICY "Users can manage own sale items" ON sales_transaction_items FOR ALL
  USING (
    sale_id IN (SELECT id FROM sales_transactions WHERE owner_id::text = auth.uid()::text)
  )
  WITH CHECK (
    sale_id IN (SELECT id FROM sales_transactions WHERE owner_id::text = auth.uid()::text)
  );

-- ---------------------------------------------------------------------------
-- SECTION 12 — INVENTORY DOMAIN LEDGER (Immutable audit log)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS inventory_ledger_entries (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id         UUID NOT NULL,
  command_id       UUID NOT NULL,
  idempotency_key  TEXT NOT NULL,
  product_id       UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  store_id         UUID NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,
  quantity_delta   INTEGER NOT NULL,
  movement_type    TEXT NOT NULL,
  occurred_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reason_code      TEXT,
  reference_id     TEXT,
  reference_type   TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_ledger_owner_product_store
  ON inventory_ledger_entries (owner_id, product_id, store_id);
CREATE INDEX IF NOT EXISTS idx_inventory_ledger_command
  ON inventory_ledger_entries (command_id);
CREATE INDEX IF NOT EXISTS idx_inventory_ledger_occurred_at
  ON inventory_ledger_entries (owner_id, occurred_at DESC);

ALTER TABLE inventory_ledger_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own ledger entries" ON inventory_ledger_entries;
CREATE POLICY "Users can view own ledger entries" ON inventory_ledger_entries FOR SELECT
  USING (owner_id::text = auth.uid()::text);

CREATE TABLE IF NOT EXISTS inventory_idempotency_keys (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id         UUID NOT NULL,
  idempotency_key  TEXT NOT NULL,
  command_id       UUID NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_inventory_idem_owner_key UNIQUE (owner_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_inventory_idem_owner_created
  ON inventory_idempotency_keys (owner_id, created_at DESC);

ALTER TABLE inventory_idempotency_keys ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Backend manages idempotency keys" ON inventory_idempotency_keys;
CREATE POLICY "Backend manages idempotency keys" ON inventory_idempotency_keys FOR ALL
  USING (owner_id::text = auth.uid()::text)
  WITH CHECK (owner_id::text = auth.uid()::text);

CREATE TABLE IF NOT EXISTS domain_outbox_messages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic         TEXT NOT NULL,
  event_type    TEXT NOT NULL,
  owner_id      UUID NOT NULL,
  command_id    UUID NOT NULL,
  payload       JSONB NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'published', 'failed')),
  error_message TEXT,
  published_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_domain_outbox_status_created
  ON domain_outbox_messages (status, created_at);
CREATE INDEX IF NOT EXISTS idx_domain_outbox_owner_topic
  ON domain_outbox_messages (owner_id, topic);

ALTER TABLE domain_outbox_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Backend manages outbox" ON domain_outbox_messages;
CREATE POLICY "Backend manages outbox" ON domain_outbox_messages FOR ALL
  USING (owner_id::text = auth.uid()::text)
  WITH CHECK (owner_id::text = auth.uid()::text);

-- ---------------------------------------------------------------------------
-- SECTION 13 — INVENTORY RESERVATIONS
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS inventory_reservations (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id            UUID NOT NULL,
  product_id          UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  store_id            UUID NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,
  status              TEXT NOT NULL DEFAULT 'active'
                      CHECK (status IN ('active', 'released', 'committed', 'expired', 'cancelled')),
  purpose             TEXT NOT NULL DEFAULT 'sale',
  quantity_reserved   INTEGER NOT NULL CHECK (quantity_reserved > 0),
  quantity_committed  INTEGER NOT NULL DEFAULT 0 CHECK (quantity_committed >= 0),
  quantity_released   INTEGER NOT NULL DEFAULT 0 CHECK (quantity_released >= 0),
  reference_id        TEXT,
  reference_type      TEXT,
  notes               TEXT,
  expires_at          TIMESTAMPTZ,
  released_at         TIMESTAMPTZ,
  committed_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_reservations_owner_status
  ON inventory_reservations (owner_id, status);
CREATE INDEX IF NOT EXISTS idx_inventory_reservations_owner_product_store
  ON inventory_reservations (owner_id, product_id, store_id);
CREATE INDEX IF NOT EXISTS idx_inventory_reservations_created_at
  ON inventory_reservations (owner_id, created_at DESC);

ALTER TABLE inventory_reservations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own reservations" ON inventory_reservations;
CREATE POLICY "Users can manage own reservations" ON inventory_reservations FOR ALL
  USING (owner_id::text = auth.uid()::text)
  WITH CHECK (owner_id::text = auth.uid()::text);

-- ---------------------------------------------------------------------------
-- SECTION 14 — SAVINGS GOALS (Budget Best)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS savings_goals (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  title                 TEXT NOT NULL,
  description           TEXT,
  category              TEXT NOT NULL DEFAULT 'General'
                        CHECK (category IN ('Rent', 'Salary', 'Bills', 'Education',
                                            'Health', 'Business', 'Emergency', 'General')),
  target_amount_kobo    BIGINT NOT NULL CHECK (target_amount_kobo > 0),
  current_total_kobo    BIGINT NOT NULL DEFAULT 0 CHECK (current_total_kobo >= 0),
  currency              TEXT NOT NULL DEFAULT 'NGN',
  status                savings_goal_status DEFAULT 'active',
  is_auto_save_enabled  BOOLEAN DEFAULT FALSE,
  auto_save_amount_kobo BIGINT DEFAULT 0,
  auto_save_frequency   TEXT CHECK (auto_save_frequency IN ('daily', 'weekly', 'monthly')),
  target_date           DATE,
  image_url             TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_savings_goals_user_id ON savings_goals (user_id);
CREATE INDEX IF NOT EXISTS idx_savings_goals_status  ON savings_goals (user_id, status);

ALTER TABLE savings_goals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own savings goals" ON savings_goals;
CREATE POLICY "Users can manage own savings goals" ON savings_goals FOR ALL
  USING (user_id::text = auth.uid()::text)
  WITH CHECK (user_id::text = auth.uid()::text);

-- ---------------------------------------------------------------------------
-- SECTION 15 — SAVINGS TRANSACTIONS
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS savings_transactions (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id                   UUID REFERENCES savings_goals(id) ON DELETE CASCADE NOT NULL,
  user_id                   UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  amount_kobo               BIGINT NOT NULL CHECK (amount_kobo <> 0),
  transaction_type          savings_tx_type NOT NULL,
  status                    savings_tx_status DEFAULT 'pending',
  management_fee_kobo       BIGINT DEFAULT 0,
  partner_commission_kobo   BIGINT DEFAULT 0,
  reference                 TEXT UNIQUE,
  source                    TEXT DEFAULT 'manual'
                            CHECK (source IN ('manual', 'auto_sweep', 'sales_hook')),
  transaction_metadata      JSONB,
  notes                     TEXT,
  created_at                TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_savings_tx_goal_id    ON savings_transactions (goal_id);
CREATE INDEX IF NOT EXISTS idx_savings_tx_user_id    ON savings_transactions (user_id);
CREATE INDEX IF NOT EXISTS idx_savings_tx_created_at ON savings_transactions (user_id, created_at DESC);

ALTER TABLE savings_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own savings transactions" ON savings_transactions;
CREATE POLICY "Users can manage own savings transactions" ON savings_transactions FOR ALL
  USING (user_id::text = auth.uid()::text)
  WITH CHECK (user_id::text = auth.uid()::text);

-- ---------------------------------------------------------------------------
-- SECTION 16 — SAVINGS STREAKS (gamification)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS savings_streaks (
  user_id              UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  last_deposit_date    DATE,
  streak_count         INTEGER DEFAULT 0 CHECK (streak_count >= 0),
  longest_streak       INTEGER DEFAULT 0 CHECK (longest_streak >= 0),
  total_savings_count  INTEGER DEFAULT 0,
  last_streak_update   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE savings_streaks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own streak" ON savings_streaks;
CREATE POLICY "Users can manage own streak" ON savings_streaks FOR ALL
  USING (user_id::text = auth.uid()::text)
  WITH CHECK (user_id::text = auth.uid()::text);

-- ---------------------------------------------------------------------------
-- SECTION 17 — EASY INVENTORY (lightweight simple inventory)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS inventory (
  id            UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  product_name  TEXT          NOT NULL CHECK (char_length(product_name) BETWEEN 1 AND 255),
  customer_id   TEXT          NOT NULL CHECK (char_length(customer_id) BETWEEN 1 AND 100),
  quantity      INTEGER       NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  pack_quantity INTEGER       NOT NULL DEFAULT 0 CHECK (pack_quantity >= 0),
  product_cost  NUMERIC(14,2) NOT NULL CHECK (product_cost >= 0),
  price         NUMERIC(14,2) NOT NULL CHECK (price >= 0),
  sold          INTEGER       NOT NULL DEFAULT 0 CHECK (sold >= 0),
  profit        NUMERIC(14,2) GENERATED ALWAYS AS (ROUND((price - product_cost) * sold, 2)) STORED,
  revenue       NUMERIC(14,2) GENERATED ALWAYS AS (ROUND(price * sold, 2)) STORED,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_customer  ON inventory (customer_id);
CREATE INDEX IF NOT EXISTS idx_inventory_created   ON inventory (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_product   ON inventory (product_name);

ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users access inventory" ON inventory;
CREATE POLICY "Authenticated users access inventory" ON inventory FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ---------------------------------------------------------------------------
-- SECTION 18 — TRIGGERS
-- ---------------------------------------------------------------------------

-- Auto-update updated_at on stock_levels
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DO $$ DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['stores', 'categories', 'products', 'suppliers',
    'stock_levels', 'purchase_orders', 'purchase_order_items', 'savings_goals', 'inventory']
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_%s_updated_at ON %s;
       CREATE TRIGGER trg_%s_updated_at
         BEFORE UPDATE ON %s
         FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();',
      t, t, t, t
    );
  END LOOP;
END $$;

-- Savings goal total updater
CREATE OR REPLACE FUNCTION update_savings_goal_total()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status <> 'completed') THEN
    UPDATE savings_goals
    SET current_total_kobo = current_total_kobo + NEW.amount_kobo,
        updated_at = NOW()
    WHERE id = NEW.goal_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_update_savings_goal_total ON savings_transactions;
CREATE TRIGGER tr_update_savings_goal_total
  AFTER INSERT OR UPDATE ON savings_transactions
  FOR EACH ROW EXECUTE FUNCTION update_savings_goal_total();

-- Savings streak updater
CREATE OR REPLACE FUNCTION update_savings_streak()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  today DATE := CURRENT_DATE;
BEGIN
  IF NEW.transaction_type = 'deposit' AND NEW.status = 'completed' THEN
    INSERT INTO savings_streaks (user_id, last_deposit_date, streak_count, longest_streak, total_savings_count)
    VALUES (NEW.user_id, today, 1, 1, 1)
    ON CONFLICT (user_id) DO UPDATE SET
      streak_count = CASE
        WHEN savings_streaks.last_deposit_date = today THEN savings_streaks.streak_count
        WHEN savings_streaks.last_deposit_date = today - INTERVAL '1 day' THEN savings_streaks.streak_count + 1
        ELSE 1
      END,
      longest_streak = GREATEST(savings_streaks.longest_streak,
        CASE
          WHEN savings_streaks.last_deposit_date = today THEN savings_streaks.streak_count
          WHEN savings_streaks.last_deposit_date = today - INTERVAL '1 day' THEN savings_streaks.streak_count + 1
          ELSE 1
        END
      ),
      last_deposit_date = today,
      total_savings_count = savings_streaks.total_savings_count + 1,
      last_streak_update = NOW();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_update_savings_streak ON savings_transactions;
CREATE TRIGGER tr_update_savings_streak
  AFTER INSERT OR UPDATE ON savings_transactions
  FOR EACH ROW EXECUTE FUNCTION update_savings_streak();

-- Stock status auto-updater
CREATE OR REPLACE FUNCTION update_stock_status()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
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
$$;

DROP TRIGGER IF EXISTS tr_update_stock_status ON stock_levels;
CREATE TRIGGER tr_update_stock_status
  BEFORE UPDATE ON stock_levels
  FOR EACH ROW EXECUTE FUNCTION update_stock_status();

-- ---------------------------------------------------------------------------
-- SECTION 19 — INVENTORY SUMMARY VIEW
-- ---------------------------------------------------------------------------

CREATE OR REPLACE VIEW inventory_summary AS
SELECT
  COUNT(*)                          AS total_items,
  COALESCE(SUM(sold), 0)            AS total_sold,
  COALESCE(SUM(revenue), 0)         AS total_revenue,
  COALESCE(SUM(profit), 0)          AS total_profit,
  CASE WHEN SUM(price) > 0
    THEN ROUND(SUM(profit) / NULLIF(SUM(revenue), 0) * 100, 1)
    ELSE 0
  END                               AS margin_pct
FROM inventory;

-- =============================================================================
-- END OF MIGRATION
-- All MAPVO/VentureRoot tables created with RLS, indexes, and triggers.
-- =============================================================================
