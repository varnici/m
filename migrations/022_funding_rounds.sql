-- =============================================================================
-- VENTUREROOT — LAYER 1: MULTI-INVESTOR FUNDING ROUNDS
-- Migration: 022_funding_rounds.sql
--
-- Closes a real gap: investments already supports multiple investor rows
-- against the same business_cluster, but there was no shared funding target
-- or "amount raised so far" — an investor had no way to see "this business
-- needs ₦X more" or co-fund toward it with others. This adds that aggregate
-- layer without touching the existing single-investor investment flow.
--
-- distributor_order_id is a loose reference to core-banking's own Postgres
-- trade_orders.id (no FK — separate physical database, application-level
-- correctness only) — set when the round exists to cover a specific
-- cross-tenant distributor order rather than general working capital.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.funding_rounds (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cluster_id            UUID NOT NULL REFERENCES public.business_clusters(id) ON DELETE CASCADE,
    distributor_order_id  TEXT,
    target_amount_kobo    BIGINT NOT NULL CHECK (target_amount_kobo > 0),
    raised_amount_kobo    BIGINT NOT NULL DEFAULT 0 CHECK (raised_amount_kobo >= 0),
    status                TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'funded', 'closed')),
    created_by            UUID NOT NULL,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    funded_at             TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_funding_rounds_cluster ON public.funding_rounds(cluster_id);
CREATE INDEX IF NOT EXISTS idx_funding_rounds_status ON public.funding_rounds(status);

ALTER TABLE public.investments
    ADD COLUMN IF NOT EXISTS funding_round_id UUID REFERENCES public.funding_rounds(id) ON DELETE SET NULL;

ALTER TABLE public.funding_rounds ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can browse open rounds (marketplace feed), same as business_clusters.
CREATE POLICY funding_rounds_authenticated_read ON public.funding_rounds
    FOR SELECT USING (auth.role() = 'authenticated');
