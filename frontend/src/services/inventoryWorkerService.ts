'use strict';

import { InventoryWorker, WorkerMessageType, ParentMessageType, WorkerResponse } from './inventoryWorker';
import { 
  Category, Product, Store, StockLevel, StockMovement, 
  StockReservation, Supplier, PurchaseOrder, 
  InventoryDashboardMetrics, InventoryOptimizationReport, AIInsight, TurnoverRatio 
} from '@/types/inventory';

export class InventoryWorkerService {
  private worker: InventoryWorker;
  private pendingRequests: Array<{
    resolve: (value: any) => void;
    reject: (reason: any) => void;
  }> = [];

  constructor() {
    this.worker = new InventoryWorker();
    
    // Bind message callback to resolve pending promises in FIFO order
    this.worker.onMessage((message: WorkerResponse) => {
      const current = this.pendingRequests.shift();
      if (!current) return;

      const [type, payload] = message;

      if (type === ParentMessageType.PARENT_MESSAGE_OK) {
        current.resolve(payload);
      } else if (
        type === ParentMessageType.PARENT_MESSAGE_CLIENT_ERROR ||
        type === ParentMessageType.PARENT_MESSAGE_SETUP_ERROR
      ) {
        const errorMsg = message[2] || 'Worker execution error';
        const errorStack = message[3];
        const err = new Error(errorMsg);
        err.stack = errorStack;
        current.reject(err);
      } else if (type === ParentMessageType.PARENT_MESSAGE_MEM_USAGE) {
        // Special out-of-band response for memory queries
        current.resolve(payload);
      }
    });

    // Initialize worker with target module 'inventoryService'
    this.worker.postMessage([
      WorkerMessageType.CHILD_MESSAGE_INITIALIZE,
      false,
      'inventoryService',
      [],
    ]);
  }

