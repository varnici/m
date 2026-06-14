import { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Database } from '@/types/database.types';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

export interface ApiConfig {
  baseURL: string;
  timeout: number;
}

export class BaseService {
  protected supabase: SupabaseClient<Database>;
  protected config: ApiConfig;

  constructor() {
    this.supabase = supabase as any;

    this.config = {
      baseURL: resolveApiBaseUrl(),
      timeout: 30000,
    };
  }

  /**
   * Fetch with JWT authentication
   */
  protected async fetchWithAuth(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const {
      data: { session },
    } = await this.supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error('Unauthorized: No session');
    }

    const url = `${this.config.baseURL}${endpoint}`;
    // Check if we are connected to a shared business workspace
    let activeUserId = session.user.id;
    try {
      const { default: AsyncStorage } = require('@react-native-async-storage/async-storage');
      const sharedOwnerId = await AsyncStorage.getItem('shared_business_owner_id');
      if (sharedOwnerId) {
        activeUserId = sharedOwnerId;
      }
    } catch (err) {
      console.warn('Failed to load shared_business_owner_id from AsyncStorage:', err);
    }

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      'X-User-Id': activeUserId,
      ...options.headers,
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}`;
        try {
          const errorData = await response.json();
          if (Array.isArray(errorData.detail)) {
            // FastAPI validation errors are usually an array
            errorMessage = errorData.detail.map((d: any) => `${d.loc.join('.')}: ${d.msg}`).join(', ');
          } else {
            errorMessage = errorData.detail || errorData.message || errorMessage;
          }
        } catch (e) {
          // Fallback to status text
        }
        throw new Error(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage));
      }

      return response;
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error(`Request timed out while connecting to ${this.config.baseURL}`);
      }
      if (error.message === 'Network request failed') {
        throw new Error(
          `Network request failed. Tried ${this.config.baseURL}. Check that the backend is running and EXPO_PUBLIC_API_URL points to your computer LAN IP, not localhost.`
        );
      }
      throw error;
    }
  }
}

function resolveApiBaseUrl(): string {
  const debuggerHost =
    (Constants.expoConfig?.hostUri || (Constants as any).manifest?.debuggerHost || '')
      .split(':')[0]
      .trim();

  const configured = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (configured) {
    const normalized = configured.replace(/\/+$/, '');
    // In dev, a stale LAN IP in .env breaks the app after network changes; prefer Expo's host.
    if (__DEV__ && debuggerHost) {
      try {
        const host = new URL(normalized).hostname;
        if (
          host !== debuggerHost &&
          host !== 'localhost' &&
          host !== '10.0.2.2' &&
          host !== '127.0.0.1'
        ) {
          return `http://${debuggerHost}:8080`;
        }
      } catch {
        // keep configured value
      }
    }
    return normalized;
  }

  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:8080';
  }

  if (debuggerHost) {
    return `http://${debuggerHost}:8080`;
  }

  return 'http://localhost:8080';
}
