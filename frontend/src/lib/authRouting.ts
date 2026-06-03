import { supabase } from '@/lib/supabase';
import type { RootStackParamList } from '@/navigation/types';

export interface AuthSnapshot {
  user: any | null;
  profile: any | null;
  business: any | null;
  error: string | null;
  nextRoute: keyof RootStackParamList;
}

export const resolveAuthSnapshot = async (): Promise<AuthSnapshot> => {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { 
      user: null, 
      profile: null, 
      business: null, 
      error: userError?.message || 'No user',
      nextRoute: 'Login'
    };
  }

  // Fetch all required data in a single parallel block
  const [profileRes, businessRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    supabase.from('businesses').select('*').eq('owner_id', user.id).maybeSingle(),
  ]);

  const business = businessRes.data ?? null;
  const profile = profileRes.data ?? null;
  const error = profileRes.error?.message || businessRes.error?.message || null;

  // Determine route based on existing data
  let nextRoute: keyof RootStackParamList = 'RoleSelection';
  if (business?.onboarding_completed_at) {
    nextRoute = 'Main';
  } else if (business) {
    // If business exists but onboarding not done, maybe redirect to a specific step?
    // For now, keep it simple
    nextRoute = 'RoleSelection';
  }

  return {
    user,
    profile,
    business,
    error,
    nextRoute
  };
};

// Deprecated: Keeping for backward compatibility but redirecting to new logic
export const fetchPostLoginData = async () => {
  const snapshot = await resolveAuthSnapshot();
  return snapshot;
};

export const getPostAuthRoute = async (): Promise<keyof RootStackParamList> => {
  const snapshot = await resolveAuthSnapshot();
  return snapshot.nextRoute;
};
