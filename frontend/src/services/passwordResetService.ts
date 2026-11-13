import { BaseService } from './baseService';

export interface PasswordResetResponse {
  success: boolean;
  message: string;
}

/**
 * Forgotten-password recovery via SMS OTP — deliberately calls fetchPublic,
 * not fetchWithAuth: a locked-out user has no session to authenticate with.
 */
export class PasswordResetService extends BaseService {
  async requestReset(phone: string): Promise<PasswordResetResponse> {
    const response = await this.fetchPublic('/v1/password-reset/request', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    });
    return response.json();
  }

  async confirmReset(phone: string, code: string, newPassword: string): Promise<PasswordResetResponse> {
    const response = await this.fetchPublic('/v1/password-reset/confirm', {
      method: 'POST',
      body: JSON.stringify({ phone, code, new_password: newPassword }),
    });
    return response.json();
  }
}

export const passwordResetService = new PasswordResetService();
