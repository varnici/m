import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STRINGS, type LanguageCode, type InventoryStrings } from '@/i18n/strings';

interface LanguageState {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      language: 'en',
      setLanguage: (lang) => set({ language: lang }),
    }),
    {
      name: 'ventureroot-inventory-language',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

/** Convenience hook returning the current language's inventory string pack. */
export function useInventoryStrings(): InventoryStrings {
  const language = useLanguageStore((s) => s.language);
  return STRINGS[language];
}
