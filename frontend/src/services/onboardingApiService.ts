import { BaseService } from './baseService';

export interface OnboardingStatus {
  account_type: string;
  current_step: string;
  current_step_label: string;
  is_complete: boolean;
  progress_pct: number;
  steps: Array<{ name: string; label: string; completed: boolean }>;
}

export interface StepResult {
  step_completed: string;
  next_step: string | null;
  is_complete: boolean;
  message: string;
  kyc_verified?: boolean | null;
  kyc_message?: string | null;
}

class OnboardingApiService extends BaseService {
  async startOnboarding(accountType: string): Promise<OnboardingStatus> {
    const res = await this.fetchWithAuth('/v1/onboarding/start', {
      method: 'POST',
      body: JSON.stringify({ account_type: accountType }),
    });
    return res.json();
  }

  async getStatus(): Promise<OnboardingStatus> {
    const res = await this.fetchWithAuth('/v1/onboarding/status');
    return res.json();
  }

  async submitStep(stepName: string, data: Record<string, any> = {}): Promise<StepResult> {
    const res = await this.fetchWithAuth(`/v1/onboarding/step/${stepName}`, {
      method: 'POST',
      body: JSON.stringify({ data }),
    });
    return res.json();
  }

  async submitAllSteps(
    accountType: string,
    steps: Array<{ name: string; data: Record<string, any> }>,
  ): Promise<StepResult[]> {
    await this.startOnboarding(accountType);
    const results: StepResult[] = [];
    for (const step of steps) {
      results.push(await this.submitStep(step.name, step.data));
    }
    return results;
  }
}

export const onboardingApi = new OnboardingApiService();
