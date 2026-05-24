import React from 'react';
import { View, Text, ScrollView, StatusBar, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { 
  Box, 
  AlertTriangle, 
  Mic, 
  Camera, 
  TrendingDown, 
  ChevronRight,
  Sparkles,
  Zap,
  LayoutGrid,
  History as HistoryIcon,
} from 'lucide-react-native';
import { FlashList } from '@shopify/flash-list';
const TypedFlashList = FlashList as any;
import { useNavigation } from '@react-navigation/native';

import type { RootStackNavigationProp } from '@/navigation/types';
import ScreenHeader from '@/components/ui/ScreenHeader';
import { useInventoryDashboard, useInventoryOptimization, useLowStockAlerts } from '@/hooks/useInventory';

const InventoryDashboardScreen = () => {
  const navigation = useNavigation<RootStackNavigationProp<'InventoryDashboard'>>();

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
  const {
    data: optimizationData,
    isFetching: optimizationFetching,
    refetch: refetchOptimization,
  } = useInventoryOptimization(undefined, 30, 5);

  const inventoryValue = dashboardData?.total_inventory_value_kobo || 0;
  const turnoverText = dashboardData?.turnover_ratio 
    ? `Annual Turnover Ratio is ${dashboardData.turnover_ratio.toFixed(1)}x`
    : 'Turnover ratio data not available';
  const recommendations = dashboardData?.global_recommendations || [];
  const categories = dashboardData?.categories || [];
  const bestSellers = dashboardData?.best_sellers || [];
  const optimizationSummary = optimizationData?.summary;
  const priorityActions = optimizationData?.top_actions || [];
  
  const criticalItems = lowStockData.slice(0, 4);
  const criticalCount = lowStockData.length;
  const isRefreshing = dashboardFetching || lowStockFetching || optimizationFetching;

  const handleRefresh = () => {
    refetchDashboard();
    refetchLowStock();
    refetchOptimization();
  };

  const renderRecommendation = ({ item }: { item: any }) => (
    <TouchableOpacity 
      className="mr-4 w-72 rounded-3xl overflow-hidden"
      onPress={() => navigation.navigate(item.action_route as any, item.metadata || {})}
    >
      <BlurView intensity={20} tint="light" className="p-5 h-full bg-white/20 border border-white/30">
        <View className="flex-row items-center mb-3">
          <View className={`p-2 rounded-xl ${item.type === 'restock' ? 'bg-orange-500/20' : 'bg-indigo-500/20'}`}>
            {item.type === 'restock' ? <Zap size={16} color="#F97316" /> : <Sparkles size={16} color="#6366F1" />}
          </View>
          <View className="ml-3">
             <Text className="text-gray-900 font-bold text-sm">{item.title}</Text>
             <View className="flex-row items-center">
                <Text className={`text-[8px] font-bold uppercase tracking-widest ${item.impact === 'high' ? 'text-red-500' : 'text-indigo-500'}`}>
                   {item.impact} IMPACT
                </Text>
             </View>
          </View>
        </View>
        <Text className="text-gray-700 text-xs leading-5 mb-4" numberOfLines={2}>
          {item.description}
        </Text>
        <View className="flex-row items-center justify-between mt-auto">
           <View className="flex-row -space-x-2">
              {[1, 2, 3].map(i => (
                <View key={i} className="w-6 h-6 rounded-full border-2 border-white bg-gray-200" />
              ))}
           </View>
           <View className="bg-slate-900 px-3 py-1.5 rounded-lg flex-row items-center">
              <Text className="text-white font-bold text-[10px]">{item.action_text}</Text>
              <ChevronRight size={10} color="white" style={{ marginLeft: 4 }} />
           </View>
        </View>
      </BlurView>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-background-page">
      <StatusBar barStyle="light-content" />
      
      <ScreenHeader
        title="Inventory"
        subtitle="Storage & Stock"
        navigation={navigation}
        showBack={false}
      />

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
        {dashboardLoading && (
          <View className="px-4 py-10 items-center">
            <ActivityIndicator size="large" color="#16A34A" />
            <Text className="text-slate-500 text-xs font-bold mt-3">Loading inventory from database...</Text>
          </View>
        )}

        {dashboardError && (
          <View className="mx-4 mt-5 bg-red-50 border border-red-100 rounded-2xl p-4">
            <Text className="text-red-900 font-black text-sm">Inventory database unavailable</Text>
            <Text className="text-red-700 text-xs mt-1" numberOfLines={3}>
              {(dashboardErrorValue as Error).message}
            </Text>
            <TouchableOpacity className="bg-red-600 px-4 py-2 rounded-lg self-start mt-3" onPress={() => refetchDashboard()}>
              <Text className="text-white font-bold text-xs">Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Global Recommendations Carousel */}
        {recommendations.length > 0 && (
          <View className="mt-4">
             <View className="px-4 mb-3 flex-row items-center justify-between">
                <Text className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Global Recommendations</Text>
                <Sparkles size={14} color="#4F46E5" />
             </View>
             <TypedFlashList
                data={recommendations}
                renderItem={renderRecommendation}
                horizontal
                estimatedItemSize={288}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16 }}
             />
          </View>
        )}

        <View className="px-4 py-6">
           <View className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm mb-6">
              <View className="flex-row justify-between items-center mb-6">
                 <View>
                    <Text className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-1">Total Assets</Text>
                    <Text className="text-gray-900 text-3xl font-black">
                      ₦{(inventoryValue / 100).toLocaleString()}
                    </Text>
                 </View>
                 <View className="w-14 h-14 bg-emerald-50 rounded-2xl items-center justify-center border border-emerald-100">
                    <Box size={28} color="#10B981" />
                 </View>
              </View>
              <View className="flex-row items-center bg-gray-50 px-4 py-3 rounded-2xl border border-gray-100">
                 <TrendingDown size={14} color="#F59E0B" />
                 <Text className="text-gray-600 font-bold text-[10px] ml-3">
                    {turnoverText}
                 </Text>
              </View>
           </View>

           <View className="flex-row gap-4 mb-6">
              <View className="flex-1 bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
                 <Text className="text-gray-400 text-[9px] font-black uppercase mb-2">30D Revenue</Text>
                 <Text className="text-gray-900 text-xl font-black">
                   ₦{((dashboardData?.total_revenue_kobo || 0) / 100).toLocaleString()}
                 </Text>
              </View>
              <View className="flex-1 bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
                 <Text className="text-gray-400 text-[9px] font-black uppercase mb-2">30D Profit</Text>
                 <Text className="text-emerald-600 text-xl font-black">
                   ₦{((dashboardData?.total_profit_kobo || 0) / 100).toLocaleString()}
                 </Text>
              </View>
           </View>

           <View className="flex-row gap-4 mb-6">
              <View className="flex-1 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                 <Text className="text-gray-400 text-[9px] font-black uppercase mb-2">Categories</Text>
                 <Text className="text-gray-900 text-xl font-black">{categories.length}</Text>
              </View>
              <View className="flex-1 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                 <Text className="text-gray-400 text-[9px] font-black uppercase mb-2">Dead Stock</Text>
                 <Text className="text-amber-600 text-xl font-black">{dashboardData?.dead_stock_count || 0}</Text>
              </View>
           </View>

           {optimizationSummary && (
             <View className="mb-8">
                <Text className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-4">Cost & Time Optimization</Text>
                <View className="bg-slate-900 rounded-2xl p-5">
                  <View className="flex-row gap-3 mb-4">
                    <View className="flex-1">
                      <Text className="text-slate-400 text-[9px] font-black uppercase mb-1">Revenue Risk</Text>
                      <Text className="text-white text-lg font-black">
                        ₦{(optimizationSummary.revenue_at_risk_kobo / 100).toLocaleString()}
                      </Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-slate-400 text-[9px] font-black uppercase mb-1">Carry Cost</Text>
                      <Text className="text-white text-lg font-black">
                        ₦{(optimizationSummary.estimated_carrying_cost_kobo / 100).toLocaleString()}
                      </Text>
                    </View>
                  </View>
                  {priorityActions.slice(0, 3).map((item) => (
                    <View key={item.product_id} className="py-3 border-t border-white/10 flex-row items-center">
                      <View className="w-9 h-9 rounded-xl bg-white/10 items-center justify-center mr-3">
                        <Zap size={16} color="#FBBF24" />
                      </View>
                      <View className="flex-1">
                        <Text className="text-white font-black text-xs" numberOfLines={1}>{item.name}</Text>
                        <Text className="text-slate-400 text-[9px]">
                          Order {item.recommended_order_quantity} units - {item.days_of_cover ?? 0} days cover
                        </Text>
                      </View>
                      <Text className="text-amber-300 font-black text-[10px] uppercase">{item.urgency.replace(/_/g, ' ')}</Text>
                    </View>
                  ))}
                </View>
             </View>
           )}

           {(criticalCount > 0) && (
             <TouchableOpacity 
               className="bg-red-50 border border-red-100 rounded-3xl p-5 flex-row items-center mb-8"
               onPress={() => navigation.navigate('LowStockAlerts', {})}
             >
                <View className="w-12 h-12 bg-red-100 rounded-2xl items-center justify-center mr-4">
                   <AlertTriangle size={24} color="#EF4444" />
                </View>
                <View className="flex-1">
                   <Text className="text-red-900 font-black text-base">{criticalCount} Critical Alerts</Text>
                   <Text className="text-red-800 text-[10px] font-medium" numberOfLines={1}>
                     {criticalItems.map((i: any) => i.name).join(', ')}...
                   </Text>
                </View>
                <ChevronRight size={20} color="#EF4444" opacity={0.5} />
             </TouchableOpacity>
           )}

           {/* Quick Actions Grid */}
           <View className="mb-8">
              <Text className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-4">Operations Center</Text>
              <View className="flex-row gap-4 mb-4">
                 <TouchableOpacity 
                   className="flex-1 bg-white p-5 rounded-3xl border border-gray-100 shadow-sm"
                   onPress={() => navigation.navigate('ProductList')}
                 >
                    <View className="w-10 h-10 bg-slate-50 rounded-xl items-center justify-center mb-3">
                       <LayoutGrid size={20} color="#4B5563" />
                    </View>
                    <Text className="text-gray-900 font-black text-xs">Catalog</Text>
                 </TouchableOpacity>
                 <TouchableOpacity 
                   className="flex-1 bg-white p-5 rounded-3xl border border-gray-100 shadow-sm"
                   onPress={() => navigation.navigate('PurchaseOrders')}
                 >
                    <View className="w-10 h-10 bg-emerald-50 rounded-xl items-center justify-center mb-3">
                       <Box size={20} color="#10B981" />
                    </View>
                    <Text className="text-gray-900 font-black text-xs">Orders</Text>
                 </TouchableOpacity>
                 <TouchableOpacity 
                   className="flex-1 bg-white p-5 rounded-3xl border border-gray-100 shadow-sm"
                   onPress={() => navigation.navigate('StockLodger')}
                 >
                    <View className="w-10 h-10 bg-indigo-50 rounded-xl items-center justify-center mb-3">
                       <HistoryIcon size={20} color="#4F46E5" />
                    </View>
                    <Text className="text-gray-900 font-black text-xs">History</Text>
                 </TouchableOpacity>
              </View>

              <View className="flex-row gap-4">
                 <TouchableOpacity 
                   className="flex-1 bg-slate-900 p-5 rounded-3xl shadow-xl flex-row items-center justify-center"
                   onPress={() => navigation.navigate('ScanShelve')}
                 >
                    <Camera size={20} color="white" />
                    <Text className="text-white font-black text-xs ml-3">AR SCAN</Text>
                 </TouchableOpacity>
                 <TouchableOpacity 
                   className="flex-1 bg-ventureroot-green p-5 rounded-3xl shadow-xl flex-row items-center justify-center"
                   onPress={() => navigation.navigate('VoiceStock')}
                 >
                    <Mic size={20} color="white" />
                    <Text className="text-white font-black text-xs ml-3">VOICE</Text>
                 </TouchableOpacity>
              </View>
           </View>
        </View>

        <View className="px-4 mb-8">
           <Text className="text-gray-900 font-bold text-base mb-4">Recent Sales</Text>
           <View className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <View className="bg-gray-50 px-4 py-2 flex-row border-b border-gray-100">
                 <Text className="flex-1 text-gray-400 text-[8px] font-bold uppercase">Product</Text>
                 <Text className="w-16 text-gray-400 text-[8px] font-bold uppercase text-center">Qty</Text>
                 <Text className="w-24 text-gray-400 text-[8px] font-bold uppercase text-right">Profit</Text>
              </View>
              {dashboardData?.recent_transactions?.map((tx: any, i: number) => (
                 <View key={i} className="px-4 py-3 flex-row items-center border-b border-gray-50 last:border-0">
                    <View className="flex-1">
                       <Text className="text-gray-900 font-bold text-xs" numberOfLines={1}>{tx.product_name}</Text>
                       <Text className="text-gray-400 text-[9px]">{tx.customer}</Text>
                    </View>
                    <Text className="w-16 text-gray-900 font-bold text-xs text-center">{tx.quantity}</Text>
                    <View className="w-24 items-end">
                       <Text className="text-emerald-600 font-bold text-xs">₦{(tx.profit_kobo / 100).toLocaleString()}</Text>
                       <Text className="text-gray-400 text-[8px]">Rev: ₦{(tx.amount_kobo / 100).toLocaleString()}</Text>
                    </View>
                 </View>
              ))}
              {(!dashboardData?.recent_transactions || dashboardData.recent_transactions.length === 0) && (
                <View className="p-8 items-center">
                  <Text className="text-gray-400 text-xs italic">No recent sales recorded.</Text>
                </View>
              )}
           </View>
        </View>

        {bestSellers.length > 0 && (
          <View className="px-4 mb-8">
            <Text className="text-gray-900 font-bold text-base mb-4">Best Sellers</Text>
            <View className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {bestSellers.map((item: any, index: number) => (
                <View key={item.product_id || index} className="px-4 py-3 flex-row items-center border-b border-gray-50 last:border-0">
                  <View className="w-8 h-8 rounded-lg bg-emerald-50 items-center justify-center mr-3">
                    <Text className="text-emerald-700 font-black text-xs">{index + 1}</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-gray-900 font-bold text-xs" numberOfLines={1}>{item.name}</Text>
                    <Text className="text-gray-400 text-[9px]">{item.sku}</Text>
                  </View>
                  <Text className="text-gray-900 font-black text-xs">{item.total_sold} sold</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View className="h-32" />
        <View className="h-32" />
      </ScrollView>
    </SafeAreaView>
  );
};

export default InventoryDashboardScreen;
