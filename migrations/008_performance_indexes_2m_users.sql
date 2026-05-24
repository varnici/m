-- ============================================================================
-- PERFORMANCE INDEXES FOR 2M USERS SCALABILITY
-- This migration adds critical composite indexes, partitioning hints, and
-- materialized views to support fast queries at 2 million user scale.
-- ============================================================================

-- ============================================================================
-- COMPOSITE INDEXES FOR COMMON QUERY PATTERNS
-- ============================================================================

-- Savings queries (user_id + date range)
CREATE INDEX IF NOT EXISTS idx_savings_transactions_user_date
  ON savings_transactions(user_id, created_at DESC)
  WHERE status = 'completed';

CREATE INDEX IF NOT EXISTS idx_savings_goals_user_active_deadline
  ON savings_goals(user_id, is_active, deadline);

-- Inventory queries (owner + product + store)
CREATE INDEX IF NOT EXISTS idx_inventory_ledger_owner_date_type
  ON inventory_ledger_entries(owner_id, created_at DESC, movement_type);

-- Ledger entry lookups for deduplication
CREATE INDEX IF NOT EXISTS idx_inventory_ledger_owner_idem
  ON inventory_ledger_entries(owner_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- Outbox queries for event publishing
CREATE INDEX IF NOT EXISTS idx_domain_outbox_published
  ON domain_outbox_messages(status, published_at, created_at DESC)
  WHERE status IN ('pending', 'retry');

-- ============================================================================
-- PARTIAL INDEXES FOR ACTIVE/UNRESOLVED RECORDS
-- These significantly reduce index size and improve lookup speed
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_savings_goals_active_user
  ON savings_goals(user_id, current_savings, deadline)
  WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_auto_sweep_enabled
  ON auto_sweep_settings(user_id, auto_save_time)
  WHERE auto_save_enabled = TRUE;

CREATE INDEX IF NOT EXISTS idx_reminder_enabled
  ON reminder_settings(user_id, next_reminder_at)
  WHERE reminder_enabled = TRUE;

-- ============================================================================
-- TEXT/SEARCH INDEXES (for RAG and product search)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_products_name_trgm
  ON products USING GIN (lower(name) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_products_sku_trgm
  ON products USING GIN (lower(sku) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_products_owner_barcode
  ON products(owner_id, barcode)
  WHERE barcode IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_domain_outbox_payload_gin
  ON domain_outbox_messages USING GIN(payload);

-- High-volume inventory and sales reads
CREATE INDEX IF NOT EXISTS idx_stock_levels_store_status_product
  ON stock_levels(store_id, status, product_id);

CREATE INDEX IF NOT EXISTS idx_stock_levels_product_store_covering
  ON stock_levels(product_id, store_id)
  INCLUDE (quantity_on_hand, quantity_reserved, status);

CREATE INDEX IF NOT EXISTS idx_stock_movements_owner_created
  ON stock_movements(owner_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_stock_movements_owner_product_created
  ON stock_movements(owner_id, product_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sales_transactions_owner_date
  ON sales_transactions(owner_id, transaction_date DESC);

CREATE INDEX IF NOT EXISTS idx_sales_transactions_owner_store_date
  ON sales_transactions(owner_id, store_id, transaction_date DESC)
  WHERE store_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sales_items_product_sale
  ON sales_transaction_items(product_id, sale_id);

CREATE INDEX IF NOT EXISTS idx_inventory_reservations_active_lookup
  ON inventory_reservations(owner_id, product_id, store_id, created_at DESC)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_inventory_reservations_expiry
  ON inventory_reservations(expires_at)
  WHERE status = 'active' AND expires_at IS NOT NULL;

-- VentureRoute hot paths
CREATE INDEX IF NOT EXISTS idx_logistics_requests_pending_cluster
  ON logistics_requests(manufacturer_id, status, priority DESC, requested_at)
  WHERE status = 'pending_grouping';

CREATE INDEX IF NOT EXISTS idx_route_members_route_status
  ON route_members(route_id, status);

CREATE INDEX IF NOT EXISTS idx_wallet_freezes_route_user_active
  ON wallet_freezes(route_id, user_id)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_qr_codes_active_code
  ON qr_codes(code_value)
  WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_qr_handshakes_qr_valid_type
  ON qr_handshakes(qr_code_id, is_valid, handshake_type, scanned_at DESC);

-- ============================================================================
-- CONSTRAINT INDEXES (already created but ensuring coverage)
-- ============================================================================

-- Unique constraint on idempotency for deduplication
CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_idem_unique
  ON inventory_idempotency_keys(owner_id, idempotency_key);

CREATE UNIQUE INDEX IF NOT EXISTS idx_auto_sweep_settings_unique
  ON auto_sweep_settings(user_id, goal_id);

-- ============================================================================
-- PERFORMANCE HINTS & TABLE STATS
-- ============================================================================

-- Analyze tables after index creation for query planner optimization
ANALYZE savings_goals;
ANALYZE savings_transactions;
ANALYZE savings_streaks;
ANALYZE inventory_ledger_entries;
ANALYZE inventory_idempotency_keys;
ANALYZE domain_outbox_messages;
ANALYZE auto_sweep_settings;
ANALYZE reminder_settings;
ANALYZE budget_buckets;
ANALYZE transaction_logs;

-- ============================================================================
-- MATERIALIZED VIEW FOR AGGREGATED USER STATS (Performance optimization)
-- Refreshable view for dashboard queries - prevents repeated aggregations
-- ============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS user_savings_summary AS
  SELECT
    sg.user_id,
    COUNT(DISTINCT sg.id) as total_goals,
    COUNT(DISTINCT CASE WHEN sg.is_active = TRUE THEN sg.id END) as active_goals,
    SUM(sg.target_amount) as total_target_amount,
    SUM(sg.current_savings) as total_current_savings,
    AVG(sg.current_savings / NULLIF(sg.target_amount, 0)) as avg_progress,
    MAX(sg.deadline) as next_deadline,
    MAX(sg.updated_at) as last_updated
  FROM savings_goals sg
  GROUP BY sg.user_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_savings_summary_user_id
  ON user_savings_summary(user_id);

-- ============================================================================
-- MATERIALIZED VIEW FOR ACTIVE REMINDERS (Performance optimization)
-- Used for batch reminder dispatch - prevents full table scans
-- ============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS active_reminders_for_dispatch AS
  SELECT
    rs.id,
    rs.user_id,
    rs.goal_id,
    rs.reminder_time,
    rs.reminder_frequency,
    rs.next_reminder_at,
    sg.goal_name,
    sg.current_savings,
    sg.target_amount
  FROM reminder_settings rs
  JOIN savings_goals sg ON rs.goal_id = sg.id
  WHERE rs.reminder_enabled = TRUE
    AND rs.next_reminder_at <= NOW()
    AND sg.is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_active_reminders_dispatch_time
  ON active_reminders_for_dispatch(next_reminder_at);

-- ============================================================================
-- MATERIALIZED VIEW FOR INVENTORY METRICS (Dashboard Performance)
-- Prevents expensive aggregations on production queries
-- ============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS inventory_daily_metrics AS
  SELECT
    owner_id,
    DATE(occurred_at) as date,
    movement_type,
    COUNT(*) as transaction_count,
    SUM(CASE WHEN quantity_delta > 0 THEN quantity_delta ELSE 0 END) as total_in,
    SUM(CASE WHEN quantity_delta < 0 THEN ABS(quantity_delta) ELSE 0 END) as total_out,
    COUNT(DISTINCT product_id) as unique_products,
    COUNT(DISTINCT store_id) as unique_stores
  FROM inventory_ledger_entries
  WHERE occurred_at >= NOW() - INTERVAL '90 days'
  GROUP BY owner_id, DATE(occurred_at), movement_type;

CREATE INDEX IF NOT EXISTS idx_inventory_metrics_owner_date
  ON inventory_daily_metrics(owner_id, date DESC);

-- ============================================================================
-- REFRESH SCHEDULE HINTS (Manual refresh recommended)
-- For production systems, set up automated refresh during off-peak hours
-- ============================================================================

-- Manual refresh commands (run during off-peak hours):
-- REFRESH MATERIALIZED VIEW CONCURRENTLY user_savings_summary;
-- REFRESH MATERIALIZED VIEW CONCURRENTLY active_reminders_for_dispatch;
-- REFRESH MATERIALIZED VIEW CONCURRENTLY inventory_daily_metrics;

-- ============================================================================
-- CONSTRAINT AND VALIDATION IMPROVEMENTS
-- ============================================================================

-- Add check constraints idempotently for data integrity at scale
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_savings_amounts_positive'
  ) THEN
    ALTER TABLE savings_goals
      ADD CONSTRAINT check_savings_amounts_positive
      CHECK (target_amount > 0 AND monthly_goal > 0 AND current_savings >= 0);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_transaction_amount_positive'
  ) THEN
    ALTER TABLE savings_transactions
      ADD CONSTRAINT check_transaction_amount_positive
      CHECK (amount > 0);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_valid_movement_type'
  ) THEN
    ALTER TABLE inventory_ledger_entries
      ADD CONSTRAINT check_valid_movement_type
      CHECK (movement_type IN ('in', 'out', 'adjustment', 'transfer', 'return'));
  END IF;
END $$;

-- ============================================================================
-- RECOMMENDATIONS FOR 2M USER SCALABILITY
-- ============================================================================

-- 1. TABLE PARTITIONING (future migration)
--    Partition savings_transactions BY RANGE (created_at) - monthly
--    Partition inventory_ledger_entries BY RANGE (occurred_at) - quarterly
--
-- 2. CONNECTION POOLING
--    - Use PgBouncer or pgpool-II in front of database
--    - Set pool size to: 2x (max_connections / number_of_services)
--    - For 100 max_connections: 2x (100/5 services) = 40 connections per service
--
-- 3. CACHING LAYER (in application)
--    - Cache user_savings_summary results for 5 minutes
--    - Cache active_reminders_for_dispatch results for 2 minutes
--    - Cache product lookups by product_id with 1 hour TTL
--
-- 4. READ REPLICAS
--    - Set up 1-2 read replicas for reports and analytics
--    - Use read replica for all dashboard queries
--    - Keep primary for transactions
--
-- 5. QUERY OPTIMIZATION
--    - Use EXPLAIN ANALYZE on production queries
--    - Monitor slow query log (log_min_duration_statement = 1000)
--    - Target: 95% of queries < 200ms

COMMIT;
