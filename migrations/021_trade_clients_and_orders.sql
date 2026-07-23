-- Migration 021: Trade clients and trade orders (B2B invoicing desk)
-- Persists the Hold/Allocate -> Finalize/Dispatch order lifecycle. Each line
-- stores the stock reservation id it was held against, so dispatch commits
-- that exact reservation instead of re-reserving from scratch.

CREATE TABLE IF NOT EXISTS trade_clients (
  id                     TEXT PRIMARY KEY,
  owner_id               TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_name           TEXT NOT NULL,
  vat_number             TEXT,
  delivery_address       TEXT,
  contact_phone          TEXT,
  contact_email          TEXT,
  default_payment_terms  TEXT NOT NULL DEFAULT 'immediate',
  is_active              BOOLEAN NOT NULL DEFAULT TRUE,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_trade_clients_owner_id ON trade_clients(owner_id);

CREATE TABLE IF NOT EXISTS trade_orders (
  id              TEXT PRIMARY KEY,
  owner_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id       TEXT NOT NULL REFERENCES trade_clients(id) ON DELETE RESTRICT,
  store_id        TEXT NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,
  status          TEXT NOT NULL DEFAULT 'draft',
  payment_terms   TEXT NOT NULL DEFAULT 'immediate',
  total_kobo      BIGINT NOT NULL DEFAULT 0 CHECK (total_kobo >= 0),
  sale_id         TEXT REFERENCES sales_transactions(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_trade_orders_owner_id ON trade_orders(owner_id);
CREATE INDEX IF NOT EXISTS ix_trade_orders_client_id ON trade_orders(client_id);

CREATE TABLE IF NOT EXISTS trade_order_lines (
  id               TEXT PRIMARY KEY,
  trade_order_id   TEXT NOT NULL REFERENCES trade_orders(id) ON DELETE CASCADE,
  product_id       TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity         INTEGER NOT NULL CHECK (quantity > 0),
  unit_price_kobo  BIGINT NOT NULL CHECK (unit_price_kobo >= 0),
  reservation_id   TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_trade_order_lines_trade_order_id ON trade_order_lines(trade_order_id);
