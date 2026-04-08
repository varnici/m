-- Retail Onboarding Migration
-- Extends profiles and adds the businesses table for the 15-screen funnel.

-- 1. Extend Profiles Table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS full_name TEXT,
ADD COLUMN IF NOT EXISTS date_of_birth DATE,
ADD COLUMN IF NOT EXISTS gender TEXT,
ADD COLUMN IF NOT EXISTS nationality TEXT DEFAULT 'Nigerian',
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS nin TEXT;

-- 2. Create Businesses Table
CREATE TABLE IF NOT EXISTS public.businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES public.profiles(id) NOT NULL,
  
  -- Basic Info
  name TEXT NOT NULL,
  trading_name TEXT,
  years_in_operation INTEGER,
  ownership_type TEXT, -- e.g., 'Rented', 'Owned', 'Mobi'
  employee_count INTEGER DEFAULT 0,
  registration_status TEXT, -- e.g., 'Registered', 'Unregistered'
  
  -- Category
  primary_category TEXT,
  sub_category TEXT,
  
  -- Location (Simplified for now, can be extended for PostGIS later)
  state TEXT,
  lga TEXT,
  address TEXT,
  landmark TEXT,
  latitude DECIMAL(9,6),
  longitude DECIMAL(9,6),
  
  -- Compliance
  tin TEXT,
  cac_certificate_uri TEXT,
  shop_front_photo_uri TEXT,
  id_type TEXT,
  id_number TEXT,
  id_expiry DATE,
  
  -- Inventory & Sales
  estimated_inventory_value DECIMAL(15, 2),
  monthly_sales_range TEXT,
  avg_daily_sales DECIMAL(15, 2),
  
  -- Metadata
  terms_accepted BOOLEAN DEFAULT FALSE,
  onboarding_completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

-- Business Policies
CREATE POLICY "Users can view their own business"
  ON public.businesses FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can create their own business"
  ON public.businesses FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own business"
  ON public.businesses FOR UPDATE
  USING (auth.uid() = owner_id);
