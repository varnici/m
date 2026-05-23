/**
 * Budget_Best Types (Production Grade)
 */

export interface SavingsGoalResponse {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  category: string;
  target_amount_kobo: int;
  current_total_kobo: int;
  currency: string;
  status: 'active' | 'completed' | 'paused' | 'cancelled';
  is_auto_save_enabled: boolean;
  auto_save_amount_kobo: int;
  auto_save_frequency?: 'daily' | 'weekly' | 'monthly';
  target_date?: string;
  image_url?: string;
  created_at: string;
  updated_at: string;
  progress_percentage: number;
}

export interface SavingsTransactionResponse {
  id: string;
  goal_id: string;
  user_id: string;
  amount_kobo: int;
  transaction_type: 'deposit' | 'withdrawal' | 'interest' | 'fee_rebate' | 'adjustment';
  status: 'pending' | 'completed' | 'failed' | 'reversed';
  management_fee_kobo: int;
  partner_commission_kobo: int;
  reference?: string;
  notes?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface SavingsStreakResponse {
  user_id: string;
  last_deposit_date?: string;
  streak_count: number;
  longest_streak: number;
  total_savings_count: number;
  last_streak_update: string;
}

export interface SavingsDashboardResponse {
  goals: SavingsGoalResponse[];
  streak: SavingsStreakResponse | null;
  total_saved_kobo: number;
  active_goals_count: number;
  completed_goals_count: number;
}

export type int = number;
