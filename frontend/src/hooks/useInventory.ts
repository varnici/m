/**
 * Inventory Hooks - React Query & State Management
 * Production-grade custom hooks with full TypeScript support
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { inventoryService } from '@/services/inventoryService';
import Toast from 'react-native-toast-message';

// ============================================================================
// QUERY KEYS - Organized hierarchy for cache management
// ============================================================================

export const inventoryKeys = {
  all: ['inventory'],
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
};

// ============================================================================
// PRODUCT HOOKS
// ============================================================================

/**
 * useProducts - Fetch products with Search, Filter, Pagination
 */
export function useProducts(
  skip: number = 0,
  limit: number = 100,
  categoryId?: string,
  search?: string
) {
  return useQuery({
    queryKey: inventoryKeys.productList(skip, limit, categoryId, search),
    queryFn: () =>
      inventoryService.getProducts(skip, limit, categoryId, search),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });
}

/**
 * useProductDetail - Fetch single product with full details
 */
export function useProductDetail(
  productId?: string,
  storeId?: string,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: inventoryKeys.productDetail(productId ?? '', storeId),
    queryFn: () => inventoryService.getProductDetail(productId ?? '', storeId),
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 60,
    enabled: enabled && !!productId,
  });
}

/**
 * useSearchByBarcode - Search product by barcode
 */
export function useSearchByBarcode() {
  const [barcode, setBarcode] = useState<string>('');

  const query = useQuery({
    queryKey: ['barcode-search', barcode],
    queryFn: () => inventoryService.searchByBarcode(barcode),
    enabled: barcode.length > 0,
    staleTime: Infinity,
  });

  return {
    ...query,
    barcode,
    setBarcode,
  };
}

/**
 * useCreateProduct - Mutation to create product
 */
export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: any) => inventoryService.createProduct(data),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.products() });
      Toast.show({
        type: 'success',
        text1: 'Product Created',
        text2: data.name,
      });
    },
    onError: (error: Error) => {
      Toast.show({
        type: 'error',
        text1: 'Failed to Create Product',
        text2: error.message,
      });
    },
  });
}

/**
 * useUpdateProduct - Mutation to update product
 */
export function useUpdateProduct(productId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: any) =>
      inventoryService.updateProduct(productId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: inventoryKeys.productDetail(productId),
      });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.products() });
      Toast.show({
        type: 'success',
        text1: 'Product Updated',
      });
    },
    onError: (error: Error) => {
      Toast.show({
        type: 'error',
        text1: 'Failed to Update Product',
        text2: error.message,
      });
    },
  });
}

// ============================================================================
// STOCK MANAGEMENT HOOKS
// ============================================================================

/**
 * useStockLevels - Fetch stock levels for a store
 */
export function useStockLevels(
  storeId: string,
  status?: string,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: inventoryKeys.stockLevels(storeId, status),
    queryFn: () => inventoryService.getStockLevels(storeId, status),
    staleTime: 1000 * 60 * 2, // 2 minutes - stock changes frequently
    gcTime: 1000 * 60 * 10,
    enabled,
  });
}

/**
 * useStockMovements - Fetch stock movement history
 */
export function useStockMovements(
  storeId?: string,
  productId?: string,
  movementType?: string,
  startDate?: string,
  endDate?: string,
  skip: number = 0,
  limit: number = 100
) {
  return useQuery({
    queryKey: inventoryKeys.stockMovements(
      storeId,
      productId,
      movementType,
      skip,
      limit
    ),
    queryFn: () =>
      inventoryService.getStockMovements(
        storeId,
        productId,
        movementType,
        startDate,
        endDate,
        skip,
        limit
      ),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  });
}

/**
 * useRecordStockMovement - Mutation to record stock adjustment
 */
export function useRecordStockMovement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: any) =>
      inventoryService.recordStockMovement(data),
    onSuccess: (data: any) => {
      // Invalidate all stock-related queries
      queryClient.invalidateQueries({ queryKey: inventoryKeys.stock() });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.analytics() });
      Toast.show({
        type: 'success',
        text1: 'Stock Updated',
        text2: `Quantity: ${data.quantity}`,
      });
    },
    onError: (error: Error) => {
      Toast.show({
        type: 'error',
        text1: 'Failed to Update Stock',
        text2: error.message,
      });
    },
  });
}

/**
 * useTransferStock - Mutation to transfer between stores
 */
