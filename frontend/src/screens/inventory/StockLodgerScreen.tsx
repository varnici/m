import React from 'react';
import { View, Text, ScrollView, StatusBar, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RootStackScreenProps } from '@/navigation/types';
import { ChevronLeft, ArrowUpRight, ArrowDownLeft, Filter, Download } from 'lucide-react-native';
import { colors } from '@/theme/colors';

const StockLodgerScreen = ({
  navigation,
}: RootStackScreenProps<'StockLodger'>) => {
  const movements = [
    { id: 1, type: 'IN', title: 'Indomie 70g · Restock', subtitle: 'Dangote Warehouse', qty: '+4,000 units', date: 'Today, 08:30 AM', color: '#10B981' },
    { id: 2, type: 'OUT', title: 'Bulk Sale · Lagos Market', subtitle: 'Buyer: ShopRite Lekki', qty: '-1,200 units', date: 'Today, 11:45 AM', color: '#3B82F6' },
    { id: 3, type: 'OUT', title: 'Damage Write-off', subtitle: 'Water damage during rain', qty: '-15 units', date: 'Yesterday, 4:20 PM', color: '#EF4444' },
    { id: 4, type: 'IN', title: 'Peak Milk · Restock', subtitle: 'Friesland Warehouse', qty: '+500 units', date: 'Dec 12, 2024', color: '#10B981' },
  ];

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
              <Text className="text-white/60 text-[8px] font-bold uppercase">Total In</Text>
              <Text className="text-white font-bold text-sm">+5,820</Text>
           </View>
           <View className="bg-white/10 px-4 py-2 rounded-xl flex-1 items-center border border-white/10">
              <Text className="text-white/60 text-[8px] font-bold uppercase">Total Out</Text>
              <Text className="text-white font-bold text-sm">-1,415</Text>
           </View>
           <View className="bg-white/10 px-4 py-2 rounded-xl flex-1 items-center border border-white/10">
              <Text className="text-white/60 text-[8px] font-bold uppercase">Net Diff</Text>
              <Text className="text-emerald-400 font-bold text-sm">+4,405</Text>
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
           {movements.map((m, idx) => (
              <View key={idx} className="bg-white rounded-2xl p-4 mb-3 border border-gray-100 shadow-sm flex-row items-center">
                 <View className="w-10 h-10 rounded-full bg-slate-50 items-center justify-center mr-3">
                    {m.type === 'IN' ? (
                       <ArrowDownLeft size={20} color="#10B981" />
                    ) : (
                       <ArrowUpRight size={20} color={m.color} />
                    )}
                 </View>
                 <View className="flex-1">
                    <Text className="text-gray-900 font-bold text-sm">{m.title}</Text>
                    <Text className="text-gray-400 text-[10px]">{m.subtitle}</Text>
                 </View>
                 <View className="items-end">
                    <Text className="font-black text-sm" style={{ color: m.type === 'IN' ? '#10B981' : '#111827' }}>{m.qty}</Text>
                    <Text className="text-gray-400 text-[10px] mt-0.5">{m.date}</Text>
                 </View>
              </View>
           ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default StockLodgerScreen;
