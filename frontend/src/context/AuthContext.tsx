import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Alert, Linking } from 'react-native';
import { Session, User } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { useUserProfileStore } from '@/store/userProfileStore';
import { useOnboardingStore } from '@/store/onboardingStore';
import { useSecurityStore } from '@/store/securityStore';

// Supabase's JS client can't auto-detect a session from the URL on React
// Native (detectSessionInUrl:false in lib/supabase.ts — there's no `window`
// to read from), so the recovery/access tokens Supabase puts on the
// ventureroot://reset-password deep link are otherwise never handed to the
// client at all: the email sends fine, the link opens the app, but nothing
// ever calls setSession() and PASSWORD_RECOVERY never fires. This parses
// the incoming URL manually and completes that handoff.
function parseAuthParamsFromUrl(url: string): Record<string, string> {
  const params: Record<string, string> = {};
  const markerIndex = Math.max(url.indexOf('#'), url.indexOf('?'));
  if (markerIndex === -1) return params;
  new URLSearchParams(url.slice(markerIndex + 1)).forEach((value, key) => {
    params[key] = value;
  });
  return params;
}

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

    // Manual deep-link handoff for password-recovery links (see
    // parseAuthParamsFromUrl's comment above) — cold start (link opened the
    // app) and warm start (app already running) both go through this.
    const handleAuthDeepLink = async (url: string | null) => {
      if (!url || !url.includes('reset-password')) return;
      const params = parseAuthParamsFromUrl(url);

      if (params.error) {
        Alert.alert(
          'Reset link expired',
          params.error_description?.replace(/\+/g, ' ') || 'Please request a new password reset link.'
        );
        return;
      }
      if (params.type !== 'recovery' || !params.access_token || !params.refresh_token) return;

      const { data, error } = await supabase.auth.setSession({
        access_token: params.access_token,
        refresh_token: params.refresh_token,
      });
      if (error) {
        Alert.alert('Reset link expired', 'Please request a new password reset link.');
        return;
      }
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setNeedsPasswordReset(true);
    };

    Linking.getInitialURL().then(handleAuthDeepLink);
    const linkingSubscription = Linking.addEventListener('url', ({ url }) => handleAuthDeepLink(url));

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
      linkingSubscription.remove();
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
