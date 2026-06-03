// @ts-nocheck
import React from 'react';
import { View, Text, ScrollView, StatusBar, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { 
  ChevronLeft, 
  Info, 
  BarChart, 
  TrendingUp, 
  Zap, 
  Activity,
  ArrowUpRight,
  Target
} from 'lucide-react-native';

import type { RootStackScreenProps } from '@/navigation/types';
import { colors } from '@/theme/colors';
import { useInventoryDashboard, useProductHealthScores } from '@/hooks/useInventory';

const SalesVelocityScreen = ({
  navigation,
}: RootStackScreenProps<'SalesVelocity'>) => {
  const { data: dashboardData } = useInventoryDashboard();
  const { data: healthScores, isLoading } = useProductHealthScores(5);

  const avgTurnover = dashboardData?.turnover_ratio || 0;

  return (
    <SafeAreaView className="flex-1 bg-background-page">
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View className="bg-ventureroot-green pt-12 pb-8 px-4 rounded-b-[40px] shadow-lg">
        <View className="flex-row items-center mb-6">
           <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3 bg-white/20 p-2 rounded-full">
              <ChevronLeft color="white" size={24} />
           </TouchableOpacity>
           <Text className="text-white text-2xl font-black">Sales Velocity</Text>
        </View>
        
        <View className="flex-row justify-between items-center bg-white/10 p-4 rounded-3xl border border-white/20">
           <View>
              <Text className="text-white/60 text-[10px] font-black uppercase tracking-widest">Global Turnover</Text>
              <Text className="text-white text-3xl font-black">{avgTurnover.toFixed(1)}x</Text>
           </View>
           <View className="bg-emerald-400 w-12 h-12 rounded-2xl items-center justify-center">
              <Activity size={24} color="white" />
           </View>
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Velocity Score Card */}
        <View className="m-4">
           <Text className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-4 ml-2">Performance Breakdown</Text>
           <View className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm items-center">
              <View className="w-24 h-24 bg-emerald-50 rounded-full items-center justify-center mb-6 border-4 border-emerald-100 shadow-inner">
                 <Zap size={48} color="#10B981" fill="#10B981" />
              </View>
              <Text className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-2">Portfolio Speed</Text>
              <View className="flex-row items-end">
                 <Text className="text-gray-900 text-5xl font-black">84</Text>
                 <Text className="text-gray-400 text-lg font-bold mb-1 ml-1">/100</Text>
              </View>
              <View className="bg-emerald-50 px-3 py-1 rounded-full mt-4 flex-row items-center">
                 <ArrowUpRight size={12} color="#059669" />
                 <Text className="text-emerald-600 text-[10px] font-bold ml-1">+12% faster than last month</Text>
              </View>
           </View>
        </View>

        {/* Inventory Turnaround Charts */}
        <View className="bg-slate-900 mx-4 p-6 rounded-3xl mb-8 shadow-2xl">
           <View className="flex-row justify-between items-center mb-8">
              <View>
                 <Text className="text-white font-black text-lg">Product Turnaround</Text>
                 <Text className="text-white/40 text-[10px]">Restock cycle frequency</Text>
              </View>
              <Target size={20} color="#10B981" />
           </View>
           
           <View className="gap-8">
               {healthScores?.map((item, i) => (
                <View key={item.id}>
                  <View className="flex-row justify-between mb-3 items-center">
                     <View>
                        <Text className="text-white font-bold text-xs">{item.name}</Text>
                        <Text className="text-white/40 text-[8px] uppercase tracking-tighter">{item.sku}</Text>
                     </View>
                     <View className="items-end">
                        <Text className={`${(item.turnover_30d ?? 0) > 5 ? 'text-emerald-400' : 'text-blue-400'} text-[11px] font-black`}>
                           {item.turnover_30d ?? 0} days / restock
                        </Text>
                        <Text className="text-white/20 text-[8px] uppercase">30D Avg</Text>
                     </View>
                  </View>
                  <View className="h-2 bg-white/5 rounded-full overflow-hidden">
                     <View 
                        className={`h-full ${(item.turnover_30d ?? 0) < 7 ? 'bg-emerald-500 shadow-emerald-500' : 'bg-blue-500'} rounded-full`} 
                        style={{ width: `${Math.min(100, (14 / (item.turnover_30d ?? 1)) * 100)}%` }} 
                     />
                  </View>
                </View>
              ))}
              {isLoading && <ActivityIndicator color="white" />}
              {(!healthScores || healthScores.length === 0) && (
                <Text className="text-white/40 text-xs italic text-center py-4">No product metrics available yet.</Text>
              )}
           </View>
        </View>

        {/* AI Strategic Insight */}
        {dashboardData?.global_recommendations?.find((r: any) => r.type === 'restock') && (
          <BlurView intensity={30} tint="light" className="mx-4 p-5 rounded-3xl border border-gray-200 flex-row items-start mb-10 overflow-hidden">
             <View className="w-10 h-10 bg-indigo-500 rounded-xl items-center justify-center mr-4">
                <TrendingUp size={20} color="white" />
             </View>
             <View className="flex-1">
                <Text className="text-indigo-900 font-black text-sm mb-2">AI Restock Strategy</Text>
                <Text className="text-indigo-800 text-[11px] leading-5 font-medium">
                  {dashboardData.global_recommendations.find((r: any) => r.type === 'restock')?.description}
                </Text>
             </View>
          </BlurView>
        )}
      </ScrollView>

      {/* Footer Trust Score */}
      <View className="p-8 items-center bg-gray-50 rounded-t-[40px]">
         <Text className="text-gray-400 text-[10px] text-center leading-5 px-10 font-medium">
            Sales velocity contributes to <Text className="font-black text-gray-900">35%</Text> of your total Credit Trust Score. High velocity unlocks <Text className="text-emerald-600 font-black">lower interest loans</Text>.
         </Text>
      </View>
    </SafeAreaView>
  );
};

export default SalesVelocityScreen;
// @ts-nocheck
