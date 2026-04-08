-- Retail Onboarding Fixup Migration
-- Adds columns for dynamic location paths in Screen 6

ALTER TABLE public.businesses 
ADD COLUMN IF NOT EXISTS is_physical_store BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS service_areas TEXT[], -- For multi-select LGAs (Mobile Traders)
ADD COLUMN IF NOT EXISTS stock_photo_uri TEXT; -- For inventory snapshot (Mobile Traders)

-- Note: We are keeping monthly_sales_range and avg_daily_sales for future AI analysis results, 
-- but they will be skipped during manual user onboarding.
