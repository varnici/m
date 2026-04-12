import React from 'react';
import { View, Text, ScrollView, SafeAreaView, StatusBar, TouchableOpacity } from 'react-native';
import type { RootStackScreenProps } from '@/navigation/types';
import { ChevronLeft, Info, BarChart, TrendingUp, Zap } from 'lucide-react-native';
import { colors } from '@/theme/colors';

const SalesVelocityScreen = ({
  navigation,
}: RootStackScreenProps<'SalesVelocity'>) => {
  return (
    <SafeAreaView className="flex-1 bg-background-page">
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View className="bg-ventureroot-green pt-12 pb-6 px-4">
        <View className="flex-row items-center mb-4">
           <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3">
              <ChevronLeft color="white" size={24} />
           </TouchableOpacity>
           <Text className="text-white text-xl font-bold">Sales Velocity</Text>
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Velocity Score Card */}
        <View className="bg-white m-4 p-6 rounded-3xl border border-gray-100 shadow-sm items-center">
           <View className="w-20 h-20 bg-emerald-50 rounded-full items-center justify-center mb-4 border-2 border-emerald-100">
              <Zap size={40} color="#10B981" />
           </View>
           <Text className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">Current Speed</Text>
           <Text className="text-emerald-600 text-4xl font-black">8.4x</Text>
           <Text className="text-gray-500 text-[10px] mt-2 italic">Standard regional average: 5.2x</Text>
        </View>

        {/* Comparison Chart Mock */}
        <View className="bg-slate-900 mx-4 p-6 rounded-2xl mb-8">
           <Text className="text-white font-bold text-base mb-6">Inventory Turnaround</Text>
           
           <View className="gap-6">
              <View>
                 <View className="flex-row justify-between mb-2">
                    <Text className="text-white/60 text-[10px] font-bold uppercase">Indomie 70g</Text>
                    <Text className="text-emerald-400 text-[10px] font-bold">2.4 days / restock</Text>
                 </View>
                 <View className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <View className="h-full bg-emerald-500 rounded-full w-[85%]" />
                 </View>
              </View>

              <View>
                 <View className="flex-row justify-between mb-2">
                    <Text className="text-white/60 text-[10px] font-bold uppercase">Peak Milk</Text>
                    <Text className="text-blue-400 text-[10px] font-bold">8.1 days / restock</Text>
                 </View>
                 <View className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <View className="h-full bg-blue-500 rounded-full w-[45%]" />
                 </View>
              </View>

              <View>
                 <View className="flex-row justify-between mb-2">
                    <Text className="text-white/60 text-[10px] font-bold uppercase">Milo 400g</Text>
                    <Text className="text-orange-400 text-[10px] font-bold">12.5 days / restock</Text>
                 </View>
                 <View className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <View className="h-full bg-orange-500 rounded-full w-[30%]" />
                 </View>
              </View>
           </View>
        </View>

        {/* Insight Card */}
        <View className="bg-emerald-50 mx-4 p-4 rounded-2xl border border-emerald-100 flex-row items-start mb-10">
           <Info size={20} color="#059669" style={{ marginTop: 2 }} />
           <View className="ml-3 flex-1">
              <Text className="text-emerald-900 font-bold text-sm mb-1">AI Recommendation</Text>
              <Text className="text-emerald-800 text-[10px] leading-5">
                Your <Text className="font-bold">Indomie 70g</Text> velocity is 2x faster than the average. We recommend increasing your next restock order by <Text className="font-bold">30%</Text> to avoid stockouts.
              </Text>
           </View>
        </View>
      </ScrollView>

      {/* Footer Info */}
      <View className="p-6 items-center">
         <Text className="text-gray-400 text-[10px] text-center">Sales velocity directly contributes to <Text className="font-bold text-gray-500">35%</Text> of your total trust score.</Text>
      </View>
    </SafeAreaView>
  );
};

export default SalesVelocityScreen;
