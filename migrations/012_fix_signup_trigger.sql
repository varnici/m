-- =============================================================================
-- FIX: Supabase signup "database error saving new user"
--
-- This creates/replaces the trigger that auto-creates a profile row
-- and a businesses row when a new user signs up via Supabase Auth.
-- =============================================================================

-- 1. Ensure profiles table exists
CREATE TABLE IF NOT EXISTS public.profiles (
    id                      UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name               TEXT,
    bvn_verified            BOOLEAN NOT NULL DEFAULT FALSE,
    virtual_account_number  TEXT UNIQUE,
    virtual_account_bank    TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Ensure businesses table exists
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

-- 3. Create or replace the trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    -- Create profile row
    INSERT INTO public.profiles (id, full_name)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data ->> 'full_name', '')
    )
    ON CONFLICT (id) DO NOTHING;

    -- Create businesses row
    INSERT INTO public.businesses (owner_id, phone)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data ->> 'phone', NEW.phone)
    )
    ON CONFLICT (owner_id) DO NOTHING;

    RETURN NEW;
END;
$$;

-- 4. Drop existing trigger if any, then create
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- 5. Enable RLS but allow the trigger (SECURITY DEFINER) to insert
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read/update their own row
DROP POLICY IF EXISTS profiles_self_read ON public.profiles;
CREATE POLICY profiles_self_read ON public.profiles
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS profiles_self_update ON public.profiles;
CREATE POLICY profiles_self_update ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Businesses: users can read/update their own row
DROP POLICY IF EXISTS businesses_self_read ON public.businesses;
CREATE POLICY businesses_self_read ON public.businesses
    FOR SELECT USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS businesses_self_update ON public.businesses;
CREATE POLICY businesses_self_update ON public.businesses
    FOR UPDATE USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS businesses_self_insert ON public.businesses;
CREATE POLICY businesses_self_insert ON public.businesses
    FOR INSERT WITH CHECK (auth.uid() = owner_id);
