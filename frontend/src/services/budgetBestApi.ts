import { SavingsGoalResponse, SavingsDashboard } from '../types/budget-best';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

// ===================== SAVINGS GOALS =====================

export async function createGoal(goalData: any): Promise<SavingsGoalResponse> {
  const res = await fetch(`${API_URL}/budget-best/goals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(goalData),
  });
  if (!res.ok) throw new Error('Failed to create goal');
  return res.json();
}

export async function listGoals(onlyActive: boolean = true): Promise<SavingsGoalResponse[]> {
  const res = await fetch(
    `${API_URL}/budget-best/goals?only_active=${onlyActive}`
  );
  if (!res.ok) throw new Error('Failed to fetch goals');
  return res.json();
}

export async function getGoal(goalId: string): Promise<SavingsGoalResponse> {
  const res = await fetch(`${API_URL}/budget-best/goals/${goalId}`);
  if (!res.ok) throw new Error('Goal not found');
  return res.json();
}

export async function updateGoal(goalId: string, data: any): Promise<SavingsGoalResponse> {
  const res = await fetch(`${API_URL}/budget-best/goals/${goalId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update goal');
  return res.json();
}

export async function deleteGoal(goalId: string): Promise<void> {
  const res = await fetch(`${API_URL}/budget-best/goals/${goalId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete goal');
}

// ===================== TRANSACTIONS =====================

export async function recordTransaction(transactionData: any) {
  const res = await fetch(`${API_URL}/budget-best/transactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(transactionData),
  });
  if (!res.ok) throw new Error('Failed to record transaction');
  return res.json();
}

export async function getGoalTransactions(goalId: string, limit: number = 50, offset: number = 0) {
  const res = await fetch(
    `${API_URL}/budget-best/transactions/goal/${goalId}?limit=${limit}&offset=${offset}`
  );
  if (!res.ok) throw new Error('Failed to fetch transactions');
  return res.json();
}

// ===================== REMINDERS =====================

export async function createReminder(reminderData: any) {
  const res = await fetch(`${API_URL}/budget-best/reminders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reminderData),
  });
  if (!res.ok) throw new Error('Failed to create reminder');
  return res.json();
}

export async function updateReminder(reminderId: string, data: any) {
  const res = await fetch(`${API_URL}/budget-best/reminders/${reminderId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update reminder');
  return res.json();
}

// ===================== STREAKS =====================

export async function getStreak() {
  const res = await fetch(`${API_URL}/budget-best/streak`);
  if (!res.ok) throw new Error('Failed to fetch streak');
  return res.json();
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
  const res = await fetch(`${API_URL}/budget-best/dashboard`);
  if (!res.ok) throw new Error('Failed to fetch dashboard');
  return res.json();
}

// ===================== POLICY =====================

export async function getPolicy(version: string = '1.0') {
  const res = await fetch(`${API_URL}/budget-best/policy?version=${version}`);
  if (!res.ok) throw new Error('Failed to fetch policy');
  return res.json();
}

export async function acceptPolicy(policyId: string) {
  const res = await fetch(`${API_URL}/budget-best/policy/${policyId}/accept`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to accept policy');
  return res.json();
}
