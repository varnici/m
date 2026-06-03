/**
 * Supplier Hooks
 * Handles vendor relationships and supplier profiles.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryService } from '@/services/inventoryService';
import Toast from 'react-native-toast-message';
import { inventoryKeys } from './inventoryKeys';

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
