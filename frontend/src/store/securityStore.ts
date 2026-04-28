import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

type SecurityType = 'pin' | 'pattern' | 'none';

interface SecurityState {
  securityType: SecurityType;
  biometricsEnabled: boolean;
  isLocked: boolean;
  setSecurityType: (type: SecurityType) => void;
  setBiometricsEnabled: (enabled: boolean) => void;
  setIsLocked: (locked: boolean) => void;
  clearSecurity: () => void;
}

export const useSecurityStore = create<SecurityState>()(
  persist(
    (set) => ({
      securityType: 'none',
      biometricsEnabled: false,
      isLocked: true, // Default to locked if any security is set
      setSecurityType: (type) => set({ securityType: type }),
      setBiometricsEnabled: (enabled) => set({ biometricsEnabled: enabled }),
      setIsLocked: (locked) => set({ isLocked: locked }),
      clearSecurity: () => set({ securityType: 'none', biometricsEnabled: false, isLocked: false }),
    }),
    {
      name: 'ventureroot-security-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        securityType: state.securityType,
        biometricsEnabled: state.biometricsEnabled,
        isLocked: state.isLocked,
      }),
    }
  )
);
