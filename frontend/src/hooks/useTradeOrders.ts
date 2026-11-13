/**
 * Trade (B2B) Hooks — trade clients (a distributor/SME's own CRM contacts)
 * and trade orders (draft -> held -> dispatched, or cancelled).
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { inventoryService } from '@/services/inventoryService';
import { inventoryKeys } from './inventoryKeys';
import type { TradeClientCreate, TradeOrderCreate } from '@/types/inventory';

export function useTradeClients() {
  return useQuery({
    queryKey: inventoryKeys.tradeClients(),
    queryFn: () => inventoryService.getTradeClients(),
    staleTime: 60 * 1000,
  });
}

export function useCreateTradeClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: TradeClientCreate) => inventoryService.createTradeClient(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.tradeClients() });
      Toast.show({ type: 'success', text1: 'Customer added' });
    },
    onError: (error: any) => {
      Toast.show({
        type: 'error',
        text1: 'Could not add customer',
        text2: error.response?.data?.detail || error.message,
      });
    },
  });
}

export function useTradeOrders() {
  return useQuery({
    queryKey: inventoryKeys.tradeOrders(),
    queryFn: () => inventoryService.getTradeOrders(),
    staleTime: 30 * 1000,
  });
}

export function useTradeOrder(orderId?: string) {
  return useQuery({
    queryKey: inventoryKeys.tradeOrderDetail(orderId || ''),
    queryFn: () => inventoryService.getTradeOrder(orderId as string),
    enabled: !!orderId,
    staleTime: 30 * 1000,
  });
}

export function useCreateTradeOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: TradeOrderCreate) => inventoryService.createTradeOrder(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.tradeOrders() });
      Toast.show({ type: 'success', text1: 'Order created' });
    },
    onError: (error: any) => {
      Toast.show({
        type: 'error',
        text1: 'Could not create order',
        text2: error.response?.data?.detail || error.message,
      });
    },
  });
}

function useTradeOrderAction(
  fn: (orderId: string) => Promise<any>,
  successTitle: string,
  failTitle: string,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderId: string) => fn(orderId),
    onSuccess: (_data, orderId) => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.tradeOrders() });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.tradeOrderDetail(orderId) });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.stock() });
      Toast.show({ type: 'success', text1: successTitle });
    },
    onError: (error: any) => {
      Toast.show({
        type: 'error',
        text1: failTitle,
        text2: error.response?.data?.detail || error.message,
      });
    },
  });
}

export function useHoldTradeOrder() {
  return useTradeOrderAction(
    (id) => inventoryService.holdTradeOrder(id),
    'Stock reserved',
    'Could not reserve stock',
  );
}

export function useDispatchTradeOrder() {
  return useTradeOrderAction(
    (id) => inventoryService.dispatchTradeOrder(id),
    'Order dispatched',
    'Could not dispatch order',
  );
}

export function useCancelTradeOrder() {
  return useTradeOrderAction(
    (id) => inventoryService.cancelTradeOrder(id),
    'Order cancelled',
    'Could not cancel order',
  );
}
