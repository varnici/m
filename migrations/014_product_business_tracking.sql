-- Migration 014: Add business tracking columns to products
-- Adds expenses_kobo, quantity_sold, quantity_on_credit for Nigerian SME inventory management

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS expenses_kobo BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quantity_sold INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quantity_on_credit INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN products.expenses_kobo IS 'Operational expenses in kobo (transport, storage, etc.)';
COMMENT ON COLUMN products.quantity_sold IS 'Total units sold for this product';
COMMENT ON COLUMN products.quantity_on_credit IS 'Units given out on credit (not yet paid)';
