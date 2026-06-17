import { BaseService } from './baseService';

export interface ProductGoal {
  id: string;
  product_id: string;
  product_name: string;
  product_unit: string;
  product_image_url?: string;
  target_quantity: number;
  current_price_kobo: number;
  target_amount_kobo: number;
  saved_kobo: number;
  progress_pct: number;
  status: string;
  created_at: string;
}

export interface DepositResult {
  deposit_id: string;
  goal_id: string;
  amount_kobo: number;
  new_saved_kobo: number;
  new_progress_pct: number;
  is_completed: boolean;
  message: string;
}

class ProductSavingsService extends BaseService {
  async createGoal(productId: string, targetQuantity: number): Promise<ProductGoal> {
    const res = await this.fetchWithAuth('/v1/product-savings/goals', {
      method: 'POST',
      body: JSON.stringify({ product_id: productId, target_quantity: targetQuantity }),
    });
    return res.json();
  }

  async listGoals(status?: string): Promise<ProductGoal[]> {
    const qs = status ? `?status=${status}` : '';
    const res = await this.fetchWithAuth(`/v1/product-savings/goals${qs}`);
    return res.json();
  }

  async getGoal(goalId: string): Promise<ProductGoal> {
    const res = await this.fetchWithAuth(`/v1/product-savings/goals/${goalId}`);
    return res.json();
  }

  async deposit(goalId: string, amountKobo: number): Promise<DepositResult> {
    const res = await this.fetchWithAuth(`/v1/product-savings/goals/${goalId}/deposit`, {
      method: 'POST',
      body: JSON.stringify({ amount_kobo: amountKobo }),
    });
    return res.json();
  }
}

export const productSavingsService = new ProductSavingsService();
