import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { useUserProfileStore } from '@/store/userProfileStore';
import { useOnboardingStore } from '@/store/onboardingStore';
import { useSecurityStore } from '@/store/securityStore';

// Persisted (not just in-memory) so a user switch is detected even across
// app restarts — e.g. after a TOKEN_REFRESH_FAILED local sign-out, or the
// app being killed instead of an explicit sign-out, on a shared device.
const LAST_USER_ID_KEY = 'ventureroot-last-user-id';

const clearUserScopedState = () => {
  useUserProfileStore.getState().clear();
  useOnboardingStore.getState().resetOnboarding();
  useSecurityStore.getState().clearSecurity();
};

// Compares the incoming signed-in user against the last user these
// persisted stores belonged to. Clears stale state on a mismatch, then
// records the new owner. Must run for every session-bearing event
// (initial load, sign-in, token refresh) so a switch is never missed.
const reconcileUserId = async (incomingUserId: string | null) => {
  const lastUserId = await AsyncStorage.getItem(LAST_USER_ID_KEY);

  if (incomingUserId && lastUserId && incomingUserId !== lastUserId) {
    clearUserScopedState();
  }

  if (incomingUserId) {
    await AsyncStorage.setItem(LAST_USER_ID_KEY, incomingUserId);
  } else {
    await AsyncStorage.removeItem(LAST_USER_ID_KEY);
  }
};

type AuthContextType = {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  needsPasswordReset: boolean;
  clearPasswordReset: () => void;
  signOut: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  isLoading: true,
  needsPasswordReset: false,
  clearPasswordReset: () => {},
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [needsPasswordReset, setNeedsPasswordReset] = useState(false);

  useEffect(() => {
    supabase.auth.getSession()
      .then(async ({ data: { session } }) => {
        await reconcileUserId(session?.user?.id ?? null);
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);
      })
      .catch((err) => {
        console.warn('Supabase getSession error:', err);
        setIsLoading(false);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if ((event as string) === 'TOKEN_REFRESH_FAILED') {
          supabase.auth.signOut({ scope: 'local' });
          clearUserScopedState();
          AsyncStorage.removeItem(LAST_USER_ID_KEY);
          setSession(null);
          setUser(null);
          return;
        }

        // Password recovery deep link — route to ResetPassword screen
        if (event === 'PASSWORD_RECOVERY') {
          setSession(session);
          setUser(session?.user ?? null);
          setNeedsPasswordReset(true);
          return;
        }

        // Await the reconcile (and any resulting clear) before publishing the
        // new session, so nothing reads stale zustand state in between.
        reconcileUserId(session?.user?.id ?? null).finally(() => {
          setSession(session);
          setUser(session?.user ?? null);
        });
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    // Clear all user-scoped local state so the next login starts fresh
    clearUserScopedState();
    await AsyncStorage.removeItem(LAST_USER_ID_KEY);
    setSession(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{
      session, user, isLoading,
      needsPasswordReset,
      clearPasswordReset: () => setNeedsPasswordReset(false),
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