export function useTransferStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      fromStoreId,
      toStoreId,
      productId,
      quantity,
    }: {
      fromStoreId: string;
      toStoreId: string;
      productId: string;
      quantity: number;
    }) =>
      inventoryService.transferStock(
        fromStoreId,
        toStoreId,
        productId,
        quantity
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.stock() });
      Toast.show({
        type: 'success',
        text1: 'Stock Transferred',
      });
    },
    onError: (error: Error) => {
      Toast.show({
        type: 'error',
        text1: 'Transfer Failed',
        text2: error.message,
      });
    },
  });
}

// ============================================================================
// SUPPLIER HOOKS
// ============================================================================

/**
 * useSuppliers - Fetch suppliers
 */
export function useSuppliers(
  status?: string,
  skip: number = 0,
  limit: number = 100
) {
  return useQuery({
    queryKey: inventoryKeys.suppliersList(status, skip, limit),
    queryFn: () =>
      inventoryService.getSuppliers(status, skip, limit),
    staleTime: 1000 * 60 * 30, // 30 minutes
    gcTime: 1000 * 60 * 60,
  });
}

/**
 * useSupplierDetail - Fetch single supplier
 */
export function useSupplierDetail(supplierId: string) {
  return useQuery({
    queryKey: inventoryKeys.supplierDetail(supplierId),
    queryFn: () => inventoryService.getSupplierDetails(supplierId),
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60,
  });
}

/**
 * useCreateSupplier - Mutation to create supplier
 */
export function useCreateSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: any) => inventoryService.createSupplier(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: inventoryKeys.suppliers(),
      });
      Toast.show({
        type: 'success',
        text1: 'Supplier Created',
        text2: data.name,
      });
    },
    onError: (error: Error) => {
      Toast.show({
        type: 'error',
        text1: 'Failed to Create Supplier',
        text2: error.message,
      });
    },
  });
}

/**
 * useUpdateSupplier - Mutation to update supplier
 */
export function useUpdateSupplier(supplierId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: any) =>
      inventoryService.updateSupplier(supplierId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: inventoryKeys.supplierDetail(supplierId),
      });
      queryClient.invalidateQueries({
        queryKey: inventoryKeys.suppliers(),
      });
      Toast.show({
        type: 'success',
        text1: 'Supplier Updated',
      });
    },
    onError: (error: Error) => {
      Toast.show({
        type: 'error',
        text1: 'Failed to Update Supplier',
        text2: error.message,
      });
    },
  });
}

// ============================================================================
// PURCHASE ORDER HOOKS
// ============================================================================

/**
 * usePurchaseOrders - Fetch purchase orders with filters
 */
export function usePurchaseOrders(
  status?: string,
  supplierId?: string,
  storeId?: string,
  startDate?: string,
  endDate?: string,
  skip: number = 0,
  limit: number = 100
) {
  return useQuery({
    queryKey: inventoryKeys.poList(
      status,
      supplierId,
      storeId,
      skip,
      limit
    ),
    queryFn: () =>
      inventoryService.getPurchaseOrders(
        status,
        supplierId,
        storeId,
        startDate,
        endDate,
        skip,
        limit
      ),
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 30,
  });
}

/**
 * usePurchaseOrderDetail - Fetch PO details
 */
export function usePurchaseOrderDetail(poId: string) {
  return useQuery({
    queryKey: inventoryKeys.poDetail(poId),
    queryFn: () => inventoryService.getPurchaseOrderDetail(poId),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  });
}

/**
 * useCreatePurchaseOrder - Mutation to create PO
 */
export function useCreatePurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: any) =>
      inventoryService.createPurchaseOrder(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: inventoryKeys.purchaseOrders(),
      });
      Toast.show({
        type: 'success',
        text1: 'Purchase Order Created',
        text2: data.po_number,
      });
    },
    onError: (error: Error) => {
      Toast.show({
        type: 'error',
        text1: 'Failed to Create PO',
        text2: error.message,
      });
    },
  });
}

/**
 * useConfirmPurchaseOrder - Mutation to confirm PO
 */
export function useConfirmPurchaseOrder(poId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => inventoryService.confirmPurchaseOrder(poId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: inventoryKeys.poDetail(poId),
      });
      queryClient.invalidateQueries({
        queryKey: inventoryKeys.purchaseOrders(),
      });
      Toast.show({
        type: 'success',
        text1: 'Purchase Order Confirmed',
      });
    },
    onError: (error: Error) => {
      Toast.show({
        type: 'error',
        text1: 'Failed to Confirm PO',
        text2: error.message,
      });
    },
  });
}

/**
 * useReceivePurchaseOrder - Mutation to receive PO
 */
