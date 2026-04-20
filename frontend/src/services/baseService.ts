import { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Database } from '@/types/database.types';

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
      baseURL: process.env.EXPO_PUBLIC_API_URL!,
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
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      'X-User-Id': session.user.id,
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
        throw new Error('Request timed out');
      }
      throw error;
    }
  }
}
