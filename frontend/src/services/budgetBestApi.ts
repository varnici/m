import {
  SavingsGoalResponse,
  SavingsDashboard,
  SavingsTransactionResponse,
  SavingsStreakResponse,
  ReminderSettingsResponse,
  PolicyConsentResponse,
} from '../types/budget-best';
import { supabase } from '../lib/supabase';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

async function buildAuthHeaders(): Promise<HeadersInit> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('Unauthorized: Please log in again');
  }

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session.access_token}`,
    'X-User-Id': session.user.id,
  };
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = await buildAuthHeaders();
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      ...headers,
      ...(init.headers || {}),
    },
  });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const err = await res.json();
      message = err?.detail || err?.message || message;
    } catch {
      // Keep fallback message.
    }
    throw new Error(message);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

// ===================== SAVINGS GOALS =====================

export async function createGoal(goalData: any): Promise<SavingsGoalResponse> {
  return request<SavingsGoalResponse>('/budget-best/goals', {
    method: 'POST',
    body: JSON.stringify(goalData),
  });
}

export async function listGoals(onlyActive: boolean = true): Promise<SavingsGoalResponse[]> {
  return request<SavingsGoalResponse[]>(
    `/budget-best/goals?only_active=${onlyActive}`
  );
}

export async function getGoal(goalId: string): Promise<SavingsGoalResponse> {
  return request<SavingsGoalResponse>(`/budget-best/goals/${goalId}`);
}

export async function updateGoal(goalId: string, data: any): Promise<SavingsGoalResponse> {
  return request<SavingsGoalResponse>(`/budget-best/goals/${goalId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteGoal(goalId: string): Promise<void> {
  await request<void>(`/budget-best/goals/${goalId}`, {
    method: 'DELETE',
  });
}

// ===================== TRANSACTIONS =====================

export async function recordTransaction(transactionData: any) {
  return request<SavingsTransactionResponse>('/budget-best/transactions', {
    method: 'POST',
    body: JSON.stringify(transactionData),
  });
}

export async function getGoalTransactions(goalId: string, limit: number = 50, offset: number = 0) {
  return request<SavingsTransactionResponse[]>(
    `/budget-best/transactions/goal/${goalId}?limit=${limit}&offset=${offset}`
  );
}

// ===================== REMINDERS =====================

export async function createReminder(reminderData: any) {
  return request<ReminderSettingsResponse>('/budget-best/reminders', {
    method: 'POST',
    body: JSON.stringify(reminderData),
  });
}

export async function updateReminder(reminderId: string, data: any) {
  return request<ReminderSettingsResponse>(`/budget-best/reminders/${reminderId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

// ===================== STREAKS =====================

export async function getStreak() {
  return request<SavingsStreakResponse>('/budget-best/streak');
}

// ===================== AUTO-SWEEP =====================

export async function createAutoSweep(sweepData: any) {
  const res = await fetch(`${API_URL}/budget-best/auto-sweep`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sweepData),
  });
  if (!res.ok) throw new Error('Failed to create auto-sweep');
  return res.json();
}

export async function getAutoSweep(sweepId: string) {
  const res = await fetch(`${API_URL}/budget-best/auto-sweep/${sweepId}`);
  if (!res.ok) throw new Error('Failed to fetch auto-sweep settings');
  return res.json();
}

// ===================== BUDGET BUCKETS =====================

export async function createBucket(bucketData: any) {
  const res = await fetch(`${API_URL}/budget-best/buckets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bucketData),
  });
  if (!res.ok) throw new Error('Failed to create bucket');
  return res.json();
}

export async function listBuckets() {
  const res = await fetch(`${API_URL}/budget-best/buckets`);
  if (!res.ok) throw new Error('Failed to fetch buckets');
  return res.json();
}

// ===================== DASHBOARD =====================

export async function getDashboard(): Promise<SavingsDashboard> {
  return request<SavingsDashboard>('/budget-best/dashboard');
}

// ===================== POLICY =====================

export async function getPolicy(version: string = '1.0') {
  return request<PolicyConsentResponse>(`/budget-best/policy?version=${version}`);
}

export async function acceptPolicy(policyId: string) {
  return request<PolicyConsentResponse>(`/budget-best/policy/${policyId}/accept`, {
    method: 'POST',
  });
}

export const budgetBestApi = {
  createGoal,
  listGoals,
  getGoal,
  updateGoal,
  deleteGoal,
  recordTransaction,
  getGoalTransactions,
  createReminder,
  updateReminder,
  getStreak,
  createAutoSweep,
  getAutoSweep,
  createBucket,
  listBuckets,
  getDashboard,
  getPolicy,
  acceptPolicy,
};
