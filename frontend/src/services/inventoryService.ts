import { BaseService } from './baseService';
import { 
  Category, Product, Store, StockLevel, StockMovement, 
  StockReservation, Supplier, PurchaseOrder, 
  InventoryDashboardMetrics, AIInsight, TurnoverRatio 
} from '@/types/inventory';

export class InventoryService extends BaseService {
  /**
   * Fetch with JWT authentication (re-using BaseService)
   */

  // ========================================================================
  // PRODUCTS
  // ========================================================================
  async getCategories(): Promise<Category[]> {
    const response = await this.fetchWithAuth('/v1/inventory/categories');
    return response.json();
  }

  async createProduct(data: Partial<Product>): Promise<Product> {
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
    search?: string,
    storeId?: string
  ): Promise<Product[]> {
    const params = new URLSearchParams({
      skip: skip.toString(),
      limit: limit.toString(),
      ...(categoryId && { category_id: categoryId }),
      ...(search && { search }),
      ...(storeId && { store_id: storeId }),
    });

    const response = await this.fetchWithAuth(
      `/v1/inventory/products?${params}`
    );
    return response.json();
  }

  async getMarketplaceProducts(
    skip: number = 0,
    limit: number = 100,
    categoryId?: string,
    search?: string
  ): Promise<Product[]> {
    const params = new URLSearchParams({
      skip: skip.toString(),
      limit: limit.toString(),
      ...(categoryId && { category_id: categoryId }),
      ...(search && { search }),
    });

    const response = await this.fetchWithAuth(
      `/v1/inventory/marketplace/products?${params}`
    );
    return response.json();
  }

  async marketplaceCheckout(data: {
    customer_name?: string;
    customer_phone?: string;
    payment_method?: string;
    shipping_address?: string;
    shipping_city?: string;
    shipping_state?: string;
    shipping_fee_kobo?: number;
    items: Array<{
      product_id: string;
      quantity_sold: number;
      unit_price_kobo: number;
    }>;
  }): Promise<any> {
    const response = await this.fetchWithAuth('/v1/inventory/marketplace/checkout', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.json();
  }

  async getProductDetail(productId: string, storeId?: string): Promise<Product> {
    const params = storeId ? `?store_id=${storeId}` : '';
    const response = await this.fetchWithAuth(
      `/v1/inventory/products/${productId}${params}`
    );
    return response.json();
  }

  async searchByBarcode(barcode: string): Promise<Product> {
    const response = await this.fetchWithAuth(
      `/v1/inventory/products/search/by-barcode?barcode=${encodeURIComponent(barcode)}`
    );
    return response.json();
  }

  async updateProduct(productId: string, data: Partial<Product>): Promise<Product> {
    const response = await this.fetchWithAuth(
      `/v1/inventory/products/${productId}`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      }
    );
    return response.json();
  }

  async deleteProduct(productId: string): Promise<void> {
    await this.fetchWithAuth(`/v1/inventory/products/${productId}`, {
      method: 'DELETE',
    });
  }

  async getInventoryLedger(skip: number = 0, limit: number = 100): Promise<any[]> {
    const params = new URLSearchParams({
      skip: skip.toString(),
      limit: limit.toString(),
    });

    const response = await this.fetchWithAuth(
      `/v1/inventory/analytics/ledger?${params}`
    );
    return response.json();
  }

  async reconcileInventory(storeId?: string, productId?: string): Promise<any> {
    const params = new URLSearchParams();
    if (storeId) params.append('store_id', storeId);
    if (productId) params.append('product_id', productId);
    
    const response = await this.fetchWithAuth(`/v1/inventory/analytics/reconcile?${params.toString()}`);
    return response.json();
  }

  // ========================================================================
  // STOCK MANAGEMENT
  // ========================================================================

  async getStockLevels(storeId: string, status?: string): Promise<StockLevel[]> {
    const params = new URLSearchParams({
      store_id: storeId,
      ...(status && { status }),
    });
    const response = await this.fetchWithAuth(
      `/v1/inventory/stock?${params}`
    );
    return response.json();
  }

