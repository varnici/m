/**
 * Budget_Best Types (Production Grade)
 */

export interface SavingsGoalResponse {
  id: string;
  user_id: string;
  title: string;
  goal_name?: string;
  description?: string;
  category: string;
  target_amount_kobo: number;
  current_total_kobo: number;
  currency: string;
  status: 'active' | 'completed' | 'paused' | 'cancelled';
  is_auto_save_enabled: boolean;
  auto_save_amount_kobo: number;
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
  amount_kobo: number;
  transaction_type: 'deposit' | 'withdrawal' | 'interest' | 'fee_rebate' | 'adjustment';
  status: 'pending' | 'completed' | 'failed' | 'reversed';
  management_fee_kobo: number;
  partner_commission_kobo: number;
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
  goals: SavingsGoalResponse[];
  streak: SavingsStreakResponse | null;
  total_saved_kobo: number;
  active_goals_count: number;
  completed_goals_count: number;
  dynamic_suggestion?: {
    reason: string;
    message: string;
  };

  // Microservice fields
  total_savings?: number;
  total_goals?: number;
  active_goals?: number;
  monthly_deposited?: number;
  current_streak?: number;
  tier_level?: string;
  goals_progress?: SavingsProgress[];
  upcoming_deadlines?: SavingsGoalResponse[];
}

export interface ReminderSettingsResponse {
  id: string;
  user_id: string;
  goal_id: string;
  reminder_time: string;
  reminder_enabled: boolean;
  reminder_frequency: 'daily' | 'weekly' | 'monthly';
  last_reminded_at?: string;
  next_reminder_at?: string;
  created_at: string;
}

export interface PolicyConsentResponse {
  id: string;
  user_id: string;
  version?: string;
  policy_version?: string;
  consent_given?: boolean;
  consent_timestamp?: string;
  terms_document_url?: string;
  accepted?: boolean;
  policy_content?: string;
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
  icon_name?: string | null;
  priority_order: number;
  created_at: string;
  updated_at: string;
}

export type int = number;

