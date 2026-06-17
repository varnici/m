import { BaseService } from './baseService';

const BASE = '/v1/worker';

// ---------------------------------------------------------------------------
// Response types
// ---------------------------------------------------------------------------

export interface WorkerSavingsPlan {
  id: string;
  target_name: string;
  target_amount: number;
  current_balance: number;
  automated_rule: 'manual' | 'salary_direct' | 'round_up';
  rule_amount: number;
  is_achieved: boolean;
  next_collection_date?: string;
}

export interface WorkerInvestment {
  id: string;
  cluster_id: string;
  business_name: string;
  principal_amount: number;
  dividends_earned: number;
  status: string;
  current_yield_pct: number;
  created_at: string;
}

export interface WorkerDashboardSummary {
  user_id: string;
  full_name: string;
  bvn_verified: boolean;
  virtual_account_number: string | null;
  virtual_account_bank: string | null;
  total_savings_balance: number;
  total_invested_principal: number;
  total_dividends_earned: number;
  net_portfolio_value: number;
  cumulative_monthly_dividends: number;
  active_savings_plans: WorkerSavingsPlan[];
  active_investments: WorkerInvestment[];
}

export interface MarketplaceItem {
  rank: number;
  cluster_id: string;
  business_name: string;
  category: string;
  risk_rating: string;
  rolling_30_day_turnover: number;
  projected_monthly_roi: number;
  last_updated_at: string;
}

export interface ConfigureRulesPayload {
  plan_id: string;
  automated_rule: 'manual' | 'salary_direct' | 'round_up';
  rule_amount: number;
}

export interface ConfigureRulesResponse {
  plan_id: string;
  automated_rule: string;
  rule_amount: number;
  message: string;
}

export interface LedgerEntry {
  id: string;
  timestamp: string;
  descriptor: string;
  amount: number;
  classification: 'Credit' | 'Debit' | 'Deposit';
}

// ---------------------------------------------------------------------------
// Service calls
// ---------------------------------------------------------------------------

class WorkerService extends BaseService {
  async getDashboardSummary(_userId?: string): Promise<WorkerDashboardSummary> {
    const response = await this.fetchWithAuth(`${BASE}/dashboard/summary`);
    return response.json();
  }

  async getMarketplaceTop10(category?: string): Promise<MarketplaceItem[]> {
    const qs = category && category !== 'All' ? `?category=${encodeURIComponent(category)}` : '';
    const response = await this.fetchWithAuth(`${BASE}/marketplace/top-10${qs}`);
    return response.json();
  }

  async configureSavingsRules(payload: ConfigureRulesPayload): Promise<ConfigureRulesResponse> {
    const response = await this.fetchWithAuth(`${BASE}/savings/configure-rules`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return response.json();
  }

  // Ledger is constructed client-side from dashboard data in offline-first mode
  buildLedgerFromDashboard(summary: WorkerDashboardSummary): LedgerEntry[] {
    const entries: LedgerEntry[] = [];

    for (const inv of summary.active_investments) {
      entries.push({
        id: `inv-${inv.id}`,
        timestamp: inv.created_at,
        descriptor: `Investment — ${inv.business_name}`,
        amount: inv.principal_amount,
        classification: 'Debit',
      });
      if (inv.dividends_earned > 0) {
        entries.push({
          id: `div-${inv.id}`,
          timestamp: inv.created_at,
          descriptor: `Dividend payment — ${inv.business_name}`,
          amount: inv.dividends_earned,
          classification: 'Credit',
        });
      }
    }

    for (const plan of summary.active_savings_plans) {
      if (plan.current_balance > 0) {
        entries.push({
          id: `sav-${plan.id}`,
          timestamp: new Date().toISOString(),
          descriptor: `Automatic collection sweep — ${plan.target_name}`,
          amount: plan.current_balance,
          classification: 'Deposit',
        });
      }
    }

    return entries.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }
}

export const workerService = new WorkerService();
