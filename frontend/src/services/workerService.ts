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

export interface DividendRecord {
  id: string;
  period_date: string;
  amount: number;
  status: 'accrued' | 'available' | 'collected';
  collected_at: string | null;
}

export interface InvestmentDetail {
  id: string;
  cluster_id: string;
  business_name: string;
  principal_amount: number;
  dividends_earned: number;
  total_collected: number;
  status: string;
  term_months: number;
  monthly_rate_pct: number;
  start_date: string;
  maturity_date: string;
  penalty_rate_pct: number;
  current_yield_pct: number;
  created_at: string;
  days_remaining: number;
  is_matured: boolean;
  available_dividends: number;
  dividend_records: DividendRecord[];
}

export interface PortfolioInvestment {
  id: string;
  cluster_id: string;
  business_name: string;
  principal_amount: number;
  dividends_earned: number;
  total_collected: number;
  status: string;
  term_months: number;
  monthly_rate_pct: number;
  start_date: string;
  maturity_date: string;
  days_remaining: number;
  is_matured: boolean;
  progress_pct: number;
  available_dividends: number;
}

export interface PortfolioSummary {
  total_principal: number;
  total_dividends_earned: number;
  total_collected: number;
  total_available: number;
  active_count: number;
  matured_count: number;
  investments: PortfolioInvestment[];
}

export interface CreateInvestmentPayload {
  cluster_id: string;
  amount: number;
  term_months: 6 | 12;
}

export interface CollectDividendResponse {
  investment_id: string;
  collected_amount: number;
  records_collected: number;
  message: string;
}

export interface WithdrawResponse {
  investment_id: string;
  principal_returned: number;
  uncollected_dividends: number;
  penalty_pct: number;
  penalty_amount: number;
  net_amount: number;
  is_early: boolean;
  message: string;
}

export interface CreateSavingsPlanPayload {
  target_name: string;
  target_amount: number;
  automated_rule?: 'manual' | 'salary_direct' | 'round_up';
  rule_amount?: number;
}

export interface DividendHistoryItem {
  id: string;
  investment_id: string;
  business_name: string;
  period_date: string;
  amount: number;
  status: 'accrued' | 'available' | 'collected';
  collected_at: string | null;
}

// ---------------------------------------------------------------------------
// Service calls
// ---------------------------------------------------------------------------

export interface FundingRound {
  id: string;
  cluster_id: string;
  business_name: string;
  category: string;
  distributor_order_id?: string | null;
  target_amount_kobo: number;
  raised_amount_kobo: number;
  progress_pct: number;
  contributors_count: number;
  status: 'open' | 'funded' | 'closed';
  created_at: string;
}

export interface FundingContributor {
  investor_id: string;
  amount_kobo: number;
  contributed_at: string;
}

export interface FundingRoundDetail extends FundingRound {
  contributors: FundingContributor[];
}

export interface ContributeFundingRoundResult {
  investment_id: string;
  round_id: string;
  amount_kobo: number;
  raised_amount_kobo: number;
  target_amount_kobo: number;
  round_status: string;
  settled: boolean;
}

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

  async createSavingsPlan(payload: CreateSavingsPlanPayload): Promise<WorkerSavingsPlan> {
    const response = await this.fetchWithAuth(`${BASE}/savings/create`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return response.json();
  }

  async getDividendHistory(): Promise<DividendHistoryItem[]> {
    const response = await this.fetchWithAuth(`${BASE}/dividends/history`);
    return response.json();
  }

  async createInvestment(payload: CreateInvestmentPayload): Promise<InvestmentDetail> {
    const response = await this.fetchWithAuth(`${BASE}/investments/create`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return response.json();
  }

  async getPortfolio(): Promise<PortfolioSummary> {
    const response = await this.fetchWithAuth(`${BASE}/investments/portfolio`);
    return response.json();
  }

  async getInvestmentDetails(investmentId: string): Promise<InvestmentDetail> {
    const response = await this.fetchWithAuth(`${BASE}/investments/${investmentId}/details`);
    return response.json();
  }

  async collectDividends(investmentId: string): Promise<CollectDividendResponse> {
    const response = await this.fetchWithAuth(`${BASE}/investments/${investmentId}/collect-dividends`, {
      method: 'POST',
    });
    return response.json();
  }

  async withdrawInvestment(investmentId: string): Promise<WithdrawResponse> {
    const response = await this.fetchWithAuth(`${BASE}/investments/${investmentId}/withdraw`, {
      method: 'POST',
    });
    return response.json();
  }

  async getFundingRounds(status: 'open' | 'funded' | 'closed' = 'open'): Promise<FundingRound[]> {
    const response = await this.fetchWithAuth(`${BASE}/funding-rounds?status=${status}`);
    return response.json();
  }

  async getFundingRound(roundId: string): Promise<FundingRoundDetail> {
    const response = await this.fetchWithAuth(`${BASE}/funding-rounds/${roundId}`);
    return response.json();
  }

  async contributeToFundingRound(roundId: string, amountKobo: number): Promise<ContributeFundingRoundResult> {
    const response = await this.fetchWithAuth(`${BASE}/funding-rounds/${roundId}/contribute`, {
      method: 'POST',
      body: JSON.stringify({ amount_kobo: amountKobo }),
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