  /**
   * Helper to dispatch worker calls.
   */
  private callWorkerMethod<T>(method: string, args: any[]): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.pendingRequests.push({ resolve, reject });
      this.worker.postMessage([
        WorkerMessageType.CHILD_MESSAGE_CALL,
        false,
        method,
        args,
      ]);
    });
  }

  // ========================================================================
  // PRODUCTS & CATEGORIES
  // ========================================================================
  async getCategories(): Promise<Category[]> {
    return this.callWorkerMethod<Category[]>('getCategories', []);
  }

  async createProduct(data: Partial<Product>): Promise<Product> {
    return this.callWorkerMethod<Product>('createProduct', [data]);
  }

  async getProducts(
    skip: number = 0,
    limit: number = 100,
    categoryId?: string,
    search?: string,
    storeId?: string
  ): Promise<Product[]> {
    return this.callWorkerMethod<Product[]>('getProducts', [skip, limit, categoryId, search, storeId]);
  }

  async getMarketplaceProducts(
    skip: number = 0,
    limit: number = 100,
    categoryId?: string,
    search?: string
  ): Promise<Product[]> {
    return this.callWorkerMethod<Product[]>('getMarketplaceProducts', [skip, limit, categoryId, search]);
  }

  async marketplaceCheckout(data: any): Promise<any> {
    return this.callWorkerMethod<any>('marketplaceCheckout', [data]);
  }

  async getProductDetail(productId: string, storeId?: string): Promise<Product> {
    return this.callWorkerMethod<Product>('getProductDetail', [productId, storeId]);
  }

  async searchByBarcode(barcode: string): Promise<Product> {
    return this.callWorkerMethod<Product>('searchByBarcode', [barcode]);
  }

  async updateProduct(productId: string, data: Partial<Product>): Promise<Product> {
    return this.callWorkerMethod<Product>('updateProduct', [productId, data]);
  }

  async deleteProduct(productId: string): Promise<void> {
    return this.callWorkerMethod<void>('deleteProduct', [productId]);
  }

  async getInventoryLedger(skip: number = 0, limit: number = 100): Promise<any[]> {
    return this.callWorkerMethod<any[]>('getInventoryLedger', [skip, limit]);
  }

  async reconcileInventory(storeId?: string, productId?: string): Promise<any> {
    return this.callWorkerMethod<any>('reconcileInventory', [storeId, productId]);
  }

  // ========================================================================
  // STOCK MANAGEMENT
  // ========================================================================
  async getStockLevels(storeId: string, status?: string): Promise<StockLevel[]> {
    return this.callWorkerMethod<StockLevel[]>('getStockLevels', [storeId, status]);
  }

  async recordStockMovement(data: Partial<StockMovement>): Promise<StockMovement> {
    return this.callWorkerMethod<StockMovement>('recordStockMovement', [data]);
  }

  async transferStock(
    fromStoreId: string,
    toStoreId: string,
    productId: string,
    quantity: number
  ): Promise<StockMovement> {
    return this.callWorkerMethod<StockMovement>('transferStock', [fromStoreId, toStoreId, productId, quantity]);
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
    return this.callWorkerMethod<StockMovement[]>('getStockMovements', [
      storeId,
      productId,
      movementType,
      startDate,
      endDate,
      skip,
      limit,
    ]);
  }

  async reserveStock(data: Partial<StockReservation>): Promise<StockReservation> {
    return this.callWorkerMethod<StockReservation>('reserveStock', [data]);
  }

  async getStockReservations(
    storeId?: string,
    productId?: string,
    status?: string,
    skip: number = 0,
    limit: number = 100
  ): Promise<StockReservation[]> {
    return this.callWorkerMethod<StockReservation[]>('getStockReservations', [
      storeId,
      productId,
      status,
      skip,
      limit,
    ]);
  }

  async getStockReservation(reservationId: string): Promise<StockReservation> {
    return this.callWorkerMethod<StockReservation>('getStockReservation', [reservationId]);
  }

  async releaseStockReservation(reservationId: string, quantity?: number, notes?: string): Promise<StockReservation> {
    return this.callWorkerMethod<StockReservation>('releaseStockReservation', [reservationId, quantity, notes]);
  }

  async commitStockReservation(reservationId: string, quantity?: number, notes?: string): Promise<StockReservation> {
    return this.callWorkerMethod<StockReservation>('commitStockReservation', [reservationId, quantity, notes]);
  }

  // ========================================================================
  // SUPPLIERS
  // ========================================================================
  async createSupplier(data: Partial<Supplier>): Promise<Supplier> {
    return this.callWorkerMethod<Supplier>('createSupplier', [data]);
  }

  async getSuppliers(status?: string, skip: number = 0, limit: number = 100): Promise<Supplier[]> {
    return this.callWorkerMethod<Supplier[]>('getSuppliers', [status, skip, limit]);
  }

  async getSupplierDetails(supplierId: string): Promise<Supplier> {
    return this.callWorkerMethod<Supplier>('getSupplierDetails', [supplierId]);
  }

  async updateSupplier(supplierId: string, data: Partial<Supplier>): Promise<Supplier> {
    return this.callWorkerMethod<Supplier>('updateSupplier', [supplierId, data]);
  }

  // ========================================================================
  // PURCHASE ORDERS
  // ========================================================================
  async createPurchaseOrder(data: Partial<PurchaseOrder>): Promise<PurchaseOrder> {
    return this.callWorkerMethod<PurchaseOrder>('createPurchaseOrder', [data]);
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
    return this.callWorkerMethod<PurchaseOrder[]>('getPurchaseOrders', [
      status,
      supplierId,
      storeId,
      startDate,
      endDate,
      skip,
      limit,
    ]);
  }

  async getPurchaseOrderDetail(poId: string): Promise<PurchaseOrder> {
    return this.callWorkerMethod<PurchaseOrder>('getPurchaseOrderDetail', [poId]);
  }

  async updatePurchaseOrder(poId: string, data: Partial<PurchaseOrder>): Promise<PurchaseOrder> {
    return this.callWorkerMethod<PurchaseOrder>('updatePurchaseOrder', [poId, data]);
  }

  async confirmPurchaseOrder(poId: string): Promise<PurchaseOrder> {
    return this.callWorkerMethod<PurchaseOrder>('confirmPurchaseOrder', [poId]);
  }

  async receivePurchaseOrder(poId: string, items?: any[]): Promise<PurchaseOrder> {
    return this.callWorkerMethod<PurchaseOrder>('receivePurchaseOrder', [poId, items]);
  }

  // ========================================================================
  // ANALYTICS & INSIGHTS
  // ========================================================================
  async getInventoryDashboard(
    storeId?: string,
    startDate?: string,
    endDate?: string
  ): Promise<InventoryDashboardMetrics> {
    return this.callWorkerMethod<InventoryDashboardMetrics>('getInventoryDashboard', [storeId, startDate, endDate]);
  }

  async getProductHealthScores(limit: number = 50): Promise<Product[]> {
    return this.callWorkerMethod<Product[]>('getProductHealthScores', [limit]);
  }

  async getInventoryOptimization(
    storeId?: string,
    days: number = 30,
    limit: number = 25
  ): Promise<InventoryOptimizationReport> {
    return this.callWorkerMethod<InventoryOptimizationReport>('getInventoryOptimization', [storeId, days, limit]);
  }

  async getLowStockAlerts(storeId?: string): Promise<Product[]> {
    return this.callWorkerMethod<Product[]>('getLowStockAlerts', [storeId]);
  }

  async getDeadStockDetection(daysNoSales: number = 30): Promise<Product[]> {
    return this.callWorkerMethod<Product[]>('getDeadStockDetection', [daysNoSales]);
  }

  async getAIInsights(storeId?: string): Promise<AIInsight[]> {
    return this.callWorkerMethod<AIInsight[]>('getAIInsights', [storeId]);
  }

  async calculateTurnoverRatio(productId?: string, storeId?: string, days: number = 30): Promise<TurnoverRatio> {
    return this.callWorkerMethod<TurnoverRatio>('calculateTurnoverRatio', [productId, storeId, days]);
  }

  // ========================================================================
  // VOICE & SCAN
  // ========================================================================
  async processVoiceInput(audioBase64: string, storeId: string): Promise<any> {
    return this.callWorkerMethod<any>('processVoiceInput', [audioBase64, storeId]);
  }

  async scanBarcode(barcodeData: string, storeId: string): Promise<any> {
    return this.callWorkerMethod<any>('scanBarcode', [barcodeData, storeId]);
  }

  async processCVScan(imageBase64: string, storeId: string): Promise<any> {
    return this.callWorkerMethod<any>('processCVScan', [imageBase64, storeId]);
  }

  async transformInventoryStock(data: {
    parent_product_id: string;
    quantity_to_break: number;
    store_id: string;
  }): Promise<any> {
    return this.callWorkerMethod<any>('transformInventoryStock', [data]);
  }

  async getStores(): Promise<Store[]> {
    return this.callWorkerMethod<Store[]>('getStores', []);
  }

  async createStore(data: Partial<Store>): Promise<Store> {
    return this.callWorkerMethod<Store>('createStore', [data]);
  }

  /**
   * Diagnostic interface to query worker memory footprint.
   */
  async getWorkerMemoryUsage(): Promise<number> {
    return new Promise<number>((resolve, reject) => {
      this.pendingRequests.push({ resolve, reject });
      this.worker.postMessage([WorkerMessageType.CHILD_MESSAGE_MEM_USAGE]);
    });
  }

  /**
   * Terminate background worker.
   */
  async terminate(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.pendingRequests.push({ resolve: () => resolve(), reject });
      this.worker.postMessage([WorkerMessageType.CHILD_MESSAGE_END]);
    });
  }
}

export const inventoryWorkerService = new InventoryWorkerService();
