-- ============================================================================
-- INVENTORY DOMAIN FOUNDATION
-- Canonical ledger, idempotency keys, and outbox storage.
-- ============================================================================

CREATE TABLE IF NOT EXISTS inventory_ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  command_id UUID NOT NULL,
  idempotency_key TEXT NOT NULL,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,
  quantity_delta INTEGER NOT NULL,
  movement_type TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reason_code TEXT,
  reference_id TEXT,
  reference_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_ledger_owner_product_store
  ON inventory_ledger_entries(owner_id, product_id, store_id);
CREATE INDEX IF NOT EXISTS idx_inventory_ledger_command
  ON inventory_ledger_entries(command_id);
CREATE INDEX IF NOT EXISTS idx_inventory_ledger_occurred_at
  ON inventory_ledger_entries(owner_id, occurred_at DESC);

CREATE TABLE IF NOT EXISTS inventory_idempotency_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  idempotency_key TEXT NOT NULL,
  command_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_inventory_idem_owner_key UNIQUE(owner_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_inventory_idem_owner_created
  ON inventory_idempotency_keys(owner_id, created_at DESC);

CREATE TABLE IF NOT EXISTS domain_outbox_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic TEXT NOT NULL,
  event_type TEXT NOT NULL,
  owner_id UUID NOT NULL,
  command_id UUID NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_domain_outbox_status_created
  ON domain_outbox_messages(status, created_at);
CREATE INDEX IF NOT EXISTS idx_domain_outbox_owner_topic
  ON domain_outbox_messages(owner_id, topic);

