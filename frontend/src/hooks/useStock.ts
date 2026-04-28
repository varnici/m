/**
 * Stock Management Hooks
 * Handles stock levels, movements, reservations, and transformations.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryService } from '@/services/inventoryService';
import Toast from 'react-native-toast-message';
import { inventoryKeys } from './inventoryKeys';

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
      queryClient.invalidateQueries({ queryKey: inventoryKeys.stock() });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.analytics() });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.products() });
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

/**
 * useStockReservations - List reservations
 */
export function useStockReservations(
  storeId?: string,
  productId?: string,
  status?: string,
  skip: number = 0,
  limit: number = 100
) {
  return useQuery({
    queryKey: inventoryKeys.stockReservations(storeId, productId, status, skip, limit),
    queryFn: () =>
      inventoryService.getStockReservations(storeId, productId, status, skip, limit),
    staleTime: 1000 * 30,
    gcTime: 1000 * 60 * 10,
  });
}

/**
 * useStockReservation - Single reservation detail
 */
export function useStockReservation(reservationId?: string) {
  return useQuery({
    queryKey: inventoryKeys.stockReservationDetail(reservationId ?? ''),
    queryFn: () => inventoryService.getStockReservation(reservationId ?? ''),
    enabled: !!reservationId,
    staleTime: 1000 * 30,
    gcTime: 1000 * 60 * 10,
  });
}

/**
 * useReserveStock - Mutation to create reservation
 */
export function useReserveStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: any) => inventoryService.reserveStock(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.stock() });
      Toast.show({
        type: 'success',
        text1: 'Stock Reserved',
      });
    },
    onError: (error: Error) => {
      Toast.show({
        type: 'error',
        text1: 'Reservation Failed',
        text2: error.message,
      });
    },
  });
}

/**
 * useReleaseStockReservation - Mutation to release reservation
 */
export function useReleaseStockReservation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      reservationId,
      quantity,
      notes,
    }: {
      reservationId: string;
      quantity?: number;
      notes?: string;
    }) => inventoryService.releaseStockReservation(reservationId, quantity, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.stock() });
      Toast.show({
        type: 'success',
        text1: 'Reservation Released',
      });
    },
    onError: (error: Error) => {
      Toast.show({
        type: 'error',
        text1: 'Release Failed',
        text2: error.message,
      });
    },
  });
}

/**
 * useCommitStockReservation - Mutation to commit reservation
 */
export function useCommitStockReservation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      reservationId,
      quantity,
      notes,
    }: {
      reservationId: string;
      quantity?: number;
      notes?: string;
    }) => inventoryService.commitStockReservation(reservationId, quantity, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.stock() });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.analytics() });
      Toast.show({
        type: 'success',
        text1: 'Reservation Committed',
      });
    },
    onError: (error: Error) => {
      Toast.show({
        type: 'error',
        text1: 'Commit Failed',
        text2: error.message,
      });
    },
  });
}

/**
 * useTransformStock - Break bulk into pieces
 */
export function useTransformStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      parent_product_id: string;
      quantity_to_break: number;
      store_id: string;
    }) => inventoryService.transformInventoryStock(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.stock() });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.products() });
      Toast.show({
        type: 'success',
        text1: 'Stock Transformed',
        text2: 'Bulk items converted to units successfully',
      });
    },
    onError: (error: Error) => {
      Toast.show({
        type: 'error',
        text1: 'Transformation Failed',
        text2: error.message,
      });
    },
  });
}
