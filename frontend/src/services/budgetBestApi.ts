import {
  SavingsGoalResponse,
  SavingsDashboard,
  SavingsTransactionResponse,
  SavingsStreakResponse,
  ReminderSettingsResponse,
  PolicyConsentResponse,
  AutoSweepSettingsResponse,
  BudgetBucketResponse,
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

// ===================== ADAPTERS =====================

export function adaptGoal(goal: any): SavingsGoalResponse {
  if (!goal) return {} as SavingsGoalResponse;
  const target_amount = Number(goal.target_amount || 0);
  const current_savings = Number(goal.current_savings || 0);
  const progress_percentage = target_amount > 0 ? (current_savings / target_amount) * 100 : 0;
  
  return {
    id: goal.id,
    user_id: goal.user_id,
    title: goal.goal_name || '',
    goal_name: goal.goal_name,
    description: goal.description || '',
    category: goal.goal_type || 'custom',
    target_amount_kobo: Math.round(target_amount * 100),
    current_total_kobo: Math.round(current_savings * 100),
    currency: 'NGN',
    status: goal.is_active ? 'active' : 'cancelled',
    is_auto_save_enabled: goal.is_auto_save_enabled || false,
    auto_save_amount_kobo: Math.round(Number(goal.auto_save_amount || 0) * 100),
    auto_save_frequency: goal.auto_save_frequency,
    target_date: goal.deadline,
    image_url: goal.image_url,
    created_at: goal.created_at,
    updated_at: goal.updated_at,
    progress_percentage: Number(progress_percentage.toFixed(2)),
  };
}

export function adaptTransaction(txn: any): SavingsTransactionResponse {
  if (!txn) return {} as SavingsTransactionResponse;
  const amount = Number(txn.amount || 0);
  return {
    id: txn.id,
    goal_id: txn.goal_id,
    user_id: txn.user_id,
    amount_kobo: Math.round(amount * 100),
    transaction_type: txn.transaction_type,
    status: txn.status || 'completed',
    management_fee_kobo: Math.round(Number(txn.management_fee || 0) * 100),
    partner_commission_kobo: Math.round(Number(txn.partner_commission || 0) * 100),
    reference: txn.reference_code || txn.reference,
    notes: txn.notes || '',
    metadata: txn.metadata || {},
    created_at: txn.created_at,
  };
}

export function adaptDashboard(dash: any): SavingsDashboard {
  if (!dash) return {} as SavingsDashboard;
  const goals = (dash.goals || []).map(adaptGoal);
  
  const streak: SavingsStreakResponse | null = dash.current_streak ? {
    user_id: '',
    streak_count: dash.current_streak || 0,
    longest_streak: dash.current_streak || 0,
    total_savings_count: dash.total_goals || 0,
    last_streak_update: new Date().toISOString(),
  } : null;

  return {
    goals,
    streak,
    total_saved_kobo: Math.round(Number(dash.total_savings || 0) * 100),
    active_goals_count: dash.active_goals || 0,
    completed_goals_count: (dash.total_goals || 0) - (dash.active_goals || 0),
    dynamic_suggestion: dash.dynamic_suggestion || {
      reason: 'no_active_goals',
      message: 'Keep going!'
    },
    // Keep microservice fields for compatibility
    total_savings: Number(dash.total_savings || 0),
    total_goals: Number(dash.total_goals || 0),
    active_goals: Number(dash.active_goals || 0),
    monthly_deposited: Number(dash.monthly_deposited || 0),
    current_streak: Number(dash.current_streak || 0),
    tier_level: dash.tier_level || 'bronze',
    goals_progress: dash.goals_progress || [],
    upcoming_deadlines: (dash.upcoming_deadlines || []).map(adaptGoal),
  };
}

// ===================== SAVINGS GOALS =====================

export async function createGoal(goalData: any): Promise<SavingsGoalResponse> {
  const data = await request<any>('/budget-best/goals', {
    method: 'POST',
    body: JSON.stringify(goalData),
  });
  return adaptGoal(data);
}

export async function listGoals(onlyActive: boolean = true): Promise<SavingsGoalResponse[]> {
  const data = await request<any[]>((`/budget-best/goals?only_active=${onlyActive}`) as string);
  return (data || []).map(adaptGoal);
}

export async function getGoal(goalId: string): Promise<SavingsGoalResponse> {
  const data = await request<any>(`/budget-best/goals/${goalId}`);
  return adaptGoal(data);
}

export async function updateGoal(goalId: string, data: any): Promise<SavingsGoalResponse> {
  const resData = await request<any>(`/budget-best/goals/${goalId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  return adaptGoal(resData);
}

export async function deleteGoal(goalId: string): Promise<void> {
  await request<void>(`/budget-best/goals/${goalId}`, {
    method: 'DELETE',
  });
}

// ===================== TRANSACTIONS =====================

export async function recordTransaction(transactionData: any): Promise<SavingsTransactionResponse> {
  const data = await request<any>('/budget-best/transactions', {
    method: 'POST',
    body: JSON.stringify(transactionData),
  });
  return adaptTransaction(data);
}

export async function getGoalTransactions(goalId: string, limit: number = 50, offset: number = 0): Promise<SavingsTransactionResponse[]> {
  const data = await request<any[]>(
    `/budget-best/transactions/goal/${goalId}?limit=${limit}&offset=${offset}`
  );
  return (data || []).map(adaptTransaction);
}

// ===================== REMINDERS =====================

export async function createReminder(reminderData: any): Promise<ReminderSettingsResponse> {
  return request<ReminderSettingsResponse>('/budget-best/reminders', {
    method: 'POST',
    body: JSON.stringify(reminderData),
  });
}

export async function updateReminder(reminderId: string, data: any): Promise<ReminderSettingsResponse> {
  return request<ReminderSettingsResponse>(`/budget-best/reminders/${reminderId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function getReminderForGoal(goalId: string): Promise<ReminderSettingsResponse | null> {
  try {
    return await request<ReminderSettingsResponse>(`/budget-best/reminders/goal/${goalId}`);
  } catch (err: any) {
    if (err.message && (err.message.includes('404') || err.message.includes('not found'))) {
      return null;
    }
    throw err;
  }
}

// ===================== STREAKS =====================

export async function getStreak(): Promise<SavingsStreakResponse> {
  return request<SavingsStreakResponse>('/budget-best/streak');
}

// ===================== AUTO-SWEEP =====================

export async function createAutoSweep(sweepData: any): Promise<AutoSweepSettingsResponse> {
  return request<AutoSweepSettingsResponse>('/budget-best/auto-sweep', {
    method: 'POST',
    body: JSON.stringify(sweepData),
  });
}

export async function getAutoSweep(sweepId: string): Promise<AutoSweepSettingsResponse> {
  return request<AutoSweepSettingsResponse>(`/budget-best/auto-sweep/${sweepId}`);
}

export async function getAutoSweepForGoal(goalId: string): Promise<AutoSweepSettingsResponse | null> {
  try {
    return await request<AutoSweepSettingsResponse>(`/budget-best/auto-sweep/goal/${goalId}`);
  } catch (err: any) {
    if (err.message && (err.message.includes('404') || err.message.includes('not found'))) {
      return null;
    }
    throw err;
  }
}

export async function updateAutoSweep(sweepId: string, data: any): Promise<AutoSweepSettingsResponse> {
  return request<AutoSweepSettingsResponse>(`/budget-best/auto-sweep/${sweepId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

// ===================== BUDGET BUCKETS =====================

export async function createBucket(bucketData: any): Promise<BudgetBucketResponse> {
  return request<BudgetBucketResponse>('/budget-best/buckets', {
    method: 'POST',
    body: JSON.stringify(bucketData),
  });
}

export async function listBuckets(): Promise<BudgetBucketResponse[]> {
  return request<BudgetBucketResponse[]>('/budget-best/buckets');
}

// ===================== DASHBOARD =====================

export async function getDashboard(): Promise<SavingsDashboard> {
  const data = await request<any>('/budget-best/dashboard');
  return adaptDashboard(data);
}

// ===================== POLICY =====================

export async function getPolicy(version: string = '1.0'): Promise<PolicyConsentResponse> {
  return request<PolicyConsentResponse>(`/budget-best/policy?version=${version}`);
}

export async function acceptPolicy(policyId: string): Promise<PolicyConsentResponse> {
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
  getReminderForGoal,
  getStreak,
  createAutoSweep,
  getAutoSweep,
  getAutoSweepForGoal,
  updateAutoSweep,
  createBucket,
  listBuckets,
  getDashboard,
  getPolicy,
  acceptPolicy,
  adaptGoal,
  adaptTransaction,
  adaptDashboard,
};
