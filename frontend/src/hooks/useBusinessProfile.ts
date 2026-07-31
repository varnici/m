import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { inventoryService } from '@/services/inventoryService';
import { inventoryKeys } from './inventoryKeys';
import { getBusinessTypeTemplate } from '@/data/businessTypeTemplates';
import type { BusinessType, Store } from '@/types/inventory';

/**
 * Resolves the business's primary store and its business_type — the real
 * source of truth for which inventory fields/units/starter-categories apply.
 * (Onboarding's `primaryCategory` market-segment pick is write-only to
 * Supabase and never read back by any inventory screen — this hook is what
 * inventory screens should use instead, set via BusinessTypeSetupScreen.)
 */
export function useBusinessProfile() {
  const { data: stores = [], isLoading } = useQuery({
    queryKey: inventoryKeys.stores(),
    queryFn: () => inventoryService.getStores(),
    staleTime: 5 * 60 * 1000,
  });

  const store: Store | undefined = stores.find((s) => s.is_primary) || stores[0];
  const businessType = (store?.business_type as BusinessType | undefined) || undefined;
  const template = getBusinessTypeTemplate(businessType);

  return { store, stores, businessType, template, isLoading };
}

export function useSetBusinessType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ store, businessType }: { store: Store | undefined; businessType: BusinessType }) => {
      if (store) {
        return inventoryService.updateStore(store.id, {
          name: store.name,
          address: store.address || 'Main Street',
          city: store.city || 'Lagos',
          state: store.state || 'Lagos',
          business_type: businessType,
        });
      }
      return inventoryService.createStore({
        name: 'Main Store',
        address: 'Main Street',
        city: 'Lagos',
        state: 'Lagos',
        is_primary: true,
        business_type: businessType,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.stores() });
      Toast.show({ type: 'success', text1: 'Business type saved' });
    },
    onError: (error: Error) => {
      Toast.show({ type: 'error', text1: 'Could not save business type', text2: error.message });
    },
  });
}
