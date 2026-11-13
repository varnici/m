import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import {
  distributorService,
  type DistributorOrderLine,
  type DistributorProfileUpdate,
} from '@/services/distributorService';

export function useMyDistributorProfile() {
  return useQuery({
    queryKey: ['distributor', 'me'],
    queryFn: () => distributorService.getMyProfile(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateMyDistributorProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: DistributorProfileUpdate) => distributorService.updateMyProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['distributor', 'me'] });
      Toast.show({ type: 'success', text1: 'Profile updated' });
    },
    onError: (error: any) => {
      Toast.show({
        type: 'error',
        text1: 'Could not update profile',
        text2: error.response?.data?.detail || error.message,
      });
    },
  });
}

export function useDistributors(verifiedOnly = true) {
  return useQuery({
    queryKey: ['distributor', 'list', verifiedOnly],
    queryFn: () => distributorService.list(verifiedOnly),
    staleTime: 5 * 60 * 1000,
  });
}

export function useDistributorCatalog(distributorId: string, search?: string) {
  return useQuery({
    queryKey: ['distributor', 'catalog', distributorId, search],
    queryFn: () => distributorService.getCatalog(distributorId, search),
    enabled: !!distributorId,
    staleTime: 60 * 1000,
  });
}

export function useTradeCredit() {
  return useQuery({
    queryKey: ['distributor', 'trade-credit'],
    queryFn: () => distributorService.getTradeCredit(),
    staleTime: 60 * 1000,
  });
}

export function useCreateDistributorOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ distributorId, lines }: { distributorId: string; lines: DistributorOrderLine[] }) =>
      distributorService.createOrder(distributorId, lines),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['distributor', 'trade-credit'] });
    },
  });
}
