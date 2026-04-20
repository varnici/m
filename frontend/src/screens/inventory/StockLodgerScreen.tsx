import React from 'react';
import { View, Text, ScrollView, StatusBar, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RootStackScreenProps } from '@/navigation/types';
import { ChevronLeft, ArrowUpRight, Filter, Download } from 'lucide-react-native';
import { useInventoryLedger } from '@/hooks/useInventory';
import { format } from 'date-fns';

const StockLodgerScreen = ({
  navigation,
}: RootStackScreenProps<'StockLodger'>) => {
  const { data: ledger, isLoading } = useInventoryLedger();

  const totalRevenue = (ledger || []).reduce((acc, curr) => acc + curr.revenue_kobo, 0);
  const totalProfit = (ledger || []).reduce((acc, curr) => acc + curr.profit_kobo, 0);
  const totalUnits = (ledger || []).reduce((acc, curr) => acc + curr.quantity, 0);

  return (
    <SafeAreaView className="flex-1 bg-background-page">
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View className="bg-ventureroot-green pt-12 pb-6 px-4">
        <View className="flex-row items-center justify-between mb-4">
           <View className="flex-row items-center">
              <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3">
                 <ChevronLeft color="white" size={24} />
              </TouchableOpacity>
              <Text className="text-white text-xl font-bold">Stock Ledger</Text>
           </View>
           <TouchableOpacity className="bg-white/20 p-2 rounded-full">
              <Download size={20} color="white" />
           </TouchableOpacity>
        </View>

        {/* Totals Row */}
        <View className="flex-row gap-2">
           <View className="bg-white/10 px-4 py-2 rounded-xl flex-1 items-center border border-white/10">
              <Text className="text-white/60 text-[8px] font-bold uppercase">Total Units</Text>
              <Text className="text-white font-bold text-sm">{totalUnits.toLocaleString()}</Text>
           </View>
           <View className="bg-white/10 px-4 py-2 rounded-xl flex-1 items-center border border-white/10">
              <Text className="text-white/60 text-[8px] font-bold uppercase">Revenue</Text>
              <Text className="text-white font-bold text-sm">₦{(totalRevenue / 100).toLocaleString()}</Text>
           </View>
           <View className="bg-white/10 px-4 py-2 rounded-xl flex-1 items-center border border-white/10">
              <Text className="text-white/60 text-[8px] font-bold uppercase">Profit</Text>
              <Text className="text-emerald-400 font-bold text-sm">₦{(totalProfit / 100).toLocaleString()}</Text>
           </View>
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Filters */}
        <View className="flex-row px-4 py-4 justify-between items-center">
           <Text className="text-gray-900 font-bold text-base">Movement History</Text>
           <TouchableOpacity className="flex-row items-center bg-gray-100 px-3 py-1.5 rounded-full">
              <Filter size={14} color="#6B7280" />
              <Text className="text-gray-600 text-xs font-bold ml-1">Filter</Text>
           </TouchableOpacity>
        </View>

        {/* Ledger List */}
        <View className="px-4 pb-10">
           {isLoading ? (
             <ActivityIndicator size="large" color="#10B981" style={{ marginTop: 40 }} />
           ) : (ledger || []).length === 0 ? (
             <View className="items-center justify-center mt-20">
               <Text className="text-gray-400">No transactions recorded yet.</Text>
             </View>
           ) : (ledger || []).map((m, idx) => (
                <View key={`${m.id}-${idx}`} className="bg-white rounded-2xl p-4 mb-3 border border-gray-100 shadow-sm">
                  <View className="flex-row items-center mb-2">
                     <View className="w-8 h-8 rounded-full bg-slate-50 items-center justify-center mr-3">
                        <ArrowUpRight size={16} color="#3B82F6" />
                     </View>
                     <View className="flex-1">
                        <Text className="text-gray-900 font-bold text-sm">{m.product_name}</Text>
                        <Text className="text-gray-400 text-[10px]">Customer: {m.customer_name || m.customer_id || 'Guest'}</Text>
                     </View>
                     <View className="items-end">
                        <Text className="font-black text-sm text-gray-900">-{m.quantity} units</Text>
                        <Text className="text-gray-400 text-[10px]">{format(new Date(m.transaction_date), 'MMM d, HH:mm')}</Text>
                     </View>
                  </View>
                  <View className="flex-row justify-between pt-2 border-t border-gray-50">
                     <View>
                        <Text className="text-gray-400 text-[8px] uppercase font-bold">Revenue</Text>
                        <Text className="text-gray-900 text-xs font-bold">₦{(m.revenue_kobo / 100).toLocaleString()}</Text>
                     </View>
                     <View>
                        <Text className="text-gray-400 text-[8px] uppercase font-bold">Cost</Text>
                        <Text className="text-gray-900 text-xs font-bold">₦{(m.cost_price_kobo / 100).toLocaleString()}</Text>
                     </View>
                     <View className="items-end">
                        <Text className="text-gray-400 text-[8px] uppercase font-bold">Profit</Text>
                        <Text className="text-emerald-600 text-xs font-bold">₦{(m.profit_kobo / 100).toLocaleString()}</Text>
                     </View>
                  </View>
                </View>
             ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default StockLodgerScreen;
