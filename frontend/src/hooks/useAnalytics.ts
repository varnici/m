/**
 * Analytics Hooks
 * Handles dashboard metrics, health scores, and AI-powered insights.
 */

import { useQuery } from '@tanstack/react-query';
import { inventoryService } from '@/services/inventoryService';
import { inventoryKeys } from './inventoryKeys';

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

/**
 * useInventoryLedger - Fetch detailed sales ledger sheet
 */
export function useInventoryLedger(skip: number = 0, limit: number = 100) {
  return useQuery({
    queryKey: inventoryKeys.ledger(skip, limit),
    queryFn: () => inventoryService.getInventoryLedger(skip, limit),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30,
  });
}

/**
 * useReconcileInventory - Fetch reconciliation report
 */
export function useReconcileInventory(storeId?: string, productId?: string) {
  return useQuery({
    queryKey: inventoryKeys.reconcile(storeId, productId),
    queryFn: () => inventoryService.reconcileInventory(storeId, productId),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  });
}
