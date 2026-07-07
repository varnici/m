-- 018 – idempotency store for the worker payment webhook
-- Run once in Supabase SQL Editor. Prevents duplicate/replayed webhook
-- deliveries from double-crediting a worker's savings plan.

CREATE TABLE IF NOT EXISTS public.payment_webhook_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference    TEXT NOT NULL UNIQUE,
  user_id      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  amount_kobo  BIGINT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.payment_webhook_events ENABLE ROW LEVEL SECURITY;

-- Service-role only — this table is never read or written by client apps.
CREATE POLICY payment_webhook_events_service_only ON public.payment_webhook_events
  FOR ALL USING (false);
