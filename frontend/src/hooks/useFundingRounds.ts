import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { workerService } from '@/services/workerService';

export function useFundingRounds(status: 'open' | 'funded' | 'closed' = 'open') {
  return useQuery({
    queryKey: ['funding-rounds', 'list', status],
    queryFn: () => workerService.getFundingRounds(status),
    staleTime: 60 * 1000,
  });
}

export function useFundingRoundsForCluster(clusterId?: string, status: 'open' | 'funded' | 'closed' = 'open') {
  const query = useFundingRounds(status);
  return {
    ...query,
    data: clusterId ? query.data?.filter((r) => r.cluster_id === clusterId) : query.data,
  };
}

export function useFundingRound(roundId?: string) {
  return useQuery({
    queryKey: ['funding-rounds', 'detail', roundId],
    queryFn: () => workerService.getFundingRound(roundId!),
    enabled: !!roundId,
    staleTime: 30 * 1000,
  });
}

export function useContributeToFundingRound() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ roundId, amountKobo }: { roundId: string; amountKobo: number }) =>
      workerService.contributeToFundingRound(roundId, amountKobo),
    onSuccess: (_, { roundId }) => {
      queryClient.invalidateQueries({ queryKey: ['funding-rounds'] });
      queryClient.invalidateQueries({ queryKey: ['funding-rounds', 'detail', roundId] });
    },
  });
}
