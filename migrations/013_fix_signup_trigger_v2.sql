-- =============================================================================
-- FIX v2: Simpler trigger that avoids metadata access issues
-- =============================================================================

-- Drop the old trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Recreate with minimal logic — no metadata access that might fail
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name)
    VALUES (NEW.id, '')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.businesses (owner_id)
    VALUES (NEW.id)
    ON CONFLICT (owner_id) DO NOTHING;

    RETURN NEW;
END;
$$;

-- Recreate trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();
