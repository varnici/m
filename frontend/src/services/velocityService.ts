import { BaseService } from './baseService';

export interface VelocityScore {
  score: number;
  credit_limit_kobo: number;
  credit_limit_naira: number;
  units_per_day: number;
  restock_consistency_pct: number;
  repayment_ratio_pct: number;
  breakdown: {
    sales_velocity_component: number;
    restock_component: number;
    repayment_component: number;
    explanation: string;
    weights: { sales: number; restock: number; repayment: number };
  };
  calculated_at: string;
}

export interface VelocityHistory {
  scores: VelocityScore[];
}

class VelocityService extends BaseService {
  async getScore(): Promise<VelocityScore> {
    const res = await this.fetchWithAuth('/v1/velocity/score');
    return res.json();
  }

  async getHistory(limit = 30): Promise<VelocityHistory> {
    const res = await this.fetchWithAuth(`/v1/velocity/history?limit=${limit}`);
    return res.json();
  }
}

export const velocityService = new VelocityService();
