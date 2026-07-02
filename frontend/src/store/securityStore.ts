import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

type SecurityType = 'pin' | 'pattern' | 'none';

const LOCKOUT_DURATIONS: Record<number, number> = {
  5: 60_000,       // 1 min after 5th failure
  6: 120_000,      // 2 min after 6th
  7: 300_000,      // 5 min after 7th
  8: 1_800_000,    // 30 min after 8th+
};

function getLockoutDuration(attempts: number): number {
  if (attempts >= 8) return LOCKOUT_DURATIONS[8];
  return LOCKOUT_DURATIONS[attempts] ?? 0;
}

interface SecurityState {
  securityType: SecurityType;
  biometricsEnabled: boolean;
  isLocked: boolean;
  failedAttempts: number;
  lockoutUntil: number | null;
  backgroundedAt: number | null;
  setSecurityType: (type: SecurityType) => void;
  setBiometricsEnabled: (enabled: boolean) => void;
  setIsLocked: (locked: boolean) => void;
  clearSecurity: () => void;
  recordFailedAttempt: () => void;
  resetFailedAttempts: () => void;
  setBackgroundedAt: (time: number | null) => void;
}

export const useSecurityStore = create<SecurityState>()(
  persist(
    (set) => ({
      securityType: 'none',
      biometricsEnabled: false,
      isLocked: true,
      failedAttempts: 0,
      lockoutUntil: null,
      backgroundedAt: null,

      setSecurityType: (type) => set({ securityType: type }),
      setBiometricsEnabled: (enabled) => set({ biometricsEnabled: enabled }),
      setIsLocked: (locked) => set({ isLocked: locked }),

      clearSecurity: () => set({
        securityType: 'none',
        biometricsEnabled: false,
        isLocked: false,
        failedAttempts: 0,
        lockoutUntil: null,
      }),

      recordFailedAttempt: () => set((state) => {
        const next = state.failedAttempts + 1;
        const duration = getLockoutDuration(next);
        return {
          failedAttempts: next,
          lockoutUntil: duration > 0 ? Date.now() + duration : state.lockoutUntil,
        };
      }),

      resetFailedAttempts: () => set({ failedAttempts: 0, lockoutUntil: null }),

      setBackgroundedAt: (time) => set({ backgroundedAt: time }),
    }),
    {
      name: 'ventureroot-security-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        securityType: state.securityType,
        biometricsEnabled: state.biometricsEnabled,
        isLocked: state.isLocked,
        failedAttempts: state.failedAttempts,
        lockoutUntil: state.lockoutUntil,
        backgroundedAt: state.backgroundedAt,
      }),
    }
  )
);
