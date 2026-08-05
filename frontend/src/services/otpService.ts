import { BaseService } from './baseService';

export interface OtpSendResult {
  success: boolean;
  message: string;
  sms_sent: boolean;
  email_sent: boolean;
}

export interface OtpVerifyResult {
  success: boolean;
  message: string;
}

/**
 * Every OTP goes out on both SMS and email, sharing one code — either
 * channel's code verifies successfully, so a delivery problem on one
 * doesn't block the user if the other got through.
 */
class OtpService extends BaseService {
  async sendOtp(
    phone: string,
    email: string,
    purpose = 'phone_verify',
  ): Promise<OtpSendResult> {
    const res = await this.fetchWithAuth('/v1/otp/send', {
      method: 'POST',
      body: JSON.stringify({ phone, email, purpose }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.detail || data?.message || 'Could not send verification code.');
    }
    return data as OtpSendResult;
  }

  async verifyOtp(
    phone: string,
    email: string,
    code: string,
  ): Promise<OtpVerifyResult> {
    const res = await this.fetchWithAuth('/v1/otp/verify', {
      method: 'POST',
      body: JSON.stringify({ phone, email, code }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.detail || data?.message || 'Verification failed.');
    }
    return data as OtpVerifyResult;
  }
}

export const otpService = new OtpService();
