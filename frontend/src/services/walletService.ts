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
  async getWalletDetails(userId: string): Promise<WalletDetails> {
    const response = await this.fetchWithAuth(`/v1/core/wallet/${userId}`);
    return response.json();
  }

  async topUpWallet(userId: string, amountKobo: number): Promise<void> {
    await this.fetchWithAuth(`/v1/core/wallet/${userId}/topup`, {
      method: 'POST',
      body: JSON.stringify({ amount_kobo: amountKobo }),
    });
  }
}

export class LoanService extends BaseService {
  async getActiveLoan(userId: string): Promise<LoanDetails | null> {
    const response = await this.fetchWithAuth(`/v1/core/loans/active?user_id=${userId}`);
    if (response.status === 404) return null;
    return response.json();
  }

  async getRepaymentSchedule(loanId: string): Promise<LoanRepayment[]> {
    const response = await this.fetchWithAuth(`/v1/core/loans/${loanId}/schedule`);
    return response.json();
  }
}

export const walletService = new WalletService();
export const loanService = new LoanService();
