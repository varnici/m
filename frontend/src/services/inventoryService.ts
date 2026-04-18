/**
 * Inventory Service - Frontend API Client
 * Type-safe API communication with full Supabase integration
 */

import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';

interface ApiConfig {
  baseURL: string;
  timeout: number;
}

export class InventoryService {
  private supabase = createClient<Database>(
    process.env.EXPO_PUBLIC_SUPABASE_URL!,
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
  );

  private config: ApiConfig = {
    baseURL: process.env.EXPO_PUBLIC_API_URL!,
    timeout: 30000,
  };

  /**
   * Fetch with JWT authentication
   */
  private async fetchWithAuth(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const {
      data: { session },
    } = await this.supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error('Unauthorized: No session');
    }

    const url = `${this.config.baseURL}${endpoint}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      ...options.headers,
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          error.detail || error.message || `HTTP ${response.status}`
        );
      }

      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  // ========================================================================
  // PRODUCTS
  // ========================================================================

  async createProduct(data: any): Promise<any> {
    const response = await this.fetchWithAuth('/v1/inventory/products', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.json();
  }

  async getProducts(
    skip: number = 0,
    limit: number = 100,
    categoryId?: string,
    search?: string
  ): Promise<any[]> {
    const params = new URLSearchParams({
      skip: skip.toString(),
      limit: limit.toString(),
      ...(categoryId && { category_id: categoryId }),
      ...(search && { search }),
    });

    const response = await this.fetchWithAuth(
      `/v1/inventory/products?${params}`
    );
    return response.json();
  }

  async getProductDetail(productId: string, storeId?: string): Promise<any> {
    const params = storeId ? `?store_id=${storeId}` : '';
    const response = await this.fetchWithAuth(
      `/v1/inventory/products/${productId}${params}`
    );
    return response.json();
  }

  async searchByBarcode(barcode: string): Promise<any> {
    const response = await this.fetchWithAuth(
      `/v1/inventory/products/search/by-barcode?barcode=${encodeURIComponent(barcode)}`
    );
    return response.json();
  }

  async updateProduct(productId: string, data: any): Promise<any> {
    const response = await this.fetchWithAuth(
      `/v1/inventory/products/${productId}`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      }
    );
    return response.json();
  }

  // ========================================================================
  // STOCK MANAGEMENT
  // ========================================================================

  async getStockLevels(storeId: string, status?: string): Promise<any[]> {
    const params = status ? `?status=${status}` : '';
    const response = await this.fetchWithAuth(
      `/v1/inventory/stock/${storeId}${params}`
    );
    return response.json();
  }

  async recordStockMovement(data: any): Promise<any> {
    const response = await this.fetchWithAuth('/v1/inventory/stock/adjust', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.json();
  }

  async transferStock(
    fromStoreId: string,
    toStoreId: string,
    productId: string,
    quantity: number
  ): Promise<any> {
    const response = await this.fetchWithAuth('/v1/inventory/stock/transfer', {
      method: 'POST',
      body: JSON.stringify({
        from_store_id: fromStoreId,
        to_store_id: toStoreId,
        product_id: productId,
        quantity,
      }),
    });
    return response.json();
  }

  async getStockMovements(
    storeId?: string,
    productId?: string,
    movementType?: string,
    startDate?: string,
    endDate?: string,
    skip: number = 0,
    limit: number = 100
  ): Promise<any[]> {
    const params = new URLSearchParams({
      skip: skip.toString(),
      limit: limit.toString(),
      ...(storeId && { store_id: storeId }),
      ...(productId && { product_id: productId }),
      ...(movementType && { movement_type: movementType }),
      ...(startDate && { start_date: startDate }),
      ...(endDate && { end_date: endDate }),
    });

    const response = await this.fetchWithAuth(
      `/v1/inventory/stock/movements?${params}`
    );
    return response.json();
  }

  // ========================================================================
  // SUPPLIERS
  // ========================================================================

  async createSupplier(data: any): Promise<any> {
    const response = await this.fetchWithAuth('/v1/inventory/suppliers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.json();
  }

  async getSuppliers(
    status?: string,
    skip: number = 0,
    limit: number = 100
  ): Promise<any[]> {
    const params = new URLSearchParams({
      skip: skip.toString(),
      limit: limit.toString(),
      ...(status && { status }),
    });

    const response = await this.fetchWithAuth(
      `/v1/inventory/suppliers?${params}`
    );
    return response.json();
  }

  async getSupplierDetails(supplierId: string): Promise<any> {
    const response = await this.fetchWithAuth(
      `/v1/inventory/suppliers/${supplierId}`
    );
    return response.json();
  }

  async updateSupplier(supplierId: string, data: any): Promise<any> {
    const response = await this.fetchWithAuth(
      `/v1/inventory/suppliers/${supplierId}`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      }
    );
    return response.json();
  }

  // ========================================================================
  // PURCHASE ORDERS
  // ========================================================================

  async createPurchaseOrder(data: any): Promise<any> {
    const response = await this.fetchWithAuth(
      '/v1/inventory/purchase-orders',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
    return response.json();
  }

  async getPurchaseOrders(
    status?: string,
    supplierId?: string,
    storeId?: string,
    startDate?: string,
    endDate?: string,
    skip: number = 0,
    limit: number = 100
  ): Promise<any[]> {
    const params = new URLSearchParams({
      skip: skip.toString(),
      limit: limit.toString(),
      ...(status && { status }),
      ...(supplierId && { supplier_id: supplierId }),
      ...(storeId && { store_id: storeId }),
      ...(startDate && { start_date: startDate }),
      ...(endDate && { end_date: endDate }),
    });

    const response = await this.fetchWithAuth(
      `/v1/inventory/purchase-orders?${params}`
    );
    return response.json();
  }

  async getPurchaseOrderDetail(poId: string): Promise<any> {
    const response = await this.fetchWithAuth(
      `/v1/inventory/purchase-orders/${poId}`
    );
    return response.json();
  }

  async updatePurchaseOrder(poId: string, data: any): Promise<any> {
    const response = await this.fetchWithAuth(
      `/v1/inventory/purchase-orders/${poId}`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      }
    );
    return response.json();
  }

  async confirmPurchaseOrder(poId: string): Promise<any> {
    const response = await this.fetchWithAuth(
      `/v1/inventory/purchase-orders/${poId}/confirm`,
      {
        method: 'POST',
      }
    );
    return response.json();
  }

  async receivePurchaseOrder(poId: string, items?: any[]): Promise<any> {
    const response = await this.fetchWithAuth(
      `/v1/inventory/purchase-orders/${poId}/receive`,
      {
        method: 'POST',
        body: JSON.stringify({ items }),
      }
    );
    return response.json();
  }

  // ========================================================================
  // ANALYTICS
  // ========================================================================

  async getInventoryDashboard(
    storeId?: string,
    startDate?: string,
    endDate?: string
  ): Promise<any> {
    const params = new URLSearchParams({
      ...(storeId && { store_id: storeId }),
      ...(startDate && { start_date: startDate }),
      ...(endDate && { end_date: endDate }),
    });

    const response = await this.fetchWithAuth(
      `/v1/inventory/analytics/dashboard?${params}`
    );
    return response.json();
  }

  async getProductHealthScores(limit: number = 50): Promise<any[]> {
    const response = await this.fetchWithAuth(
      `/v1/inventory/analytics/product-health?limit=${limit}`
    );
    return response.json();
  }

  async getLowStockAlerts(storeId?: string): Promise<any[]> {
    const params = storeId ? `?store_id=${storeId}` : '';
    const response = await this.fetchWithAuth(
      `/v1/inventory/analytics/low-stock${params}`
    );
    return response.json();
  }

  async getDeadStockDetection(daysNoSales: number = 30): Promise<any[]> {
    const response = await this.fetchWithAuth(
      `/v1/inventory/analytics/dead-stock?days_no_sales=${daysNoSales}`
    );
    return response.json();
  }

  async getAIInsights(storeId?: string): Promise<any> {
    const params = storeId ? `?store_id=${storeId}` : '';
    const response = await this.fetchWithAuth(
      `/v1/inventory/analytics/ai-insights${params}`
    );
    return response.json();
  }

  async calculateTurnoverRatio(
    productId?: string,
    storeId?: string,
    days: number = 30
  ): Promise<any> {
    const params = new URLSearchParams({
      days: days.toString(),
      ...(productId && { product_id: productId }),
      ...(storeId && { store_id: storeId }),
    });

    const response = await this.fetchWithAuth(
      `/v1/inventory/analytics/turnover-ratio?${params}`
    );
    return response.json();
  }

  // ========================================================================
  // VOICE & SCAN
  // ========================================================================

  async processVoiceInput(audioBase64: string, storeId: string): Promise<any> {
    const response = await this.fetchWithAuth('/v1/inventory/voice/parse', {
      method: 'POST',
      body: JSON.stringify({
        audio_base64: audioBase64,
        store_id: storeId,
      }),
    });
    return response.json();
  }

  async scanBarcode(barcodeData: string, storeId: string): Promise<any> {
    const response = await this.fetchWithAuth(
      `/v1/inventory/scan/barcode?barcode_data=${encodeURIComponent(barcodeData)}&store_id=${storeId}`
    );
    return response.json();
  }

  async processCVScan(imageBase64: string, storeId: string): Promise<any> {
    const response = await this.fetchWithAuth(
      '/v1/inventory/scan/computer-vision',
      {
        method: 'POST',
        body: JSON.stringify({
          image_base64: imageBase64,
          store_id: storeId,
        }),
      }
    );
    return response.json();
  }
}

export const inventoryService = new InventoryService();
