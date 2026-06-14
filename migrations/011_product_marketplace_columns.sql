-- Marketplace compatibility columns expected by core-banking Product model
ALTER TABLE products ADD COLUMN IF NOT EXISTS unit_price_kobo BIGINT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS estate VARCHAR;
ALTER TABLE products ADD COLUMN IF NOT EXISTS city VARCHAR;
ALTER TABLE products ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE products ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
