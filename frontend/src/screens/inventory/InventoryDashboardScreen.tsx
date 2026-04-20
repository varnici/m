import React from 'react';
import { View, Text, ScrollView, StatusBar, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RootStackScreenProps } from '@/navigation/types';
import { ChevronLeft, Box, AlertTriangle, List, Mic, Camera, TrendingDown } from 'lucide-react-native';
import { colors } from '@/theme/colors';
import BottomTabBar from '@/components/ui/BottomTabBar';
import ScreenHeader from '@/components/ui/ScreenHeader';

import { useInventoryDashboard, useLowStockAlerts } from '@/hooks/useInventory';

const InventoryDashboardScreen = ({
  navigation,
}: RootStackScreenProps<'InventoryDashboard'>) => {
  const { data: dashboardData, isLoading: isDashboardLoading } = useInventoryDashboard();
  const { data: lowStockData, isLoading: isLowStockLoading } = useLowStockAlerts();

  const inventoryValue = dashboardData?.total_value_kobo || 0;
  const turnoverText = dashboardData?.turnover_description || 'Loading turnover data...';
  
  const criticalItems = lowStockData?.slice(0, 4) || [];
  const criticalCount = lowStockData?.length || 0;

  return (
    <SafeAreaView className="flex-1 bg-background-page">
      <StatusBar barStyle="light-content" />
      
      <ScreenHeader
        title="Inventory"
        subtitle="Storage & Stock"
        navigation={navigation}
      />

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-4 py-2">
           <View className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm mb-4">
              <View className="flex-row justify-between items-center mb-4">
                 <View>
                    <Text className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Total Inventory Value</Text>
                    <Text className="text-gray-900 text-3xl font-black">
                      ₦{(inventoryValue / 100).toLocaleString()}
                    </Text>
                 </View>
                 <View className="w-12 h-12 bg-emerald-50 rounded-2xl items-center justify-center">
                    <Box size={24} color="#10B981" />
                 </View>
              </View>
              <View className="flex-row items-center bg-gray-50 p-3 rounded-xl">
                 <TrendingDown size={14} color="#F59E0B" />
                 <Text className="text-gray-600 text-[10px] ml-2">
                    {turnoverText}
                 </Text>
              </View>
           </View>

           <View className="flex-row gap-3">
              <View className="flex-1 bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
                 <Text className="text-gray-400 text-[8px] font-bold uppercase mb-1">30D Revenue</Text>
                 <Text className="text-gray-900 text-xl font-black">
                   ₦{((dashboardData?.total_revenue_kobo || 0) / 100).toLocaleString()}
                 </Text>
              </View>
              <View className="flex-1 bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
                 <Text className="text-gray-400 text-[8px] font-bold uppercase mb-1">30D Profit</Text>
                 <Text className="text-emerald-600 text-xl font-black">
                   ₦{((dashboardData?.total_profit_kobo || 0) / 100).toLocaleString()}
                 </Text>
              </View>
           </View>
        </View>{(criticalCount > 0) && (
          <TouchableOpacity 
            className="mx-4 mb-6 bg-red-50 border border-red-100 rounded-2xl p-4 flex-row items-center"
            onPress={() => navigation.navigate('ProductList')}
          >
             <View className="w-10 h-10 bg-red-100 rounded-full items-center justify-center mr-3">
                <AlertTriangle size={20} color="#EF4444" />
             </View>
             <View className="flex-1">
                <Text className="text-red-900 font-bold text-sm">{criticalCount} Items Critical</Text>
                <Text className="text-red-800 text-[10px]">
                  {criticalItems.map(i => i.name).join(', ')}...
                </Text>
             </View>
             <View className="bg-red-500 px-3 py-1.5 rounded-lg">
                <Text className="text-white font-bold text-[10px]">Restock</Text>
             </View>
          </TouchableOpacity>
        )}

         {/* Utils Grid */}
         <View className="flex-row px-4 gap-3 mb-4">
            <TouchableOpacity 
              className="flex-1 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm items-center"
              onPress={() => navigation.navigate('ProductList')}
            >
               <View className="w-12 h-12 bg-slate-50 rounded-xl items-center justify-center mb-3">
                  <List size={24} color="#4B5563" />
               </View>
               <Text className="text-gray-900 font-bold text-xs text-center">Products Catalog</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              className="flex-1 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm items-center"
              onPress={() => navigation.navigate('PurchaseOrders')}
            >
               <View className="w-12 h-12 bg-emerald-50 rounded-xl items-center justify-center mb-3">
                  <Box size={24} color="#10B981" />
               </View>
               <Text className="text-gray-900 font-bold text-xs text-center">Purchase Orders</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              className="flex-1 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm items-center"
              onPress={() => navigation.navigate('AIInsights')}
            >
               <View className="w-12 h-12 bg-indigo-50 rounded-xl items-center justify-center mb-3">
                  <TrendingDown size={24} color="#4F46E5" />
               </View>
               <Text className="text-gray-900 font-bold text-xs text-center">AI Insights</Text>
            </TouchableOpacity>
         </View>

         <View className="flex-row px-4 gap-3 mb-8">
            <TouchableOpacity 
              className="flex-1 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm items-center"
              onPress={() => navigation.navigate('StockLodger')}
            >
               <Text className="text-gray-900 font-bold text-xs">Ledger</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              className="flex-1 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm items-center"
              onPress={() => navigation.navigate('VoiceStock')}
            >
               <Text className="text-gray-900 font-bold text-xs">Voice Update</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              className="flex-1 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm items-center"
              onPress={() => navigation.navigate('ScanShelve')}
            >
               <Text className="text-gray-900 font-bold text-xs">Scan Shelf</Text>
            </TouchableOpacity>
         </View>

        <View className="px-4 mb-8">
           <Text className="text-gray-900 font-bold text-base mb-4">Recent Sales (Sheet)</Text>
           <View className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
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

        <View className="px-4 mb-10">
           <Text className="text-gray-900 font-bold text-base mb-4">Categories</Text>
           <View className="gap-4">
              {dashboardData?.categories?.map((cat: any, i: number) => (
                 <View key={i} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex-row items-center">
                    <View className="w-2 h-10 rounded-full mr-4" style={{ backgroundColor: cat.color || '#10B981' }} />
                    <View className="flex-1">
                       <Text className="text-gray-900 font-bold text-sm">{cat.name}</Text>
                       <Text className="text-gray-400 text-[10px]">{cat.count} individual items</Text>
                    </View>
                    <View className="bg-gray-50 px-3 py-1 rounded-full">
                       <Text className="text-gray-600 font-bold text-[10px]">{cat.health_score}% Healthy</Text>
                    </View>
                 </View>
              ))}
              {(!dashboardData?.categories || dashboardData.categories.length === 0) && (
                <Text className="text-gray-400 text-xs text-center italic">No category data available yet.</Text>
              )}
           </View>
        </View>
        <View className="h-20" />
      </ScrollView>
      <BottomTabBar navigation={navigation} />
    </SafeAreaView>
  );
};

export default InventoryDashboardScreen;
