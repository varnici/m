import React from 'react';
import { View, Text, ScrollView, StatusBar, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RootStackScreenProps } from '@/navigation/types';
import { ChevronLeft, Box, AlertTriangle, List, Mic, Camera, TrendingDown } from 'lucide-react-native';
import { colors } from '@/theme/colors';

const InventoryDashboardScreen = ({
  navigation,
}: RootStackScreenProps<'InventoryDashboard'>) => {
  const categories = [
    { name: 'Grains', items: 124, status: 'Healthy', color: '#10B981' },
    { name: 'Canned Goods', items: 85, status: 'Low Stock', color: '#F59E0B' },
    { name: 'Beverages', items: 210, status: 'Healthy', color: '#10B981' },
    { name: 'Snacks', items: 42, status: 'Critical', color: '#EF4444' },
  ];

  return (
    <SafeAreaView className="flex-1 bg-background-page">
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View className="bg-ventureroot-green pt-12 pb-6 px-4">
        <View className="flex-row items-center mb-4">
           <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3">
              <ChevronLeft color="white" size={24} />
           </TouchableOpacity>
           <View>
              <Text className="text-white/70 text-xs font-medium uppercase tracking-wider">Storage & Stock</Text>
              <Text className="text-white text-2xl font-bold">Inventory</Text>
           </View>
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Stock Value Card */}
        <View className="bg-white m-4 p-6 rounded-3xl border border-gray-100 shadow-sm">
           <View className="flex-row justify-between items-center mb-4">
              <View>
                 <Text className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Total Inventory Value</Text>
                 <Text className="text-gray-900 text-3xl font-black">₦1,420,500</Text>
              </View>
              <View className="w-12 h-12 bg-emerald-50 rounded-2xl items-center justify-center">
                 <Box size={24} color="#10B981" />
              </View>
           </View>
           <View className="flex-row items-center bg-gray-50 p-3 rounded-xl">
              <TrendingDown size={14} color="#F59E0B" />
              <Text className="text-gray-600 text-[10px] ml-2">
                 Inventory turnover is <Text className="font-bold text-gray-900">14% faster</Text> than last month.
              </Text>
           </View>
        </View>

        {/* Low Stock Alerts */}
        <TouchableOpacity 
          className="mx-4 mb-6 bg-red-50 border border-red-100 rounded-2xl p-4 flex-row items-center"
          onPress={() => navigation.navigate('StockLodger')}
        >
           <View className="w-10 h-10 bg-red-100 rounded-full items-center justify-center mr-3">
              <AlertTriangle size={20} color="#EF4444" />
           </View>
           <View className="flex-1">
              <Text className="text-red-900 font-bold text-sm">4 Items Critical</Text>
              <Text className="text-red-800 text-[10px]">Indomie 70g (x2), Peak Milk (x1)...</Text>
           </View>
           <View className="bg-red-500 px-3 py-1.5 rounded-lg">
              <Text className="text-white font-bold text-[10px]">Restock</Text>
           </View>
        </TouchableOpacity>

        {/* Utils Grid */}
        <View className="flex-row px-4 gap-3 mb-8">
           <TouchableOpacity 
             className="flex-1 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm items-center"
             onPress={() => navigation.navigate('StockLodger')}
           >
              <View className="w-12 h-12 bg-slate-50 rounded-xl items-center justify-center mb-3">
                 <List size={24} color="#4B5563" />
              </View>
              <Text className="text-gray-900 font-bold text-xs">Stock Ledger</Text>
           </TouchableOpacity>

           <TouchableOpacity 
             className="flex-1 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm items-center"
             onPress={() => navigation.navigate('VoiceStock')}
           >
              <View className="w-12 h-12 bg-emerald-50 rounded-xl items-center justify-center mb-3">
                 <Mic size={24} color="#10B981" />
              </View>
              <Text className="text-gray-900 font-bold text-xs">Voice Update</Text>
           </TouchableOpacity>

           <TouchableOpacity 
             className="flex-1 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm items-center"
             onPress={() => navigation.navigate('ScanShelve')}
           >
              <View className="w-12 h-12 bg-blue-50 rounded-xl items-center justify-center mb-3">
                 <Camera size={24} color="#3B82F6" />
              </View>
              <Text className="text-gray-900 font-bold text-xs">Scan Shelf</Text>
           </TouchableOpacity>
        </View>

        {/* Category Breakdown */}
        <View className="px-4 mb-10">
           <Text className="text-gray-900 font-bold text-base mb-4">Categories</Text>
           <View className="gap-4">
              {categories.map((cat, i) => (
                 <View key={i} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex-row items-center">
                    <View className="w-2 h-10 rounded-full mr-4" style={{ backgroundColor: cat.color }} />
                    <View className="flex-1">
                       <Text className="text-gray-900 font-bold text-sm">{cat.name}</Text>
                       <Text className="text-gray-400 text-[10px]">{cat.items} individual items</Text>
                    </View>
                    <View className="bg-gray-50 px-3 py-1 rounded-full">
                       <Text className="text-gray-600 font-bold text-[10px]">{cat.status}</Text>
                    </View>
                 </View>
              ))}
           </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default InventoryDashboardScreen;
