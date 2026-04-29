/**
 * Budget_Best Types
 */

export interface SavingsGoalResponse {
  id: string;
  user_id: string;
  goal_name: string;
  goal_type: string;
  target_amount: number;
  monthly_goal: number;
  current_savings: number;
  daily_target: number;
  deadline: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SavingsTransactionResponse {
  id: string;
  goal_id: string;
  user_id: string;
  amount: number;
  transaction_type: 'deposit' | 'withdrawal' | 'interest';
  reference_code: string;
  status: string;
  notes?: string;
  created_at: string;
}

export interface ReminderSettingsResponse {
  id: string;
  user_id: string;
  goal_id: string;
  reminder_time: string;
  reminder_enabled: boolean;
  reminder_frequency: string;
  last_reminded_at?: string;
  next_reminder_at?: string;
  created_at: string;
}

export interface SavingsStreakResponse {
  id: string;
  user_id: string;
  current_streak: number;
  best_streak: number;
  streak_start_date: string;
  last_saved_date: string;
  tier_level: 'bronze' | 'silver' | 'gold' | 'platinum';
  badges: string[];
  created_at: string;
  updated_at: string;
}

export interface AutoSweepSettingsResponse {
  id: string;
  user_id: string;
  goal_id: string;
  auto_save_enabled: boolean;
  auto_save_amount: number;
  auto_save_time: string;
  payment_method: string;
  last_auto_save_at?: string;
  created_at: string;
}

export interface BudgetBucketResponse {
  id: string;
  user_id: string;
  bucket_name: string;
  allocation_percentage: number;
  allocated_amount: number;
  bucket_color: string;
  icon_name?: string;
  priority_order: number;
  created_at: string;
  updated_at: string;
}

export interface SavingsProgress {
  goal_id: string;
  goal_name: string;
  goal_type: string;
  target_amount: number;
  current_savings: number;
  daily_target: number;
  progress_percentage: number;
  days_remaining: number;
  last_deposit_date?: string;
  on_track: boolean;
}

export interface SavingsDashboard {
  total_savings: number;
  total_goals: number;
  active_goals: number;
  monthly_deposited: number;
  current_streak: number;
  tier_level: string;
  goals_progress: SavingsProgress[];
  upcoming_deadlines: SavingsGoalResponse[];
  buckets: BudgetBucketResponse[];
}

export interface PolicyConsentResponse {
  id: string;
  user_id: string;
  policy_version: string;
  accepted: boolean;
  accepted_at?: string;
  created_at: string;
}

export interface TransactionLogResponse {
  id: string;
  user_id: string;
  action: string;
  action_details: Record<string, any>;
  created_at: string;
}
