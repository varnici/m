import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { useUserProfileStore } from '@/store/userProfileStore';
import { useOnboardingStore } from '@/store/onboardingStore';
import { useSecurityStore } from '@/store/securityStore';

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
  // Ref tracks the active user ID without stale closure issues
  const activeUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        activeUserIdRef.current = session?.user?.id ?? null;
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
          activeUserIdRef.current = null;
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

        const incomingUserId = session?.user?.id ?? null;
        // Different user signed in — clear all persisted user-scoped state
        if (incomingUserId && activeUserIdRef.current && incomingUserId !== activeUserIdRef.current) {
          useUserProfileStore.getState().clear();
          useOnboardingStore.getState().resetOnboarding();
          useSecurityStore.getState().clearSecurity();
        }
        activeUserIdRef.current = incomingUserId;
        setSession(session);
        setUser(session?.user ?? null);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    // Clear all user-scoped local state so the next login starts fresh
    useUserProfileStore.getState().clear();
    useOnboardingStore.getState().resetOnboarding();
    useSecurityStore.getState().clearSecurity();
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
