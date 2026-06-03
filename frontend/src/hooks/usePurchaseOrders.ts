/**
 * Purchase Order Hooks
 * Handles the procurement lifecycle.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryService } from '@/services/inventoryService';
import Toast from 'react-native-toast-message';
import { inventoryKeys } from './inventoryKeys';

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
