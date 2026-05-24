// @ts-nocheck
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  AlertTriangle,
  Package,
  PackagePlus,
  ShoppingCart,
  TrendingDown,
  ChevronRight,
  Filter,
  XCircle,
} from 'lucide-react-native';
import { colors } from '@/theme/colors';
import { useLowStockAlerts, useDeadStockDetection } from '@/hooks/useInventory';
import type { RootStackScreenProps } from '@/navigation/types';

// ─── TYPES ─────────────────────────────────────────────────────────
type FilterMode = 'all' | 'low_stock' | 'out_of_stock' | 'dead_stock';

interface StockAlertItem {
  id: string;
  name: string;
  sku: string;
  quantity_on_hand: number;
  minimum_stock_level: number;
  maximum_stock_level: number;
  selling_price_kobo: number;
  stock_by_location: Array<{
    store_id: string;
    store_name: string;
    quantity_on_hand: number;
    status: string;
  }>;
}

// ─── HELPERS ────────────────────────────────────────────────────────
const getStockSeverity = (
  current: number,
  min: number,
): 'critical' | 'warning' | 'depleted' => {
  if (current <= 0) return 'depleted';
  if (current <= min * 0.5) return 'critical';
  return 'warning';
};

const severityConfig = {
  depleted: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    badge: 'bg-red-500',
    badgeText: 'text-white',
    label: 'OUT OF STOCK',
    icon: '#EF4444',
  },
  critical: {
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    badge: 'bg-orange-500',
    badgeText: 'text-white',
    label: 'CRITICAL',
    icon: '#F97316',
  },
  warning: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    badge: 'bg-amber-500',
    badgeText: 'text-white',
    label: 'LOW STOCK',
    icon: '#F59E0B',
  },
} as const;

