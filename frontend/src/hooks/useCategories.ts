import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { inventoryService } from '@/services/inventoryService';
import { inventoryKeys } from './inventoryKeys';
import type { Category } from '@/types/inventory';

export function useCategories() {
  return useQuery({
    queryKey: inventoryKeys.categories(),
    queryFn: () => inventoryService.getCategories(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; slug: string; icon?: string; tint?: string; parent_id?: string }) =>
      inventoryService.createCategory(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.categories() });
      Toast.show({ type: 'success', text1: 'Category added' });
    },
    onError: (error: Error) => {
      Toast.show({ type: 'error', text1: 'Could not add category', text2: error.message });
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ categoryId, data }: { categoryId: string; data: Partial<Pick<Category, 'name' | 'icon' | 'tint' | 'parent_id'>> }) =>
      inventoryService.updateCategory(categoryId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.categories() });
      Toast.show({ type: 'success', text1: 'Category updated' });
    },
    onError: (error: Error) => {
      Toast.show({ type: 'error', text1: 'Could not update category', text2: error.message });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (categoryId: string) => inventoryService.deleteCategory(categoryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.categories() });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.products() });
      Toast.show({ type: 'success', text1: 'Category deleted' });
    },
    onError: (error: Error) => {
      Toast.show({ type: 'error', text1: 'Could not delete category', text2: error.message });
    },
  });
}

export function useBulkCreateCategories() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (categories: Array<{ name: string; icon?: string; tint?: string; parent_id?: string }>) =>
      inventoryService.bulkCreateCategories(categories),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.categories() });
      Toast.show({ type: 'success', text1: `${created.length} categories added` });
    },
    onError: (error: Error) => {
      Toast.show({ type: 'error', text1: 'Could not load starter categories', text2: error.message });
    },
  });
}
