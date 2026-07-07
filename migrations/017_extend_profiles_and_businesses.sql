-- 017 – extend profiles + businesses, create worker_profiles
-- Run once in Supabase SQL Editor. All ADD COLUMN IF NOT EXISTS are idempotent.

-- ── 1. Extend profiles ──────────────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_type            TEXT,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

-- ── 2. Extend businesses ────────────────────────────────────────────────────
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS trading_name            TEXT,
  ADD COLUMN IF NOT EXISTS years_in_operation      INTEGER,
  ADD COLUMN IF NOT EXISTS ownership_type          TEXT,
  ADD COLUMN IF NOT EXISTS employee_count          INTEGER,
  ADD COLUMN IF NOT EXISTS registration_status     TEXT,
  ADD COLUMN IF NOT EXISTS is_physical_store       BOOLEAN,
  ADD COLUMN IF NOT EXISTS lga                     TEXT,
  ADD COLUMN IF NOT EXISTS state                   TEXT,
  ADD COLUMN IF NOT EXISTS address                 TEXT,
  ADD COLUMN IF NOT EXISTS landmark                TEXT,
  ADD COLUMN IF NOT EXISTS latitude                DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude               DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS shop_front_photo_uri    TEXT,
  ADD COLUMN IF NOT EXISTS service_areas           TEXT[],
  ADD COLUMN IF NOT EXISTS stock_photo_uri         TEXT,
  ADD COLUMN IF NOT EXISTS tin                     TEXT,
  ADD COLUMN IF NOT EXISTS cac_certificate_uri     TEXT,
  ADD COLUMN IF NOT EXISTS id_type                 TEXT,
  ADD COLUMN IF NOT EXISTS id_number               TEXT,
  ADD COLUMN IF NOT EXISTS id_expiry               DATE,
  ADD COLUMN IF NOT EXISTS full_name               TEXT,
  ADD COLUMN IF NOT EXISTS date_of_birth           DATE,
  ADD COLUMN IF NOT EXISTS gender                  TEXT,
  ADD COLUMN IF NOT EXISTS nationality             TEXT,
  ADD COLUMN IF NOT EXISTS email                   TEXT,
  ADD COLUMN IF NOT EXISTS nin                     TEXT,
  ADD COLUMN IF NOT EXISTS estimated_inventory_value NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS sales_tier              TEXT,
  ADD COLUMN IF NOT EXISTS terms_accepted          BOOLEAN,
  ADD COLUMN IF NOT EXISTS market_association_token TEXT,
  ADD COLUMN IF NOT EXISTS leader_endorsement_id   UUID,
  ADD COLUMN IF NOT EXISTS pos_option              TEXT,
  ADD COLUMN IF NOT EXISTS pos_terminal_id         TEXT,
  ADD COLUMN IF NOT EXISTS cac_reg_number          TEXT,
  ADD COLUMN IF NOT EXISTS director_name           TEXT,
  ADD COLUMN IF NOT EXISTS director_bvn_hash       TEXT,
  ADD COLUMN IF NOT EXISTS director_nin_hash       TEXT,
  ADD COLUMN IF NOT EXISTS bank_name               TEXT,
  ADD COLUMN IF NOT EXISTS account_number          TEXT,
  ADD COLUMN IF NOT EXISTS account_type_bank       TEXT,
  ADD COLUMN IF NOT EXISTS product_categories      TEXT[],
  ADD COLUMN IF NOT EXISTS company_type            TEXT,
  ADD COLUMN IF NOT EXISTS fleet_size              INTEGER,
  ADD COLUMN IF NOT EXISTS vehicle_types           TEXT[],
  ADD COLUMN IF NOT EXISTS coverage_areas          TEXT[],
  ADD COLUMN IF NOT EXISTS driver_count            INTEGER,
  ADD COLUMN IF NOT EXISTS insurance_provider      TEXT,
  ADD COLUMN IF NOT EXISTS insurance_policy_number TEXT;

-- ── 3. Create worker_profiles ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.worker_profiles (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name                TEXT,
  first_name               TEXT,
  last_name                TEXT,
  date_of_birth            DATE,
  gender                   TEXT,
  email                    TEXT,
  phone                    TEXT,
  street_address           TEXT,
  city                     TEXT,
  state                    TEXT,
  employer                 TEXT,
  salary_range             TEXT,
  pay_date                 INTEGER,
  dream_business           TEXT DEFAULT 'My First Business Fund',
  bvn_hash                 TEXT,
  nin_hash                 TEXT,
  risk_profile             TEXT,
  risk_score               NUMERIC(5,2),
  pin_set                  BOOLEAN NOT NULL DEFAULT FALSE,
  otp_verified             BOOLEAN NOT NULL DEFAULT FALSE,
  onboarding_completed_at  TIMESTAMPTZ,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

ALTER TABLE public.worker_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY worker_profiles_self_read ON public.worker_profiles
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY worker_profiles_self_write ON public.worker_profiles
  FOR ALL USING (user_id = auth.uid());
