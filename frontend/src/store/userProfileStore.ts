import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AccountTypeId } from '@/config/accountTypes';

interface UserProfileState {
  accountType: AccountTypeId | null;
  setAccountType: (type: AccountTypeId) => void;
  clear: () => void;
}

export const useUserProfileStore = create<UserProfileState>()(
  persist(
    (set) => ({
      accountType: null,
      setAccountType: (type) => set({ accountType: type }),
      clear: () => set({ accountType: null }),
    }),
    {
      name: 'ventureroot-user-profile',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
