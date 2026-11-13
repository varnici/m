-- 024 – ensure the FULL businesses/profiles/worker_profiles schema exists,
-- not just business_name (023) or account_type (019).
--
-- Root cause: this project's migrations/ directory has no CLI history — each
-- file is meant to be pasted into the Supabase SQL Editor once, by hand. 017
-- was apparently never (fully) applied to this project's live database, so
-- every column it was supposed to add — 43 on `businesses`, 2 on `profiles`,
-- plus the whole `worker_profiles` table — has been silently missing this
-- whole time. 023 only patched the one column (business_name, actually from
-- 012, not 017) that happened to be hit first; 019 only patched
-- account_type. Neither fixed the underlying gap, which is why a DIFFERENT
-- column (account_number, from 017) surfaced the identical PGRST204 error
-- next. This migration re-asserts everything 012 + 017 + 019 were supposed
-- to leave in place, in one idempotent pass, so no more onboarding fields
-- can surface this one at a time as different flows get exercised.
--
-- Every statement below is safe to run even if some or all of it already
-- exists (ADD COLUMN IF NOT EXISTS / CREATE TABLE IF NOT EXISTS / DROP
-- POLICY IF EXISTS before CREATE POLICY) — running this on an
-- already-correct database is a guaranteed no-op, not a risk.

-- ── 1. businesses (from 012 + 019) ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.businesses (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    business_name   TEXT,
    account_type    TEXT DEFAULT 'retail',
    category        TEXT,
    phone           TEXT,
    location        TEXT,
    onboarding_completed_at TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(owner_id)
);

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS account_type TEXT; -- 019

-- ── 2. profiles (from 012) ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
    id                      UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name               TEXT,
    bvn_verified            BOOLEAN NOT NULL DEFAULT FALSE,
    virtual_account_number  TEXT UNIQUE,
    virtual_account_bank    TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 3. Full 017 extension of profiles + businesses ──────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_type            TEXT,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

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

-- Belt-and-braces: business_name itself (023's own fix), in case even that
-- one somehow still isn't applied on this particular database.
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS business_name TEXT;

-- ── 4. worker_profiles (from 017) ───────────────────────────────────────────
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

-- 017's original CREATE POLICY calls had no DROP-first guard, so re-running
-- this migration a second time would fail with "policy already exists" —
-- fixed here the same way 012 already guards its own policies.
DROP POLICY IF EXISTS worker_profiles_self_read ON public.worker_profiles;
CREATE POLICY worker_profiles_self_read ON public.worker_profiles
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS worker_profiles_self_write ON public.worker_profiles;
CREATE POLICY worker_profiles_self_write ON public.worker_profiles
  FOR ALL USING (user_id = auth.uid());

-- ── 5. Force PostgREST to pick up everything above immediately ─────────────
NOTIFY pgrst, 'reload schema';
