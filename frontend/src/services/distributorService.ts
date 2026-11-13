import { BaseService } from './baseService';

export interface DistributorProfile {
  id: string;
  user_id: string;
  company_name?: string | null;
  cac_reg_number?: string | null;
  cac_verified: boolean;
  warehouse_address?: string | null;
  warehouse_lat?: number | null;
  warehouse_lng?: number | null;
  product_categories?: string | null;
  min_order_value_kobo?: number | null;
  verified: boolean;
  created_at: string;
}

export interface DistributorDirectoryEntry extends DistributorProfile {
  business_name?: string | null;
}

export interface DistributorSelfProfile extends DistributorProfile {
  bank_name?: string | null;
  account_number?: string | null;
  tin?: string | null;
  verification_note?: string | null;
}

export interface DistributorProfileUpdate {
  company_name?: string;
  warehouse_address?: string;
  warehouse_lat?: number;
  warehouse_lng?: number;
  product_categories?: string;
  min_order_value_kobo?: number;
  bank_name?: string;
  account_number?: string;
}

export interface DistributorListResponse {
  items: DistributorDirectoryEntry[];
  total: number;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  unit_of_measure: string;
  trade_price_kobo: number;
  selling_price_kobo: number;
  trade_moq: number;
  category_id?: string | null;
}

export interface TradeCreditSummary {
  trust_score: number;
  savings_consistency: number;
  sales_velocity_score: number;
  trade_credit_limit_kobo: number;
  trade_credit_in_use_kobo: number;
  trade_credit_available_kobo: number;
  currency: string;
}

export interface DistributorOrderLine {
  product_id: string;
  quantity: number;
  unit_price_kobo: number;
}

export interface TradeOrder {
  id: string;
  owner_id: string;
  client_id: string;
  store_id: string;
  status: string;
  payment_terms: string;
  total_kobo: number;
  lines: Array<{ id: string; product_id: string; quantity: number; unit_price_kobo: number }>;
  created_at: string;
}

export class DistributorService extends BaseService {
  async getMyProfile(): Promise<DistributorSelfProfile | null> {
    try {
      const response = await this.fetchWithAuth('/v1/distributors/me');
      return response.json();
    } catch (err) {
      if ((err as Error & { status?: number }).status === 404) return null;
      throw err;
    }
  }

  async updateMyProfile(data: DistributorProfileUpdate): Promise<DistributorSelfProfile> {
    const response = await this.fetchWithAuth('/v1/distributors/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.json();
  }

  async list(verifiedOnly = true, skip = 0, limit = 50): Promise<DistributorListResponse> {
    const params = new URLSearchParams({
      verified_only: String(verifiedOnly),
      skip: String(skip),
      limit: String(limit),
    });
    const response = await this.fetchWithAuth(`/v1/distributors?${params}`);
    return response.json();
  }

  async getCatalog(distributorId: string, search?: string): Promise<Product[]> {
    const params = new URLSearchParams({ ...(search && { search }) });
    const qs = params.toString();
    const response = await this.fetchWithAuth(`/v1/distributors/${distributorId}/products${qs ? `?${qs}` : ''}`);
    return response.json();
  }

  async getTradeCredit(): Promise<TradeCreditSummary> {
    const response = await this.fetchWithAuth('/v1/distributors/trade-credit');
    return response.json();
  }

  async createOrder(distributorId: string, lines: DistributorOrderLine[]): Promise<TradeOrder> {
    const response = await this.fetchWithAuth(`/v1/distributors/${distributorId}/orders`, {
      method: 'POST',
      body: JSON.stringify({ lines }),
    });
    return response.json();
  }
}

export const distributorService = new DistributorService();
