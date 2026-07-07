import { BaseService } from './baseService';

export type OtpChannel = 'sms' | 'email';

export interface OtpSendResult {
  success: boolean;
  message: string;
}

export interface OtpVerifyResult {
  success: boolean;
  message: string;
}

class OtpService extends BaseService {
  async sendOtp(
    target: string,
    channel: OtpChannel,
    purpose = 'phone_verify',
  ): Promise<OtpSendResult> {
    const res = await this.fetchWithAuth('/v1/otp/send', {
      method: 'POST',
      body: JSON.stringify({ target, channel, purpose }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.detail || data?.message || 'Could not send verification code.');
    }
    return data as OtpSendResult;
  }

  async verifyOtp(
    target: string,
    channel: OtpChannel,
    code: string,
  ): Promise<OtpVerifyResult> {
    const res = await this.fetchWithAuth('/v1/otp/verify', {
      method: 'POST',
      body: JSON.stringify({ target, channel, code }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.detail || data?.message || 'Verification failed.');
    }
    return data as OtpVerifyResult;
  }
}

export const otpService = new OtpService();
