import { BaseService } from './baseService';

export interface UserUpdatePayload {
  full_name?: string;
  email?: string;
  business_name?: string;
  trading_name?: string;
  business_category?: string;
  bank_name?: string;
  account_number?: string;
  tin?: string;
  location?: any;
  settings?: any;
}

export interface User {
  id: string;
  phone: string;
  email: string | null;
  full_name: string | null;
  category: string;
  trust_level: string;
  business_name?: string;
  trading_name?: string;
  business_category?: string;
  bank_name?: string;
  account_number?: string;
  tin?: string;
}

export class UserService extends BaseService {
  async getMe(): Promise<User> {
    const response = await this.fetchWithAuth('/v1/users/me');
    return response.json();
  }

  async updateProfile(payload: UserUpdatePayload): Promise<User> {
    const response = await this.fetchWithAuth('/v1/users/me', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return response.json();
  }

  async updateSecurity(payload: {
    new_pin?: string;
    new_pattern?: string;
    security_type?: 'pin' | 'pattern';
  }): Promise<User> {
    const response = await this.fetchWithAuth('/v1/users/me/security', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return response.json();
  }

  async verifySecurity(payload: { pin?: string; pattern?: string }): Promise<{ valid: boolean }> {
    const response = await this.fetchWithAuth('/v1/users/me/verify-security', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return response.json();
  }
}

export const userService = new UserService();
