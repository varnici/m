import React from 'react';
import { View, Text, ScrollView, StatusBar, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RootStackScreenProps } from '@/navigation/types';
import { ChevronLeft, Calendar, Download, Filter, Edit2 } from 'lucide-react-native';
import { colors } from '@/theme/colors';
import { useQuery } from '@tanstack/react-query';
import { salesService } from '@/services/salesService';
import { format } from 'date-fns';

const SalesHistoryScreen = ({
  navigation,
}: RootStackScreenProps<'SalesHistory'>) => {
  const { data: history = [], isLoading } = useQuery({
    queryKey: ['sales-history'],
    queryFn: () => salesService.getSalesHistory(0, 100),
  });

  const totalAmount = history.reduce((acc: number, item: any) => acc + (item.revenue_kobo || 0), 0) / 100;

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]">
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View className="bg-white pt-12 pb-6 px-6 border-b border-gray-100 shadow-sm">
        <View className="flex-row items-center justify-between mb-6">
           <View className="flex-row items-center">
              <TouchableOpacity 
                onPress={() => navigation.goBack()} 
                className="w-12 h-12 bg-gray-50 rounded-2xl items-center justify-center border border-gray-100 mr-4"
              >
                 <ChevronLeft color={colors.ventureroot.green} size={24} />
              </TouchableOpacity>
              <View>
                <Text className="text-gray-900 text-2xl font-black">Sales History</Text>
                <Text className="text-gray-400 text-[10px] font-black uppercase tracking-widest mt-1">Transaction Ledger</Text>
              </View>
           </View>
           <TouchableOpacity className="bg-emerald-50 w-12 h-12 rounded-2xl items-center justify-center border border-emerald-100">
              <Download size={20} color={colors.ventureroot.green} />
           </TouchableOpacity>
        </View>

        {/* Filters */}
        <View className="flex-row gap-3">
           <TouchableOpacity className="bg-gray-50 px-5 py-3 rounded-2xl border border-gray-100 flex-row items-center">
              <Calendar size={16} color="#64748B" />
              <Text className="text-gray-600 text-xs font-bold ml-2">Last 7 Days</Text>
           </TouchableOpacity>
           <TouchableOpacity className="bg-gray-50 px-5 py-3 rounded-2xl border border-gray-100 flex-row items-center">
              <Filter size={16} color="#64748B" />
              <Text className="text-gray-600 text-xs font-bold ml-2">Filter</Text>
           </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Summary Card */}
        <View className="bg-slate-900 mx-6 mt-8 mb-6 p-8 rounded-[40px] shadow-2xl shadow-slate-900/20 overflow-hidden relative">
           <View className="absolute -top-10 -right-10 w-40 h-40 bg-white/5 rounded-full" />
           <View className="absolute -bottom-10 -left-10 w-24 h-24 bg-ventureroot-green/10 rounded-full" />
           
           <View>
              <Text className="text-white/40 text-[10px] font-black uppercase tracking-[3px] mb-2">Total Revenue</Text>
              <View className="flex-row items-end">
                <Text className="text-white text-4xl font-black">₦{totalAmount.toLocaleString()}</Text>
                <View className="bg-ventureroot-green/20 px-2 py-1 rounded-lg ml-3 mb-1">
                  <Text className="text-ventureroot-green font-black text-[10px]">↑ 14%</Text>
                </View>
              </View>
           </View>
        </View>

        {/* History List */}
        <View className="px-6 pb-20">
           <Text className="text-gray-900 font-black text-lg mb-5">Recent Transactions</Text>
           
           {isLoading ? (
             <View className="py-20 items-center">
               <ActivityIndicator color={colors.ventureroot.green} size="large" />
             </View>
           ) : history.length === 0 ? (
             <View className="bg-white rounded-[32px] p-10 items-center border border-gray-100">
               <Text className="text-gray-400 font-bold">No transactions found</Text>
             </View>
           ) : (
             <View className="gap-4">
                {history.map((item: any) => (
                   <View 
                    key={item.id} 
                    className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm flex-row justify-between items-center"
                   >
                      <View className="flex-1">
                         <Text className="text-gray-900 font-black text-base" numberOfLines={1}>{item.product_name}</Text>
                         <Text className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mt-1">
                            {item.quantity} units · {format(new Date(item.transaction_date), 'MMM d, h:mm a')}
                         </Text>
                         <Text className="text-emerald-600 font-black text-sm mt-1">₦{(item.revenue_kobo / 100).toLocaleString()}</Text>
                      </View>
                      
                      <View className="flex-row items-center gap-2">
                        <TouchableOpacity 
                          onPress={() => navigation.navigate('Receipt', { saleId: item.sale_id || item.id })}
                          className="w-12 h-12 bg-emerald-50 rounded-2xl items-center justify-center border border-emerald-100"
                        >
                           <Download size={18} color={colors.ventureroot.green} />
                        </TouchableOpacity>
                        <TouchableOpacity 
                          onPress={() => navigation.navigate('RecordSale', { saleId: item.sale_id || item.id })}
                          className="w-12 h-12 bg-gray-50 rounded-2xl items-center justify-center border border-gray-100"
                        >
                           <Edit2 size={18} color="#64748B" />
                        </TouchableOpacity>
                      </View>
                   </View>
                ))}
             </View>
           )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default SalesHistoryScreen;