export function useReceivePurchaseOrder(poId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (items?: any[]) =>
      inventoryService.receivePurchaseOrder(poId, items),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: inventoryKeys.poDetail(poId),
      });
      queryClient.invalidateQueries({
        queryKey: inventoryKeys.purchaseOrders(),
      });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.stock() });
      Toast.show({
        type: 'success',
        text1: 'Purchase Order Received',
      });
    },
    onError: (error: Error) => {
      Toast.show({
        type: 'error',
        text1: 'Failed to Receive PO',
        text2: error.message,
      });
    },
  });
}

// ============================================================================
// ANALYTICS HOOKS
// ============================================================================

/**
 * useInventoryDashboard - Fetch comprehensive inventory metrics
 */
export function useInventoryDashboard(
  storeId?: string,
  startDate?: string,
  endDate?: string
) {
  return useQuery({
    queryKey: inventoryKeys.dashboard(storeId, startDate, endDate),
    queryFn: () =>
      inventoryService.getInventoryDashboard(storeId, startDate, endDate),
    staleTime: 1000 * 60 * 15,
    gcTime: 1000 * 60 * 60,
  });
}

/**
 * useProductHealthScores - Fetch product health scorecard
 */
export function useProductHealthScores(limit: number = 50) {
  return useQuery({
    queryKey: inventoryKeys.productHealth(limit),
    queryFn: () => inventoryService.getProductHealthScores(limit),
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60,
  });
}

/**
 * useLowStockAlerts - Fetch low stock alerts
 */
export function useLowStockAlerts(storeId?: string) {
  return useQuery({
    queryKey: inventoryKeys.lowStock(storeId),
    queryFn: () => inventoryService.getLowStockAlerts(storeId),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  });
}

/**
 * useDeadStockDetection - Fetch dead stock alerts
 */
export function useDeadStockDetection(daysNoSales: number = 30) {
  return useQuery({
    queryKey: inventoryKeys.deadStock(daysNoSales),
    queryFn: () =>
      inventoryService.getDeadStockDetection(daysNoSales),
    staleTime: 1000 * 60 * 60 * 12, // 12 hours
    gcTime: 1000 * 60 * 60 * 24,
  });
}

/**
 * useAIInsights - Fetch AI-powered insights
 */
export function useAIInsights(storeId?: string) {
  return useQuery({
    queryKey: inventoryKeys.aiInsights(storeId),
    queryFn: () => inventoryService.getAIInsights(storeId),
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60,
  });
}

/**
 * useTurnoverRatio - Calculate turnover ratio
 */
export function useTurnoverRatio(
  productId?: string,
  storeId?: string,
  days: number = 30
) {
  return useQuery({
    queryKey: ['turnover-ratio', productId, storeId, days],
    queryFn: () =>
      inventoryService.calculateTurnoverRatio(
        productId,
        storeId,
        days
      ),
    staleTime: 1000 * 60 * 60,
    gcTime: 1000 * 60 * 60 * 24,
  });
}

// ============================================================================
// VOICE & SCAN HOOKS
// ============================================================================

/**
 * useProcessVoiceInput - Process voice input mutation
 */
export function useProcessVoiceInput() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      audioBase64,
      storeId,
    }: {
      audioBase64: string;
      storeId: string;
    }) =>
      inventoryService.processVoiceInput(audioBase64, storeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.stock() });
      queryClient.invalidateQueries({
        queryKey: inventoryKeys.products(),
      });
      Toast.show({
        type: 'success',
        text1: 'Voice Input Processed',
      });
    },
    onError: (error: Error) => {
      Toast.show({
        type: 'error',
        text1: 'Failed to Process Voice',
        text2: error.message,
      });
    },
  });
}

/**
 * useScanBarcode - Barcode scanning mutation
 */
export function useScanBarcode() {
  return useMutation({
    mutationFn: ({
      barcodeData,
      storeId,
    }: {
      barcodeData: string;
      storeId: string;
    }) =>
      inventoryService.scanBarcode(barcodeData, storeId),
    onError: (error: Error) => {
      Toast.show({
        type: 'error',
        text1: 'Barcode Scan Failed',
        text2: error.message,
      });
    },
  });
}

/**
 * useProcessCVScan - Computer vision scan mutation
 */
export function useProcessCVScan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      imageBase64,
      storeId,
    }: {
      imageBase64: string;
      storeId: string;
    }) =>
      inventoryService.processCVScan(imageBase64, storeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.stock() });
      Toast.show({
        type: 'success',
        text1: 'Shelf Scan Processed',
      });
    },
    onError: (error: Error) => {
      Toast.show({
        type: 'error',
        text1: 'CV Scan Failed',
        text2: error.message,
      });
    },
  });
}
