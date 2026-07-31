/**
 * Product Hooks
 * Handles catalogs, categories, and individual product state.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { inventoryService } from '@/services/inventoryService';
import Toast from 'react-native-toast-message';
import { inventoryKeys } from './inventoryKeys';

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

/**
 * useDeleteProduct - Mutation to delete product
 */
export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (productId: string) => inventoryService.deleteProduct(productId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.products() });
      Toast.show({
        type: 'success',
        text1: 'Product Deleted',
      });
    },
    onError: (error: Error) => {
      Toast.show({
        type: 'error',
        text1: 'Failed to Delete Product',
        text2: error.message,
      });
    },
  });
}
