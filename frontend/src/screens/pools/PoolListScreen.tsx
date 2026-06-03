import React from 'react';
import { View, Text, ScrollView, StatusBar, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RootStackScreenProps } from '@/navigation/types';
import { ChevronLeft, Users, Zap, Clock, Search, Filter } from 'lucide-react-native';
import { colors } from '@/theme/colors';

const PoolListScreen = ({ navigation }: RootStackScreenProps<'PoolList'>) => {

  const pools = [
    { 
      id: 1, 
      item: 'Dangote Sugar (50kg)', 
      currentPrice: '₦82,000', 
      marketPrice: '₦95,000', 
      saved: '14% OFF',
      participants: 42, 
      target: 50,
      timeLeft: '4h 12m',
      category: 'Grains'
    },
    { 
      id: 2, 
      item: 'Golden Penny Flour', 
      currentPrice: '₦54,500', 
      marketPrice: '₦62,000', 
      saved: '12% OFF',
      participants: 18, 
      target: 100,
      timeLeft: '2d 8h',
      category: 'Baking'
    },
    { 
      id: 3, 
      item: 'Vegetable Oil (25L)', 
      currentPrice: '₦48,000', 
      marketPrice: '₦55,000', 
      saved: '13% OFF',
      participants: 89, 
      target: 200,
      timeLeft: '1d 2h',
      category: 'Oil'
    },
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
              <Text className="text-white text-xl font-bold">Group Buy Pools</Text>
           </View>
           <TouchableOpacity className="bg-white/20 p-2 rounded-full">
              <Search size={20} color="white" />
           </TouchableOpacity>
        </View>

        {/* Categories Scroller */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2 mt-2">
           {['All Pools', 'Grains', 'Oils', 'Baking', 'Canned Goods'].map((cat, i) => (
              <TouchableOpacity key={i} className={`px-4 py-2 rounded-full border ${i === 0 ? 'bg-white border-white' : 'bg-transparent border-white/30'}`}>
                 <Text className={`text-xs font-bold ${i === 0 ? 'text-ventureroot-green' : 'text-white/70'}`}>{cat}</Text>
              </TouchableOpacity>
           ))}
        </ScrollView>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Banner */}
        <View className="m-4 bg-blue-600 rounded-3xl p-5 overflow-hidden flex-row items-center">
           <View className="flex-1">
              <Text className="text-blue-100 text-[10px] font-bold uppercase tracking-widest mb-1">Power of Community</Text>
              <Text className="text-white text-lg font-bold">Nigeria's biggest grocery pool is 85% full!</Text>
              <TouchableOpacity className="bg-white px-4 py-2 rounded-xl self-start mt-4">
                 <Text className="text-blue-600 font-bold text-xs">Join Mega Pool</Text>
              </TouchableOpacity>
           </View>
           <View className="w-20 h-20 bg-blue-500 rounded-full opacity-50 absolute -right-5 -bottom-5" />
        </View>

        {/* Pools List */}
        <View className="px-4 pb-10">
           <View className="flex-row justify-between items-center mb-4">
              <Text className="text-gray-900 font-bold text-base">Active Pools</Text>
              <TouchableOpacity className="flex-row items-center">
                 <Filter size={14} color="#6B7280" />
                 <Text className="text-gray-500 text-xs ml-1">Sort by: Closing Soon</Text>
              </TouchableOpacity>
           </View>

           {pools.map((pool, idx) => (
              <TouchableOpacity 
                key={idx} 
                className="bg-white rounded-3xl p-5 mb-4 border border-gray-100 shadow-sm"
                onPress={() => navigation.navigate('PoolDetail', { poolId: pool.id })}
              >
                 <View className="flex-row justify-between mb-4">
                    <View className="flex-1">
                       <View className="bg-gray-100 self-start px-2 py-0.5 rounded-md mb-2">
                          <Text className="text-gray-500 text-[8px] font-bold uppercase">{pool.category}</Text>
                       </View>
                       <Text className="text-gray-900 font-bold text-base">{pool.item}</Text>
                    </View>
                    <View className="items-end">
                       <Text className="text-gray-400 text-[10px] line-through">{pool.marketPrice}</Text>
                       <Text className="text-ventureroot-green font-black text-xl">{pool.currentPrice}</Text>
                       <View className="bg-emerald-50 px-2 py-0.5 rounded mt-1">
                          <Text className="text-emerald-700 font-bold text-[8px]">{pool.saved}</Text>
                       </View>
                    </View>
                 </View>

                 {/* Progress Bar */}
                 <View className="mb-4">
                    <View className="flex-row justify-between mb-1.5">
                       <View className="flex-row items-center">
                          <Users size={12} color="#6B7280" />
                          <Text className="text-gray-500 text-[10px] ml-1">{pool.participants} participants</Text>
                       </View>
                       <Text className="text-gray-500 text-[10px]">Goal: {pool.target}</Text>
                    </View>
                    <View className="h-2 bg-gray-100 rounded-full overflow-hidden">
                       <View 
                         className="h-full bg-ventureroot-green rounded-full" 
                         style={{ width: `${(pool.participants / pool.target) * 100}%` }} 
                       />
                    </View>
                 </View>

                 <View className="flex-row justify-between items-center pt-3 border-t border-gray-50">
                    <View className="flex-row items-center">
                       <Clock size={12} color="#EF4444" />
                       <Text className="text-red-500 font-bold text-[10px] ml-1">Ends in {pool.timeLeft}</Text>
                    </View>
                    <View className="flex-row items-center">
                       <Text className="text-ventureroot-green font-bold text-xs mr-1">Join Pool</Text>
                       <Zap size={14} color="#10B981" fill="#10B981" />
                    </View>
                 </View>
              </TouchableOpacity>
           ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default PoolListScreen;