  async recordStockMovement(data: Partial<StockMovement>): Promise<StockMovement> {
    const response = await this.fetchWithAuth('/v1/inventory/stock/movements', {
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
  ): Promise<StockMovement> {
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
  ): Promise<StockMovement[]> {
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

  async reserveStock(data: Partial<StockReservation>): Promise<StockReservation> {
    const response = await this.fetchWithAuth('/v1/inventory/stock/reservations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.json();
  }

  async getStockReservations(
    storeId?: string,
    productId?: string,
    status?: string,
    skip: number = 0,
    limit: number = 100
  ): Promise<StockReservation[]> {
    const params = new URLSearchParams({
      skip: skip.toString(),
      limit: limit.toString(),
      ...(storeId && { store_id: storeId }),
      ...(productId && { product_id: productId }),
      ...(status && { status }),
    });

    const response = await this.fetchWithAuth(
      `/v1/inventory/stock/reservations?${params}`
    );
    return response.json();
  }

  async getStockReservation(reservationId: string): Promise<StockReservation> {
    const response = await this.fetchWithAuth(
      `/v1/inventory/stock/reservations/${reservationId}`
    );
    return response.json();
  }

  async releaseStockReservation(reservationId: string, quantity?: number, notes?: string): Promise<StockReservation> {
    const response = await this.fetchWithAuth(
      `/v1/inventory/stock/reservations/${reservationId}/release`,
      {
        method: 'POST',
        body: JSON.stringify({ quantity, notes }),
      }
    );
    return response.json();
  }

  async commitStockReservation(reservationId: string, quantity?: number, notes?: string): Promise<StockReservation> {
    const response = await this.fetchWithAuth(
      `/v1/inventory/stock/reservations/${reservationId}/commit`,
      {
        method: 'POST',
        body: JSON.stringify({ quantity, notes }),
      }
    );
    return response.json();
  }

  // ========================================================================
  // SUPPLIERS
  // ========================================================================

  async createSupplier(data: Partial<Supplier>): Promise<Supplier> {
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
  ): Promise<Supplier[]> {
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

  async getSupplierDetails(supplierId: string): Promise<Supplier> {
    const response = await this.fetchWithAuth(
      `/v1/inventory/suppliers/${supplierId}`
    );
    return response.json();
  }

  async updateSupplier(supplierId: string, data: Partial<Supplier>): Promise<Supplier> {
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

  async createPurchaseOrder(data: Partial<PurchaseOrder>): Promise<PurchaseOrder> {
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
  ): Promise<PurchaseOrder[]> {
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

  async getPurchaseOrderDetail(poId: string): Promise<PurchaseOrder> {
    const response = await this.fetchWithAuth(
      `/v1/inventory/purchase-orders/${poId}`
    );
    return response.json();
  }

  async updatePurchaseOrder(poId: string, data: Partial<PurchaseOrder>): Promise<PurchaseOrder> {
    const response = await this.fetchWithAuth(
      `/v1/inventory/purchase-orders/${poId}`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      }
    );
    return response.json();
  }

  async confirmPurchaseOrder(poId: string): Promise<PurchaseOrder> {
    const response = await this.fetchWithAuth(
      `/v1/inventory/purchase-orders/${poId}/confirm`,
      {
        method: 'POST',
      }
    );
    return response.json();
  }

  async receivePurchaseOrder(poId: string, items?: any[]): Promise<PurchaseOrder> {
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
  ): Promise<InventoryDashboardMetrics> {
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

  async getProductHealthScores(limit: number = 50): Promise<Product[]> {
    const response = await this.fetchWithAuth(
      `/v1/inventory/analytics/product-health?limit=${limit}`
    );
    return response.json();
  }

  async getLowStockAlerts(storeId?: string): Promise<Product[]> {
    const params = storeId ? `?store_id=${storeId}` : '';
    const response = await this.fetchWithAuth(
      `/v1/inventory/analytics/low-stock${params}`
    );
    return response.json();
  }

  async getDeadStockDetection(daysNoSales: number = 30): Promise<Product[]> {
    const response = await this.fetchWithAuth(
      `/v1/inventory/analytics/dead-stock?days_no_sales=${daysNoSales}`
    );
    return response.json();
  }

  async getAIInsights(storeId?: string): Promise<AIInsight[]> {
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
  ): Promise<TurnoverRatio> {
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

  async transformInventoryStock(data: {
    parent_product_id: string;
    quantity_to_break: number;
    store_id: string;
  }): Promise<any> {
    const response = await this.fetchWithAuth('/v1/inventory/analytics/transform', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.json();
  }

  async getStores(): Promise<Store[]> {
    const response = await this.fetchWithAuth('/v1/inventory/stores');
    return response.json();
  }

  async createStore(data: Partial<Store>): Promise<Store> {
    const response = await this.fetchWithAuth('/v1/inventory/stores', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.json();
  }


}

export const inventoryService = new InventoryService();
