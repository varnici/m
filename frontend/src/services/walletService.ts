import { BaseService } from './baseService';

export interface Transaction {
  id: string;
  amount_kobo: number;
  type: 'sale' | 'repayment' | 'loan' | 'withdrawal' | 'deposit';
  description: string;
  created_at: string;
  status: 'completed' | 'pending' | 'failed';
}

export interface WalletDetails {
  balance_kobo: number;
  currency: string;
  account_number: string;
  recent_transactions: Transaction[];
}

export interface LoanRepayment {
  id: string;
  amount_kobo: number;
  due_date: string;
  status: 'paid' | 'pending' | 'overdue';
}

export interface LoanDetails {
  id: string;
  principal_kobo: number;
  interest_rate: number;
  balance_kobo: number;
  next_repayment_date?: string;
  repayment_schedule: LoanRepayment[];
}

export class WalletService extends BaseService {
  async getWalletDetails(_userId?: string): Promise<WalletDetails> {
    const response = await this.fetchWithAuth(`/v1/wallet`);
    return response.json();
  }

  async topUpWallet(_userId: string, amountKobo: number): Promise<void> {
    await this.fetchWithAuth(`/v1/wallet/topup`, {
      method: 'POST',
      body: JSON.stringify({ amount_kobo: amountKobo }),
    });
  }
}

export interface ActiveLoanData {
  id: string;
  product_name: string;
  loan_amount: number;
  outstanding: number;
  status: string;
  due_date: string | null;
  insured: boolean;
  icon: string;
}

export interface LoanHistoryItem {
  id: string;
  product_name: string;
  month: string;
  amount: number;
  status: string;
}

export interface LoanDashboardData {
  available_credit: number;
  credit_in_use: number;
  active_loans: ActiveLoanData[];
  loan_history: LoanHistoryItem[];
}

export class LoanService extends BaseService {
  async getLoanDashboard(_userId?: string): Promise<LoanDashboardData> {
    const response = await this.fetchWithAuth(`/v1/loans/dashboard`);
    return response.json();
  }

  async createLoan(_userId: string, productSku: string, productQty: number, principalKobo: number): Promise<any> {
    const response = await this.fetchWithAuth(`/v1/loans`, {
      method: 'POST',
      body: JSON.stringify({
        product_sku: productSku,
        product_qty: productQty,
        principal_kobo: principalKobo,
      }),
    });
    return response.json();
  }

  async applyRepayment(loanId: string, amountKobo: number): Promise<any> {
    const response = await this.fetchWithAuth(`/v1/loans/${loanId}/repay`, {
      method: 'POST',
      body: JSON.stringify({ amount_kobo: amountKobo }),
    });
    return response.json();
  }
}

export const walletService = new WalletService();
export const loanService = new LoanService();