// ─── COMPONENT ─────────────────────────────────────────────────────
const LowStockAlertsScreen = ({
  navigation,
  route,
}: RootStackScreenProps<'LowStockAlerts'>) => {
  const { storeId } = (route.params as { storeId?: string }) || {};
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filterMode, setFilterMode] = useState<FilterMode>('all');

  // Data queries
  const {
    data: lowStockItems = [],
    isLoading: isLowStockLoading,
    refetch: refetchLowStock,
  } = useLowStockAlerts(storeId);

  const {
    data: deadStockItems = [],
    isLoading: isDeadStockLoading,
    refetch: refetchDeadStock,
  } = useDeadStockDetection(30);

  const isLoading = isLowStockLoading || isDeadStockLoading;

  const onRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([refetchLowStock(), refetchDeadStock()]);
    setIsRefreshing(false);
  };

  // ── Categorise items ──────────────────────────────────────────
  const categorised = useMemo(() => {
    const outOfStock: StockAlertItem[] = [];
    const lowStock: StockAlertItem[] = [];

    (lowStockItems as unknown as StockAlertItem[]).forEach((item: StockAlertItem) => {
      if (item.quantity_on_hand <= 0) {
        outOfStock.push(item);
      } else {
        lowStock.push(item);
      }
    });

    // Sort by severity: lowest quantity first
    lowStock.sort(
      (a: StockAlertItem, b: StockAlertItem) =>
        a.quantity_on_hand - b.quantity_on_hand,
    );

    return { outOfStock, lowStock, deadStock: deadStockItems as unknown as StockAlertItem[] };
  }, [lowStockItems, deadStockItems]);

  // ── Filtered list ─────────────────────────────────────────────
  const displayItems = useMemo((): StockAlertItem[] => {
    switch (filterMode) {
      case 'out_of_stock':
        return categorised.outOfStock;
      case 'low_stock':
        return categorised.lowStock;
      case 'dead_stock':
        return categorised.deadStock;
      default:
        return [
          ...categorised.outOfStock,
          ...categorised.lowStock,
        ];
    }
  }, [filterMode, categorised]);

  // ── Stats ─────────────────────────────────────────────────────
  const totalAlerts =
    categorised.outOfStock.length + categorised.lowStock.length;
  const potentialRevenueLost = categorised.outOfStock.reduce(
    (sum: number, item: StockAlertItem) =>
      sum + (item.selling_price_kobo || 0) * (item.minimum_stock_level || 1),
    0,
  );

  // ── Filter chips ──────────────────────────────────────────────
  const filters: Array<{
    id: FilterMode;
    label: string;
    count: number;
    color: string;
  }> = [
    {
      id: 'all',
      label: 'All Alerts',
      count: totalAlerts,
      color: 'bg-slate-900',
    },
    {
      id: 'out_of_stock',
      label: 'Depleted',
      count: categorised.outOfStock.length,
      color: 'bg-red-500',
    },
    {
      id: 'low_stock',
      label: 'Low Stock',
      count: categorised.lowStock.length,
      color: 'bg-orange-500',
    },
    {
      id: 'dead_stock',
      label: 'Dead Stock',
      count: categorised.deadStock.length,
      color: 'bg-gray-500',
    },
  ];

  // ── Render ────────────────────────────────────────────────────
  return (
    <SafeAreaView className="flex-1 bg-background-page">
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View className="flex-row items-center justify-between px-4 pt-4 pb-6">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="p-2"
        >
          <ChevronLeft color="white" size={24} />
        </TouchableOpacity>
        <Text className="text-white text-lg font-bold">Stock Alerts</Text>
        <View className="w-10" />
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor="white"
          />
        }
      >
        {/* Summary Cards */}
        <View className="px-4 mb-6">
          <View className="flex-row gap-4">
            {/* Total alerts */}
            <View className="flex-1 bg-white/10 p-5 rounded-3xl border border-white/10">
              <View className="flex-row items-center gap-2 mb-2">
                <AlertTriangle color="#F97316" size={16} />
                <Text className="text-white/40 text-[10px] font-bold uppercase tracking-widest">
                  Active Alerts
                </Text>
              </View>
              <Text className="text-white text-3xl font-black">
                {totalAlerts}
              </Text>
            </View>

            {/* Revenue at risk */}
            <View className="flex-1 bg-white/10 p-5 rounded-3xl border border-white/10">
              <View className="flex-row items-center gap-2 mb-2">
                <TrendingDown color="#EF4444" size={16} />
                <Text className="text-white/40 text-[10px] font-bold uppercase tracking-widest">
                  Rev. at Risk
                </Text>
              </View>
              <Text className="text-white text-2xl font-black">
                ₦{(potentialRevenueLost / 100).toLocaleString()}
              </Text>
            </View>
          </View>
        </View>

        {/* Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mb-6"
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
        >
          {filters.map((f) => (
            <TouchableOpacity
              key={f.id}
              onPress={() => setFilterMode(f.id)}
              className={`flex-row items-center px-4 py-2.5 rounded-full border ${
                filterMode === f.id
                  ? `${f.color} border-transparent`
                  : 'bg-white/5 border-white/10'
              }`}
            >
              <Text
                className={`font-bold text-xs ${
                  filterMode === f.id ? 'text-white' : 'text-white/60'
                }`}
              >
                {f.label}
              </Text>
              <View
                className={`ml-2 px-2 py-0.5 rounded-full ${
                  filterMode === f.id ? 'bg-white/20' : 'bg-white/10'
                }`}
              >
                <Text
                  className={`text-[10px] font-black ${
                    filterMode === f.id ? 'text-white' : 'text-white/40'
                  }`}
                >
                  {f.count}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Content */}
        {isLoading ? (
          <View className="items-center justify-center py-20">
            <ActivityIndicator
              size="large"
              color={colors.ventureroot.green}
            />
            <Text className="text-white/60 mt-4 font-medium">
              Scanning inventory health...
            </Text>
          </View>
        ) : displayItems.length === 0 ? (
          <View className="items-center justify-center py-20 mx-4 bg-white/5 rounded-3xl border border-dashed border-white/10">
            <Package color="white" size={48} opacity={0.2} />
            <Text className="text-white/40 mt-4 font-bold text-center px-10">
              {filterMode === 'all'
                ? 'All stock levels are healthy. No alerts.'
                : `No items match the "${filterMode.replace('_', ' ')}" filter.`}
            </Text>
          </View>
        ) : (
          <View className="px-4 gap-4 mb-8">
            {displayItems.map((item: StockAlertItem) => {
              const severity = getStockSeverity(
                item.quantity_on_hand,
                item.minimum_stock_level,
              );
              const config = severityConfig[severity];
              const restockQty =
                (item.maximum_stock_level || item.minimum_stock_level * 3) -
                item.quantity_on_hand;

              return (
                <TouchableOpacity
                  key={item.id}
                  onPress={() =>
                    navigation.navigate('ProductDetail', {
                      productId: item.id,
                    })
                  }
                  className={`${config.bg} rounded-3xl p-5 border ${config.border}`}
                >
                  {/* Top row */}
                  <View className="flex-row justify-between items-start mb-4">
                    <View className="flex-1 mr-4">
                      <Text
                        className="text-gray-900 font-black text-lg"
                        numberOfLines={1}
                      >
                        {item.name}
                      </Text>
                      <Text className="text-gray-400 text-xs mt-1">
                        SKU: {item.sku || 'N/A'}
                      </Text>
                    </View>
                    <View
                      className={`${config.badge} px-3 py-1 rounded-full`}
                    >
                      <Text
                        className={`${config.badgeText} font-bold text-[10px]`}
                      >
                        {config.label}
                      </Text>
                    </View>
                  </View>

                  {/* Stock level bar */}
                  <View className="mb-4">
                    <View className="flex-row justify-between mb-1">
                      <Text className="text-gray-500 text-[10px] font-bold uppercase">
                        Stock Level
                      </Text>
                      <Text className="text-gray-700 text-[10px] font-bold">
                        {item.quantity_on_hand} /{' '}
                        {item.maximum_stock_level || '—'}
                      </Text>
                    </View>
                    <View className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <View
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(
                            100,
                            item.maximum_stock_level > 0
                              ? (item.quantity_on_hand /
                                  item.maximum_stock_level) *
                                100
                              : 0,
                          )}%`,
                          backgroundColor: config.icon,
                        }}
                      />
                    </View>
                  </View>

                  {/* Stats row */}
                  <View className="flex-row gap-3 mb-4">
                    <View className="flex-1 bg-white/60 p-3 rounded-2xl">
                      <Text className="text-gray-400 text-[10px] font-bold uppercase mb-1">
                        Current
                      </Text>
                      <Text className="text-gray-900 font-black text-base">
                        {item.quantity_on_hand}
                      </Text>
                    </View>
                    <View className="flex-1 bg-white/60 p-3 rounded-2xl">
                      <Text className="text-gray-400 text-[10px] font-bold uppercase mb-1">
                        Minimum
                      </Text>
                      <Text className="text-gray-900 font-black text-base">
                        {item.minimum_stock_level}
                      </Text>
                    </View>
                    <View className="flex-1 bg-white/60 p-3 rounded-2xl">
                      <Text className="text-gray-400 text-[10px] font-bold uppercase mb-1">
                        Restock
                      </Text>
                      <Text className="text-emerald-700 font-black text-base">
                        +{Math.max(0, restockQty)}
                      </Text>
                    </View>
                  </View>

                  {/* Actions */}
                  <View className="flex-row gap-3">
                    <TouchableOpacity
                      onPress={() =>
                        navigation.navigate('AddPurchaseOrder', { 
                          productId: item.id, 
                          qty: Math.max(0, restockQty) 
                        })
                      }
                      className="flex-1 bg-slate-900 py-3 rounded-xl items-center flex-row justify-center gap-2"
                    >
                      <PackagePlus color="white" size={16} />
                      <Text className="text-white font-bold text-xs">
                        Restock
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() =>
                        navigation.navigate('StockAdjustment', {
                          productId: item.id,
                          storeId:
                            item.stock_by_location?.[0]?.store_id ||
                            storeId,
                        })
                      }
                      className="flex-1 bg-white py-3 rounded-xl items-center flex-row justify-center gap-2 border border-gray-200"
                    >
                      <ShoppingCart color="#374151" size={16} />
                      <Text className="text-gray-700 font-bold text-xs">
                        Adjust
                      </Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <View className="h-20" />
      </ScrollView>
    </SafeAreaView>
  );
};

export default LowStockAlertsScreen;
// @ts-nocheck
