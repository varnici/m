import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, FlatList, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ClipboardList, Building2, User, ArrowRight, XCircle } from 'lucide-react-native';
import AppHeader from '@/components/ui/AppHeader';
import { colors } from '@/theme/colors';
import { useTradeOrders, useTradeClients, useHoldTradeOrder, useDispatchTradeOrder, useCancelTradeOrder } from '@/hooks/useTradeOrders';
import type { TradeOrder } from '@/types/inventory';

const STATE_META: Record<string, { label: string; tone: string; next?: 'hold' | 'dispatch' }> = {
  draft: { label: 'Draft', tone: colors.text.secondary, next: 'hold' },
  held: { label: 'Stock reserved', tone: colors.status.warning, next: 'dispatch' },
  dispatched: { label: 'Dispatched', tone: colors.status.success },
  cancelled: { label: 'Cancelled', tone: colors.status.danger },
};

const N = (kobo: number) => `₦${(kobo / 100).toLocaleString()}`;

const FILTERS: Array<{ id: string; label: string }> = [
  { id: 'active', label: 'Needs action' },
  { id: 'all', label: 'All' },
  { id: 'dispatched', label: 'Dispatched' },
  { id: 'cancelled', label: 'Cancelled' },
];

function OrderCard({ order, clientName, isPlatformBuyer, lineCount }: {
  order: TradeOrder; clientName: string; isPlatformBuyer: boolean; lineCount: number;
}) {
  const meta = STATE_META[order.status] || STATE_META.draft;
  const holdMutation = useHoldTradeOrder();
  const dispatchMutation = useDispatchTradeOrder();
  const cancelMutation = useCancelTradeOrder();
  const busy = holdMutation.isPending || dispatchMutation.isPending || cancelMutation.isPending;

  const handleAdvance = () => {
    if (meta.next === 'hold') holdMutation.mutate(order.id);
    else if (meta.next === 'dispatch') dispatchMutation.mutate(order.id);
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel order',
      'This releases any reserved stock back to available. This cannot be undone.',
      [
        { text: 'Keep order', style: 'cancel' },
        { text: 'Cancel order', style: 'destructive', onPress: () => cancelMutation.mutate(order.id) },
      ],
    );
  };

  return (
    <View className="bg-white rounded-2xl border border-gray-100 p-4 mb-3">
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center">
          <View className="w-8 h-8 rounded-lg items-center justify-center mr-2" style={{ backgroundColor: (isPlatformBuyer ? colors.ventureroot.green : colors.text.muted) + '15' }}>
            {isPlatformBuyer ? <Building2 size={14} color={colors.ventureroot.green} /> : <User size={14} color={colors.text.secondary} />}
          </View>
          <View>
            <Text className="text-gray-900 font-bold text-sm">{clientName}</Text>
            <Text className="text-gray-400 text-[10px] font-semibold uppercase">
              {isPlatformBuyer ? 'Platform buyer · Net 30' : 'Direct customer'}
            </Text>
          </View>
        </View>
        <View className="px-2.5 py-1 rounded-full" style={{ backgroundColor: meta.tone + '15' }}>
          <Text className="text-[10px] font-bold" style={{ color: meta.tone }}>{meta.label}</Text>
        </View>
      </View>

      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-gray-400 text-xs">{lineCount} item{lineCount === 1 ? '' : 's'} · #{order.id.slice(0, 8)}</Text>
        <Text className="text-gray-900 font-black text-base">{N(order.total_kobo)}</Text>
      </View>

      {(order.status === 'draft' || order.status === 'held') && (
        <View className="flex-row gap-2">
          <TouchableOpacity
            onPress={handleAdvance}
            disabled={busy}
            className="flex-1 py-3 rounded-xl items-center flex-row justify-center"
            style={{ backgroundColor: busy ? '#D1D5DB' : colors.ventureroot.green }}
          >
            {busy ? <ActivityIndicator size="small" color="white" /> : (
              <>
                <Text className="text-white font-bold text-xs mr-1">
                  {meta.next === 'hold' ? 'Reserve stock' : 'Dispatch order'}
                </Text>
                <ArrowRight size={13} color="white" />
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleCancel}
            disabled={busy}
            className="py-3 px-4 rounded-xl items-center justify-center border border-red-100 bg-red-50"
          >
            <XCircle size={16} color={colors.status.danger} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const DistributorOrdersScreen = () => {
  const [filter, setFilter] = useState('active');
  const { data: orders = [], isLoading } = useTradeOrders();
  const { data: clients = [] } = useTradeClients();

  const clientMap = useMemo(() => new Map(clients.map((c) => [c.id, c])), [clients]);

  const rows = useMemo(() => {
    let r = orders;
    if (filter === 'active') r = orders.filter((o) => o.status === 'draft' || o.status === 'held');
    else if (filter === 'dispatched') r = orders.filter((o) => o.status === 'dispatched');
    else if (filter === 'cancelled') r = orders.filter((o) => o.status === 'cancelled');
    return [...r].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  }, [orders, filter]);

  return (
    <SafeAreaView className="flex-1 bg-background-page" edges={['bottom', 'left', 'right']}>
      <AppHeader title="Orders" subtitle={`${orders.length} total`} showBack={false} />

      <View className="px-4 pt-4 pb-2">
        <View className="flex-row bg-gray-100 rounded-xl p-1">
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f.id}
              onPress={() => setFilter(f.id)}
              className={`flex-1 py-2 rounded-lg items-center ${filter === f.id ? 'bg-white' : ''}`}
            >
              <Text className={`text-[11px] font-bold ${filter === f.id ? 'text-gray-900' : 'text-gray-400'}`}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color={colors.ventureroot.green} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(o) => o.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
          ListEmptyComponent={
            <View className="items-center justify-center py-20 px-8">
              <ClipboardList size={40} color="#D1D5DB" />
              <Text className="text-gray-900 font-bold mt-3">No orders here</Text>
              <Text className="text-gray-400 text-xs text-center mt-1">
                {filter === 'active'
                  ? 'Orders from platform buyers and your direct customers will show up here as soon as they come in.'
                  : 'Nothing in this filter yet.'}
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const client = clientMap.get(item.client_id);
            return (
              <OrderCard
                order={item}
                clientName={client?.company_name || 'Customer'}
                isPlatformBuyer={!!item.buyer_owner_id}
                lineCount={item.lines?.length || 0}
              />
            );
          }}
        />
      )}
    </SafeAreaView>
  );
};

export default DistributorOrdersScreen;
