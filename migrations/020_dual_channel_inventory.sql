-- Migration 020: Dual-channel inventory pricing and stock verification
-- Adds trade pricing, stocktake variance, velocity, and MOQ tracking.

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS trade_price_kobo BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS expected_amount INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS actual_amount INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discrepancy_qty INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS monthly_velocity INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS days_of_supply INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS trade_moq INTEGER NOT NULL DEFAULT 1;

UPDATE products
SET trade_price_kobo = selling_price_kobo
WHERE trade_price_kobo = 0;

COMMENT ON COLUMN products.trade_price_kobo IS 'B2B wholesale/trade price in kobo';
COMMENT ON COLUMN products.expected_amount IS 'System/book stock count captured at last stocktake';
COMMENT ON COLUMN products.actual_amount IS 'Physical count entered during last stocktake';
COMMENT ON COLUMN products.discrepancy_qty IS 'Expected minus actual count from last stocktake';
COMMENT ON COLUMN products.monthly_velocity IS 'Estimated units sold or moved per month';
COMMENT ON COLUMN products.days_of_supply IS 'Estimated days before stock reaches zero';
COMMENT ON COLUMN products.trade_moq IS 'Minimum order quantity for trade customers';
