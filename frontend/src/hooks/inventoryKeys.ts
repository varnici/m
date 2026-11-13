/**
 * Inventory Query Keys
 * Shared across all domain-specific inventory hooks.
 */

export const inventoryKeys = {
  all: ['inventory'],
  categories: () => [...inventoryKeys.all, 'categories'],
  stores: () => [...inventoryKeys.all, 'stores'],
  products: () => [...inventoryKeys.all, 'products'],
  productList: (skip: number, limit: number, categoryId?: string, search?: string) => [
    ...inventoryKeys.products(),
    'list',
    { skip, limit, categoryId, search },
  ],
  productDetail: (id: string, storeId?: string) => [
    ...inventoryKeys.products(),
    'detail',
    id,
    storeId,
  ],
  suppliers: () => [...inventoryKeys.all, 'suppliers'],
  suppliersList: (status?: string, skip?: number, limit?: number) => [
    ...inventoryKeys.suppliers(),
    'list',
    { status, skip, limit },
  ],
  supplierDetail: (id: string) => [...inventoryKeys.suppliers(), 'detail', id],
  purchaseOrders: () => [...inventoryKeys.all, 'purchase-orders'],
  poList: (
    status?: string,
    supplierId?: string,
    storeId?: string,
    skip?: number,
    limit?: number
  ) => [
    ...inventoryKeys.purchaseOrders(),
    'list',
    { status, supplierId, storeId, skip, limit },
  ],
  poDetail: (id: string) => [...inventoryKeys.purchaseOrders(), 'detail', id],
  stock: () => [...inventoryKeys.all, 'stock'],
  stockLevels: (storeId: string, status?: string) => [
    ...inventoryKeys.stock(),
    'levels',
    storeId,
    status,
  ],
  stockMovements: (
    storeId?: string,
    productId?: string,
    movementType?: string,
    skip?: number,
    limit?: number
  ) => [
    ...inventoryKeys.stock(),
    'movements',
    { storeId, productId, movementType, skip, limit },
  ],
  stockReservations: (
    storeId?: string,
    productId?: string,
    status?: string,
    skip?: number,
    limit?: number
  ) => [
    ...inventoryKeys.stock(),
    'reservations',
    { storeId, productId, status, skip, limit },
  ],
  stockReservationDetail: (reservationId: string) => [
    ...inventoryKeys.stock(),
    'reservation',
    reservationId,
  ],
  analytics: () => [...inventoryKeys.all, 'analytics'],
  dashboard: (storeId?: string, startDate?: string, endDate?: string) => [
    ...inventoryKeys.analytics(),
    'dashboard',
    { storeId, startDate, endDate },
  ],
  productHealth: (limit?: number) => [...inventoryKeys.analytics(), 'health', limit],
  lowStock: (storeId?: string) => [...inventoryKeys.analytics(), 'low-stock', storeId],
  deadStock: (days?: number) => [...inventoryKeys.analytics(), 'dead-stock', days],
  aiInsights: (storeId?: string) => [...inventoryKeys.analytics(), 'ai-insights', storeId],
  ledger: (skip: number, limit: number) => [...inventoryKeys.all, 'ledger', { skip, limit }],
  reconcile: (storeId?: string, productId?: string) => [...inventoryKeys.analytics(), 'reconcile', { storeId, productId }],
  dailyReport: (date: string, storeId?: string) => [...inventoryKeys.analytics(), 'daily-report', date, storeId],
  tradeClients: () => [...inventoryKeys.all, 'trade-clients'],
  tradeOrders: () => [...inventoryKeys.all, 'trade-orders'],
  tradeOrderDetail: (id: string) => [...inventoryKeys.tradeOrders(), 'detail', id],
};
