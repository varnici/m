import { BaseService } from './baseService';

export interface DashboardData {
  user: {
    id: string;
    full_name: string;
    avatar_initials?: string;
    trust_level: string;
    business_name?: string;
  };
  wallet: {
    balance_kobo: number;
    daily_change_kobo: number;
    available_credit_kobo: number;
    total_debt_kobo: number;
    next_repayment_date?: string;
    repayment_amount_kobo?: number;
  };
  credit_score?: {
    total_score: number;
    tier: string;
    calculated_at: string;
  };
  today_sales?: {
    total_amount_kobo: number;
    num_transactions: number;
    vs_yesterday_percent: number;
  };
  recent_activity: Array<{
    id: string;
    amount_kobo: number;
    type: 'sale' | 'repayment' | 'loan';
    description: string;
    created_at: string;
  }>;
  market_ticker: Array<{
    symbol: string;
    price?: string;
    change: string;
    positive: boolean;
  }>;
  intelligence: Array<{
    category: string;
    source: string;
    timeAgo: string;
    headline: string;
    subtitle: string;
  }>;
  sales_streak?: {
    streak_days: number;
    total_days: number;
    points_earned: number;
    next_reward_tier: string;
  };
  community_stats?: {
    total_members: number;
    active_discussions: number;
    new_opportunities: number;
  };
}

export class DashboardService extends BaseService {
  /**
   * Fetch complete dashboard summary for a user
   */
  async getDashboardSummary(userId: string): Promise<DashboardData> {
    const response = await this.fetchWithAuth(`/v1/dashboard/${userId}`);
    return response.json();
  }
}

export const dashboardService = new DashboardService();
