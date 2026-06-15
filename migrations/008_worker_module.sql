-- =============================================================================
-- VENTUREROOT — LAYER 1: 9-5 WORKER MODULE
-- Migration: 008_worker_module.sql
-- =============================================================================

-- ---------------------------------------------------------------------------
-- SAFETY: auth schema mock for local SQLite / test environments
-- ---------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS auth;

CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid AS $$
  SELECT COALESCE(
    NULLIF(current_setting('request.jwt.claim.sub', true), ''),
    '00000000-0000-0000-0000-000000000000'
  )::uuid;
$$ LANGUAGE sql STABLE;

-- ---------------------------------------------------------------------------
-- 1. profiles
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id                      UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name               TEXT,
    bvn_verified            BOOLEAN NOT NULL DEFAULT FALSE,
    virtual_account_number  TEXT UNIQUE,
    virtual_account_bank    TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 2. savings_plans
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.savings_plans (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    target_name     TEXT NOT NULL,
    target_amount   NUMERIC(12,2) NOT NULL CHECK (target_amount > 0),
    current_balance NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (current_balance >= 0),
    automated_rule  TEXT NOT NULL DEFAULT 'manual'
                        CHECK (automated_rule IN ('manual', 'salary_direct', 'round_up')),
    rule_amount     NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Virtual generated column: achieved when balance meets target
    is_achieved     BOOLEAN GENERATED ALWAYS AS (current_balance >= target_amount) STORED
);

-- ---------------------------------------------------------------------------
-- 3. business_clusters  (mocks Layer 2 inventory data feed)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.business_clusters (
    id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id               UUID NOT NULL,
    business_name             TEXT NOT NULL,
    category                  TEXT NOT NULL,
    risk_rating               TEXT NOT NULL DEFAULT 'Medium',
    is_active_for_investment  BOOLEAN NOT NULL DEFAULT TRUE
);

-- ---------------------------------------------------------------------------
-- 4. cluster_snapshots  (aggregated rolling analytics)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cluster_snapshots (
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cluster_id               UUID NOT NULL REFERENCES public.business_clusters(id) ON DELETE CASCADE,
    rolling_30_day_turnover  NUMERIC(12,2) NOT NULL,
    projected_monthly_roi    NUMERIC(4,2) NOT NULL,
    last_updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 5. investments
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.investments (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    investor_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    cluster_id       UUID NOT NULL REFERENCES public.business_clusters(id),
    principal_amount NUMERIC(12,2) NOT NULL CHECK (principal_amount >= 10000.00),
    dividends_earned NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    status           TEXT NOT NULL DEFAULT 'active',
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- ROW-LEVEL SECURITY
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.savings_plans      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_clusters  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cluster_snapshots  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investments        ENABLE ROW LEVEL SECURITY;

-- profiles: own row only
CREATE POLICY profiles_self_read ON public.profiles
    FOR SELECT USING (id = auth.uid());

CREATE POLICY profiles_self_update ON public.profiles
    FOR UPDATE USING (id = auth.uid());

CREATE POLICY profiles_self_insert ON public.profiles
    FOR INSERT WITH CHECK (id = auth.uid());

-- savings_plans: own rows only
CREATE POLICY savings_plans_self_read ON public.savings_plans
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY savings_plans_self_write ON public.savings_plans
    FOR ALL USING (user_id = auth.uid());

-- business_clusters: any authenticated user can read (marketplace feed)
CREATE POLICY clusters_authenticated_read ON public.business_clusters
    FOR SELECT USING (auth.role() = 'authenticated');

-- cluster_snapshots: any authenticated user can read (marketplace feed)
CREATE POLICY snapshots_authenticated_read ON public.cluster_snapshots
    FOR SELECT USING (auth.role() = 'authenticated');

-- investments: own rows only
CREATE POLICY investments_self_read ON public.investments
    FOR SELECT USING (investor_id = auth.uid());

CREATE POLICY investments_self_write ON public.investments
    FOR ALL USING (investor_id = auth.uid());

-- ---------------------------------------------------------------------------
-- SEED: sample business clusters + snapshots for development
-- ---------------------------------------------------------------------------
INSERT INTO public.business_clusters (id, merchant_id, business_name, category, risk_rating, is_active_for_investment)
VALUES
    ('a1000000-0000-0000-0000-000000000001', gen_random_uuid(), 'Eko Grains Ltd',           'FMCG',        'Low',    TRUE),
    ('a1000000-0000-0000-0000-000000000002', gen_random_uuid(), 'Lagos Fresh Produce Hub',  'Agriculture', 'Medium', TRUE),
    ('a1000000-0000-0000-0000-000000000003', gen_random_uuid(), 'Abuja Retail Collective',  'Retail',      'Low',    TRUE),
    ('a1000000-0000-0000-0000-000000000004', gen_random_uuid(), 'Northern Foodstuffs Co.',  'FMCG',        'Medium', TRUE),
    ('a1000000-0000-0000-0000-000000000005', gen_random_uuid(), 'Port Harcourt Goods Depot','Retail',      'High',   TRUE),
    ('a1000000-0000-0000-0000-000000000006', gen_random_uuid(), 'Onitsha Market Hub',        'FMCG',        'Medium', TRUE),
    ('a1000000-0000-0000-0000-000000000007', gen_random_uuid(), 'Kano Textile Cluster',     'Retail',      'Low',    TRUE),
    ('a1000000-0000-0000-0000-000000000008', gen_random_uuid(), 'Delta Cassava Processors', 'Agriculture', 'Medium', TRUE),
    ('a1000000-0000-0000-0000-000000000009', gen_random_uuid(), 'Kaduna Grain Exchange',    'Agriculture', 'Low',    TRUE),
    ('a1000000-0000-0000-0000-000000000010', gen_random_uuid(), 'Ibadan Consumer Goods',    'FMCG',        'Low',    TRUE),
    ('a1000000-0000-0000-0000-000000000011', gen_random_uuid(), 'Enugu Tech Accessories',   'Retail',      'High',   FALSE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.cluster_snapshots (cluster_id, rolling_30_day_turnover, projected_monthly_roi, last_updated_at)
VALUES
    ('a1000000-0000-0000-0000-000000000001', 12500000.00, 4.20, NOW()),
    ('a1000000-0000-0000-0000-000000000002', 9800000.00,  3.75, NOW()),
    ('a1000000-0000-0000-0000-000000000003', 18200000.00, 5.10, NOW()),
    ('a1000000-0000-0000-0000-000000000004', 7600000.00,  3.40, NOW()),
    ('a1000000-0000-0000-0000-000000000005', 6100000.00,  2.90, NOW()),
    ('a1000000-0000-0000-0000-000000000006', 14400000.00, 4.80, NOW()),
    ('a1000000-0000-0000-0000-000000000007', 11200000.00, 4.00, NOW()),
    ('a1000000-0000-0000-0000-000000000008', 8300000.00,  3.55, NOW()),
    ('a1000000-0000-0000-0000-000000000009', 10500000.00, 3.90, NOW()),
    ('a1000000-0000-0000-0000-000000000010', 16800000.00, 5.30, NOW()),
    ('a1000000-0000-0000-0000-000000000011', 4200000.00,  2.10, NOW())
ON CONFLICT DO NOTHING;
