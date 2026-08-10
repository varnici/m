-- 023 – ensure businesses.business_name exists and refresh PostgREST schema cache
-- Run once in Supabase SQL Editor. Idempotent.
--
-- Onboarding submission (onboardingSubmitService.ts: submitRetailOnboarding,
-- submitDistributorOnboarding, submitLogisticsOnboarding) writes business_name
-- onto the businesses row and failed with PGRST204 "Could not find the
-- 'business_name' column of 'businesses' in the schema cache". business_name
-- is defined in the original CREATE TABLE (012_fix_signup_trigger.sql), so
-- either that script was never applied to this project, or PostgREST's
-- schema cache went stale — same failure class as 019 (account_type). This
-- fixes both possibilities in one idempotent script.

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS business_name TEXT;

NOTIFY pgrst, 'reload schema';
