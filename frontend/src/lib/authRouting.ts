import { supabase } from '@/lib/supabase';
import type { RootStackParamList } from '@/navigation/types';

export const fetchPostLoginData = async () => {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { user: null, profile: null, business: null, error: userError?.message || 'No user' };
  }

  const [profileRes, businessRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    supabase.from('businesses').select('*').eq('owner_id', user.id).maybeSingle(),
  ]);

  return {
    user,
    profile: profileRes.data ?? null,
    business: businessRes.data ?? null,
    error: profileRes.error?.message || businessRes.error?.message || null,
  };
};

export const getPostAuthRoute = async (): Promise<keyof RootStackParamList> => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return 'Login';
  }

  const { data, error } = await supabase
    .from('businesses')
    .select('onboarding_completed_at')
    .eq('owner_id', user.id)
    .maybeSingle();

  if (error) {
    console.warn('Post-auth route check failed:', error.message);
    return 'RoleSelection';
  }

  if (data?.onboarding_completed_at) {
    return 'Dashboard';
  }

  return 'RoleSelection';
};
