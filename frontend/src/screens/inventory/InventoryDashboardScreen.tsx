import React, { useState } from 'react';
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
  Box,
  AlertTriangle,
  ChevronRight,

  LayoutGrid,
  History as HistoryIcon,
  Package,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';

import type { RootStackNavigationProp } from '@/navigation/types';
import ScreenHeader from '@/components/ui/ScreenHeader';
import AppHeader from '@/components/ui/AppHeader';
import { InventoryQuickActions } from '@/components/inventory/InventoryQuickActions';
import {
  useInventoryDashboard,
  useLowStockAlerts,
} from '@/hooks/useInventory';

const InventoryDashboardScreen = () => {
  const navigation = useNavigation<RootStackNavigationProp<'InventoryDashboard'>>();
  const [showDetails, setShowDetails] = useState(false);

  const {
    data: dashboardData,
    isLoading: dashboardLoading,
    isFetching: dashboardFetching,
    isError: dashboardError,
    error: dashboardErrorValue,
    refetch: refetchDashboard,
  } = useInventoryDashboard();
  const {
    data: lowStockData = [],
    isFetching: lowStockFetching,
    refetch: refetchLowStock,
  } = useLowStockAlerts();

  const inventoryValue = dashboardData?.total_inventory_value_kobo || 0;
  const criticalCount = lowStockData.length;
  const isRefreshing = dashboardFetching || lowStockFetching;

  const handleRefresh = () => {
    refetchDashboard();
    refetchLowStock();
  };

  return (
    <SafeAreaView className="flex-1 bg-background-page" edges={['bottom', 'left', 'right']}>
      <AppHeader title="Inventory" subtitle="Stock in & out" />

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing && !dashboardLoading}
            onRefresh={handleRefresh}
            tintColor="#16A34A"
          />
        }
      >
        <View className="px-4 pt-2">
          <InventoryQuickActions
            onScan={() => navigation.navigate('ScanShelve')}
            onVoice={() => navigation.navigate('VoiceStock')}
            onBrowse={() => navigation.navigate('ProductList')}
          />
        </View>

        {dashboardLoading && (
          <View className="px-4 py-8 items-center">
            <ActivityIndicator size="large" color="#16A34A" />
            <Text className="text-slate-500 text-sm mt-3">Loading your stock…</Text>
          </View>
        )}

        {dashboardError && (
          <View className="mx-4 bg-red-50 border border-red-100 rounded-2xl p-4">
            <Text className="text-red-900 font-bold text-sm">Could not load inventory</Text>
            <Text className="text-red-700 text-xs mt-1" numberOfLines={3}>
              {(dashboardErrorValue as Error).message}
            </Text>
            <TouchableOpacity
              className="bg-red-600 px-4 py-2 rounded-lg self-start mt-3"
              onPress={() => refetchDashboard()}
            >
              <Text className="text-white font-bold text-xs">Try again</Text>
            </TouchableOpacity>
          </View>
        )}

        {!dashboardLoading && !dashboardError && (
          <View className="px-4">
            <View className="bg-white p-5 rounded-2xl border border-gray-100 mb-4">
              <Text className="text-gray-400 text-[10px] font-bold uppercase mb-1">
                Stock on hand (value)
              </Text>
              <Text className="text-gray-900 text-3xl font-black">
                ₦{(inventoryValue / 100).toLocaleString()}
              </Text>
            </View>

            {criticalCount > 0 && (
              <TouchableOpacity
                className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex-row items-center mb-4"
                onPress={() => navigation.navigate('LowStockAlerts', {})}
              >
                <View className="w-11 h-11 bg-amber-100 rounded-xl items-center justify-center mr-3">
                  <AlertTriangle size={22} color="#D97706" />
                </View>
                <View className="flex-1">
                  <Text className="text-amber-950 font-bold text-base">
                    {criticalCount} item{criticalCount === 1 ? '' : 's'} running low
                  </Text>
                  <Text className="text-amber-800 text-xs mt-0.5">
                    Tap to restock — scan or use voice on the shelf
                  </Text>
                </View>
                <ChevronRight size={20} color="#D97706" />
              </TouchableOpacity>
            )}

            <Text className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-3">
              More options
            </Text>
            <View className="flex-row flex-wrap gap-3 mb-4">
              {[
                {
                  label: 'All products',
                  icon: LayoutGrid,
                  route: 'ProductList' as const,
                  tint: '#F1F5F9',
                  color: '#475569',
                },
                {
                  label: 'Add product',
                  icon: Package,
                  route: 'AddProduct' as const,
                  tint: '#ECFDF5',
                  color: '#059669',
                },
                {
                  label: 'Orders',
                  icon: Box,
                  route: 'PurchaseOrders' as const,
                  tint: '#EFF6FF',
                  color: '#2563EB',
                },
                {
                  label: 'History',
                  icon: HistoryIcon,
                  route: 'StockLodger' as const,
                  tint: '#F5F3FF',
                  color: '#7C3AED',
                },
              ].map((item) => (
                <TouchableOpacity
                  key={item.route}
                  className="bg-white border border-gray-100 rounded-2xl p-4 items-center"
                  style={{ width: '47%' }}
                  onPress={() => navigation.navigate(item.route)}
                >
                  <View
                    className="w-10 h-10 rounded-xl items-center justify-center mb-2"
                    style={{ backgroundColor: item.tint }}
                  >
                    <item.icon size={20} color={item.color} />
                  </View>
                  <Text className="text-gray-900 font-bold text-xs text-center">
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              className="py-3 items-center mb-6"
              onPress={() => setShowDetails((v) => !v)}
            >
              <Text className="text-emerald-700 font-bold text-sm">
                {showDetails ? 'Hide sales summary ▲' : 'Show sales summary ▼'}
              </Text>
            </TouchableOpacity>

            {showDetails && dashboardData && (
              <View className="bg-white rounded-2xl border border-gray-100 p-4 mb-8">
                <View className="flex-row gap-3 mb-3">
                  <View className="flex-1 bg-gray-50 p-3 rounded-xl">
                    <Text className="text-gray-400 text-[9px] font-bold uppercase">
                      30-day sales
                    </Text>
                    <Text className="text-gray-900 font-black text-lg mt-1">
                      ₦{((dashboardData.total_revenue_kobo || 0) / 100).toLocaleString()}
                    </Text>
                  </View>
                  <View className="flex-1 bg-gray-50 p-3 rounded-xl">
                    <Text className="text-gray-400 text-[9px] font-bold uppercase">
                      30-day profit
                    </Text>
                    <Text className="text-emerald-600 font-black text-lg mt-1">
                      ₦{((dashboardData.total_profit_kobo || 0) / 100).toLocaleString()}
                    </Text>
                  </View>
                </View>
                {dashboardData.recent_transactions?.length ? (
                  dashboardData.recent_transactions.slice(0, 5).map((tx: any, i: number) => (
                    <View
                      key={i}
                      className="py-2 flex-row border-t border-gray-50"
                    >
                      <Text className="flex-1 text-gray-800 text-xs font-semibold" numberOfLines={1}>
                        {tx.product_name}
                      </Text>
                      <Text className="text-emerald-600 text-xs font-bold">
                        ₦{(tx.profit_kobo / 100).toLocaleString()}
                      </Text>
                    </View>
                  ))
                ) : (
                  <Text className="text-gray-400 text-xs text-center py-2">
                    No recent sales yet
                  </Text>
                )}
              </View>
            )}
          </View>
        )}

        <View className="h-24" />
      </ScrollView>
    </SafeAreaView>
  );
};

export default InventoryDashboardScreen;
