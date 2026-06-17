import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string;

const MAX_SECURE_SIZE = 2048;

const hybridStorageAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    const secure = await SecureStore.getItemAsync(key);
    if (secure) return secure;
    return AsyncStorage.getItem(key);
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (value.length <= MAX_SECURE_SIZE) {
      await SecureStore.setItemAsync(key, value);
      await AsyncStorage.removeItem(key);
    } else {
      await AsyncStorage.setItem(key, value);
      await SecureStore.deleteItemAsync(key).catch(() => {});
    }
  },
  removeItem: async (key: string): Promise<void> => {
    await SecureStore.deleteItemAsync(key).catch(() => {});
    await AsyncStorage.removeItem(key);
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: hybridStorageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
