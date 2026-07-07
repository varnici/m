import { supabase } from '@/lib/supabase';
import type { RootStackParamList } from '@/navigation/types';
import { useUserProfileStore } from '@/store/userProfileStore';
import type { AccountTypeId } from '@/config/accountTypes';

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
      nextRoute: 'Login',
    };
  }

  const [profileRes, businessRes, workerRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    supabase.from('businesses').select('*').eq('owner_id', user.id).maybeSingle(),
    supabase.from('worker_profiles').select('*').eq('user_id', user.id).maybeSingle(),
  ]);

  const business = businessRes.data ?? null;
  const workerProfile = workerRes.data ?? null;
  const profile = profileRes.data ?? null;
  const error =
    profileRes.error?.message || businessRes.error?.message || workerRes.error?.message || null;

  let nextRoute: keyof RootStackParamList = 'RoleSelection';

  if (business?.onboarding_completed_at) {
    const storedType = useUserProfileStore.getState().accountType;
    if (business.account_type && !storedType) {
      useUserProfileStore.getState().setAccountType(business.account_type as AccountTypeId);
    }
    nextRoute = 'Main';
  } else if (workerProfile?.onboarding_completed_at) {
    // Worker onboarding writes to worker_profiles, not businesses — a
    // completed 9-5 worker has no businesses row at all, so this branch is
    // required or every reinstall/new device sends them back through
    // onboarding despite already being fully set up.
    const storedType = useUserProfileStore.getState().accountType;
    if (!storedType) {
      useUserProfileStore.getState().setAccountType('nine_to_five' as AccountTypeId);
    }
    nextRoute = 'Main';
  } else if (business) {
    nextRoute = 'RoleSelection';
  }

  return { user, profile, business, error, nextRoute };
};

export const fetchPostLoginData = async () => {
  return resolveAuthSnapshot();
};

export const getPostAuthRoute = async (): Promise<keyof RootStackParamList> => {
  const snapshot = await resolveAuthSnapshot();
  return snapshot.nextRoute;
};
