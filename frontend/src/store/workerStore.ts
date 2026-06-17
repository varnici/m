import { create } from 'zustand';
import {
  WorkerDashboardSummary,
  WorkerSavingsPlan,
  WorkerInvestment,
  MarketplaceItem,
  LedgerEntry,
} from '@/services/workerService';

// ---------------------------------------------------------------------------
// Shape
// ---------------------------------------------------------------------------

interface WorkerState {
  // Dashboard cache
  summary: WorkerDashboardSummary | null;
  summaryLastFetched: number | null;

  // Marketplace cache
  marketplaceItems: MarketplaceItem[];
  activeCategory: string;

  // Ledger cache
  ledgerEntries: LedgerEntry[];

  // UI flags
  isLoading: boolean;
  error: string | null;

  // Actions
  setSummary: (summary: WorkerDashboardSummary) => void;
  setMarketplaceItems: (items: MarketplaceItem[], category: string) => void;
  setLedgerEntries: (entries: LedgerEntry[]) => void;
  setActiveCategory: (category: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  updateSavingsPlanRule: (
    planId: string,
    rule: 'manual' | 'salary_direct' | 'round_up',
    ruleAmount: number
  ) => void;
  clearCache: () => void;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useWorkerStore = create<WorkerState>((set, get) => ({
  summary: null,
  summaryLastFetched: null,
  marketplaceItems: [],
  activeCategory: 'All',
  ledgerEntries: [],
  isLoading: false,
  error: null,

  setSummary: (summary) =>
    set({ summary, summaryLastFetched: Date.now(), error: null }),

  setMarketplaceItems: (items, category) =>
    set({ marketplaceItems: items, activeCategory: category }),

  setLedgerEntries: (entries) => set({ ledgerEntries: entries }),

  setActiveCategory: (category) => set({ activeCategory: category }),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error, isLoading: false }),

  updateSavingsPlanRule: (planId, rule, ruleAmount) => {
    const { summary } = get();
    if (!summary) return;
    const updated = summary.active_savings_plans.map((p) =>
      p.id === planId ? { ...p, automated_rule: rule, rule_amount: ruleAmount } : p
    );
    set({ summary: { ...summary, active_savings_plans: updated } });
  },

  clearCache: () =>
    set({
      summary: null,
      summaryLastFetched: null,
      marketplaceItems: [],
      ledgerEntries: [],
      error: null,
    }),
}));

// ---------------------------------------------------------------------------
// Derived selectors
// ---------------------------------------------------------------------------

export const selectNetPortfolio = (s: WorkerState) =>
  s.summary?.net_portfolio_value ?? 0;

export const selectMonthlyDividends = (s: WorkerState) =>
  s.summary?.cumulative_monthly_dividends ?? 0;

const EMPTY_ACCOUNT = { number: null as string | null, bank: null as string | null };

export const selectVirtualAccount = (s: WorkerState) =>
  s.summary
    ? { number: s.summary.virtual_account_number, bank: s.summary.virtual_account_bank }
    : EMPTY_ACCOUNT;

const EMPTY_PLANS: WorkerSavingsPlan[] = [];
const EMPTY_INVESTMENTS: WorkerInvestment[] = [];

export const selectActivePlans = (s: WorkerState): WorkerSavingsPlan[] =>
  s.summary?.active_savings_plans ?? EMPTY_PLANS;

export const selectActiveInvestments = (s: WorkerState): WorkerInvestment[] =>
  s.summary?.active_investments ?? EMPTY_INVESTMENTS;
