import { BaseService } from './baseService';

export interface SalesTransactionItem {
  product_id: string;
  quantity_sold: number;
  unit_price_kobo: number;
  reservation_id?: string;
}

export interface ProcessSaleRequest {
  store_id: string;
  items: SalesTransactionItem[];
  payment_method?: 'cash' | 'card' | 'transfer' | 'credit';
  customer_id?: string;
  notes?: string;
}

export class SalesService extends BaseService {
  async processSale(data: ProcessSaleRequest): Promise<any> {
    const response = await this.fetchWithAuth('/v1/inventory/sales/process', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Failed to process sale');
    }
    
    return response.json();
  }

  async getSalesHistory(skip: number = 0, limit: number = 20): Promise<any[]> {
    const params = new URLSearchParams({
      skip: skip.toString(),
      limit: limit.toString(),
    });

    const response = await this.fetchWithAuth(`/v1/inventory/analytics/ledger?${params}`);
    return response.json();
  }

  async getSale(txId: string): Promise<any> {
    const response = await this.fetchWithAuth(`/v1/inventory/sales/${txId}`);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Failed to fetch sale details');
    }
    return response.json();
  }

  async updateSale(txId: string, data: any): Promise<any> {
    const response = await this.fetchWithAuth(`/v1/inventory/sales/${txId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Failed to update sale');
    }
    
    return response.json();
  }
}

export const salesService = new SalesService();
