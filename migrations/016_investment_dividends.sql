-- =============================================================================
-- VENTUREROOT — LAYER 1: INVESTMENT TERM & DIVIDEND SYSTEM
-- Migration: 016_investment_dividends.sql
--
-- Business rules:
--   • Fixed to 10% monthly dividend on principal
--   • Term options: 6 months or 12 months
--   • Dividends become collectable after each month period
--   • Early withdrawal penalty: 3.5% of the amount withdrawn before maturity
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Extend investments table with term data
-- ---------------------------------------------------------------------------
ALTER TABLE public.investments
    ADD COLUMN IF NOT EXISTS term_months        INTEGER NOT NULL DEFAULT 6
        CHECK (term_months IN (6, 12)),
    ADD COLUMN IF NOT EXISTS monthly_rate_pct   NUMERIC(5,4) NOT NULL DEFAULT 10.0000,
    ADD COLUMN IF NOT EXISTS start_date         DATE NOT NULL DEFAULT CURRENT_DATE,
    ADD COLUMN IF NOT EXISTS maturity_date      DATE,
    ADD COLUMN IF NOT EXISTS penalty_rate_pct   NUMERIC(5,4) NOT NULL DEFAULT 3.5000,
    ADD COLUMN IF NOT EXISTS total_collected     NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS withdrawn_at       TIMESTAMPTZ;

-- Backfill maturity_date for existing rows
UPDATE public.investments
SET maturity_date = (start_date + (term_months || ' months')::INTERVAL)::DATE
WHERE maturity_date IS NULL;

-- Now enforce NOT NULL
ALTER TABLE public.investments
    ALTER COLUMN maturity_date SET NOT NULL;

-- ---------------------------------------------------------------------------
-- 2. dividend_records — one row per month per investment
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.dividend_records (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    investment_id   UUID NOT NULL REFERENCES public.investments(id) ON DELETE CASCADE,
    period_date     DATE NOT NULL,
    principal_snapshot NUMERIC(12,2) NOT NULL,
    rate_pct        NUMERIC(5,4) NOT NULL,
    amount          NUMERIC(12,2) NOT NULL,
    status          TEXT NOT NULL DEFAULT 'accrued'
                        CHECK (status IN ('accrued', 'available', 'collected')),
    collected_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (investment_id, period_date)
);

CREATE INDEX IF NOT EXISTS idx_dividend_records_investment
    ON public.dividend_records (investment_id);

CREATE INDEX IF NOT EXISTS idx_dividend_records_status
    ON public.dividend_records (status);

-- ---------------------------------------------------------------------------
-- 3. withdrawal_records — tracks early withdrawals with penalty
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.withdrawal_records (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    investment_id    UUID NOT NULL REFERENCES public.investments(id) ON DELETE CASCADE,
    requested_amount NUMERIC(12,2) NOT NULL CHECK (requested_amount > 0),
    penalty_pct      NUMERIC(5,4) NOT NULL,
    penalty_amount   NUMERIC(12,2) NOT NULL,
    net_amount       NUMERIC(12,2) NOT NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 4. Row-Level Security
-- ---------------------------------------------------------------------------
ALTER TABLE public.dividend_records   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawal_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY dividend_records_self_read ON public.dividend_records
    FOR SELECT USING (
        investment_id IN (
            SELECT id FROM public.investments WHERE investor_id = auth.uid()
        )
    );

CREATE POLICY dividend_records_self_write ON public.dividend_records
    FOR ALL USING (
        investment_id IN (
            SELECT id FROM public.investments WHERE investor_id = auth.uid()
        )
    );

CREATE POLICY withdrawal_records_self_read ON public.withdrawal_records
    FOR SELECT USING (
        investment_id IN (
            SELECT id FROM public.investments WHERE investor_id = auth.uid()
        )
    );

-- ---------------------------------------------------------------------------
-- 5. Function: accrue monthly dividends
--    Call on 1st of each month (or via backend cron)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.accrue_monthly_dividends()
RETURNS INTEGER AS $$
DECLARE
    _count INTEGER := 0;
    _inv   RECORD;
    _period DATE := DATE_TRUNC('month', CURRENT_DATE)::DATE;
    _amt   NUMERIC(12,2);
BEGIN
    FOR _inv IN
        SELECT id, principal_amount, monthly_rate_pct, maturity_date
        FROM public.investments
        WHERE status = 'active'
          AND start_date < _period
          AND maturity_date >= _period
          AND withdrawn_at IS NULL
    LOOP
        _amt := ROUND(_inv.principal_amount * _inv.monthly_rate_pct / 100, 2);

        INSERT INTO public.dividend_records
            (investment_id, period_date, principal_snapshot, rate_pct, amount, status)
        VALUES
            (_inv.id, _period, _inv.principal_amount, _inv.monthly_rate_pct, _amt, 'available')
        ON CONFLICT (investment_id, period_date) DO NOTHING;

        IF FOUND THEN
            UPDATE public.investments
            SET dividends_earned = dividends_earned + _amt
            WHERE id = _inv.id;

            _count := _count + 1;
        END IF;
    END LOOP;

    RETURN _count;
END;
$$ LANGUAGE plpgsql;
