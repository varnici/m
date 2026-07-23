-- 019 – add missing account_type column to businesses
-- Run once in Supabase SQL Editor. Idempotent.
--
-- onboardingSubmitService.ts writes account_type ('retail' | 'distributor' |
-- 'logistics') onto the businesses row for every non-worker onboarding flow,
-- and authRouting.ts reads business.account_type back on app launch to
-- restore navigation state after a reinstall/new device. Migration 017 only
-- added account_type to profiles, not businesses, so every retail/
-- distributor/logistics submission failed with PGRST204.

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS account_type TEXT;
