-- =============================================================================
-- MAPVO / VENTUREROOT — CLEAN RESET DATABASE SCHEMA
-- Migration: 000_drop_all_tables.sql
-- =============================================================================

-- Create auth schema and mocks for local compatibility
CREATE SCHEMA IF NOT EXISTS auth;

CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid AS $$
  SELECT COALESCE(
    NULLIF(current_setting('request.jwt.claim.sub', true), ''),
    '56dca529-8e72-4ddc-b006-bc8e934bc6b5'
  )::uuid;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION auth.role() RETURNS text AS $$
  SELECT COALESCE(
    NULLIF(current_setting('request.jwt.claim.role', true), ''),
    'authenticated'
  );
$$ LANGUAGE sql STABLE;

DROP TABLE IF EXISTS stock_levels CASCADE;
DROP TABLE IF EXISTS stock_movements CASCADE;
DROP TABLE IF EXISTS purchase_order_items CASCADE;
DROP TABLE IF EXISTS purchase_orders CASCADE;
DROP TABLE IF EXISTS sales_transaction_items CASCADE;
DROP TABLE IF EXISTS sales_transactions CASCADE;
DROP TABLE IF EXISTS inventory_ledger_entries CASCADE;
DROP TABLE IF EXISTS inventory_idempotency_keys CASCADE;
DROP TABLE IF EXISTS domain_outbox_messages CASCADE;
DROP TABLE IF EXISTS inventory_reservations CASCADE;
DROP TABLE IF EXISTS savings_transactions CASCADE;
DROP TABLE IF EXISTS savings_streaks CASCADE;
DROP TABLE IF EXISTS savings_goals CASCADE;
DROP TABLE IF EXISTS reminder_settings CASCADE;
DROP TABLE IF EXISTS auto_sweep_settings CASCADE;
DROP TABLE IF EXISTS budget_buckets CASCADE;
DROP TABLE IF EXISTS policy_consents CASCADE;
DROP TABLE IF EXISTS inventory CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS suppliers CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS wallets CASCADE;
DROP TABLE IF EXISTS stores CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop custom types if they exist
DROP TYPE IF EXISTS store_type_enum CASCADE;
DROP TYPE IF EXISTS input_method_enum CASCADE;
DROP TYPE IF EXISTS movement_type_enum CASCADE;
DROP TYPE IF EXISTS stock_status_enum CASCADE;
DROP TYPE IF EXISTS savings_goal_status CASCADE;
DROP TYPE IF EXISTS savings_tx_type CASCADE;
DROP TYPE IF EXISTS savings_tx_status CASCADE;
