import React from 'react';
import { View, Text, ScrollView, SafeAreaView, StatusBar, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft, Calendar, Download, Filter } from 'lucide-react-native';
import { colors } from '@/theme/colors';

const SalesHistoryScreen = () => {
  const navigation = useNavigation<any>();

  const history = [
    { id: 1, date: 'Today, 2:34 PM', type: 'Indomie 70g · x40', amount: '₦18,400' },
    { id: 2, date: 'Today, 11:15 AM', type: 'Peak Milk · x12', amount: '₦3,600' },
    { id: 3, date: 'Yesterday, 5:40 PM', type: 'Milo 400g · x8', amount: '₦2,800' },
    { id: 4, date: 'Yesterday, 9:20 AM', type: 'Indomie 70g · x20', amount: '₦9,200' },
    { id: 5, date: 'Dec 12, 2024', type: 'Golden Morn · x5', amount: '₦5,500' },
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
              <Text className="text-white text-xl font-bold">Sales History</Text>
           </View>
           <TouchableOpacity className="bg-white/20 p-2 rounded-full">
              <Download size={20} color="white" />
           </TouchableOpacity>
        </View>

        {/* Filters */}
        <View className="flex-row gap-2">
           <TouchableOpacity className="bg-white/10 px-4 py-2 rounded-full border border-white/20 flex-row items-center">
              <Calendar size={14} color="white" />
              <Text className="text-white text-xs font-bold ml-2">Last 7 Days</Text>
           </TouchableOpacity>
           <TouchableOpacity className="bg-white/10 px-4 py-2 rounded-full border border-white/20 flex-row items-center">
              <Filter size={14} color="white" />
              <Text className="text-white text-xs font-bold ml-2">Product</Text>
           </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Summary Card */}
        <View className="bg-white m-4 p-5 rounded-2xl border border-gray-100 shadow-sm flex-row justify-between items-center">
           <View>
              <Text className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Total (7 Days)</Text>
              <Text className="text-gray-900 text-2xl font-black">₦142,500</Text>
           </View>
           <View className="bg-emerald-50 px-3 py-1.5 rounded-lg">
              <Text className="text-emerald-600 font-bold text-xs">↑ 14% yield</Text>
           </View>
        </View>

        {/* History List */}
        <View className="px-4 pb-10">
           <Text className="text-gray-900 font-bold text-base mb-4">Recent Transactions</Text>
           <View className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {history.map((item, idx) => (
                 <View key={item.id} className={`p-4 flex-row justify-between items-center ${idx < history.length - 1 ? 'border-b border-gray-50' : ''}`}>
                    <View>
                       <Text className="text-gray-900 font-bold text-sm">{item.type}</Text>
                       <Text className="text-gray-400 text-[10px] mt-1">{item.date}</Text>
                    </View>
                    <Text className="text-gray-900 font-black text-sm">{item.amount}</Text>
                 </View>
              ))}
           </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default SalesHistoryScreen;
