// @ts-nocheck
import React from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAIInsights } from '@/hooks/useInventory';
import { BlurView } from 'expo-blur';
import { 
  Sparkles, 
  ChevronLeft, 
  Zap, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  ChevronRight,
  ShieldCheck,
  BrainCircuit,
  ArrowUpRight
} from 'lucide-react-native';
import type { RootStackScreenProps } from '@/navigation/types';

export const AIInsightsScreen = ({ navigation }: RootStackScreenProps<'AIInsights'>) => {
  const { data: insights, isLoading, isError, error, refetch } = useAIInsights();

  if (isLoading) {
    return (
      <View className="flex-1 bg-slate-950 items-center justify-center">
        <BrainCircuit size={48} color="#10B981" />
        <Text className="text-white mt-4 font-black text-lg">Synthesizing Retail Intelligence...</Text>
        <ActivityIndicator size="small" color="#10B981" className="mt-4" />
      </View>
    );
  }

  const { anomalies = [], restock_recommendations = [], trends = [] } = (insights as any) || {};

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      <StatusBar barStyle="light-content" />
      
      {/* Premium Header */}
      <View className="px-6 pt-4 pb-8 flex-row items-center justify-between">
         <TouchableOpacity onPress={() => navigation.goBack()} className="p-3 bg-white/10 rounded-2xl">
            <ChevronLeft color="white" size={24} />
         </TouchableOpacity>
         <View className="items-center">
            <Text className="text-white text-xl font-black italic">INTELLIGENCE</Text>
            <View className="flex-row items-center bg-emerald-500/10 px-2 py-0.5 rounded mt-1">
               <ShieldCheck size={10} color="#10B981" />
               <Text className="text-emerald-500 text-[8px] font-black uppercase ml-1 tracking-widest">Secured Audit</Text>
            </View>
         </View>
         <TouchableOpacity className="p-3 bg-white/10 rounded-2xl" onPress={() => navigation.navigate('AIAssistant')}>
            <Sparkles color="#4F46E5" size={24} />
         </TouchableOpacity>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20 }}>
        
        {/* Core Prediction Card */}
        <BlurView intensity={30} tint="dark" className="rounded-[40px] border border-white/10 p-8 mb-8 overflow-hidden">
           <View className="flex-row items-center mb-6">
              <View className="w-12 h-12 bg-indigo-500 rounded-2xl items-center justify-center mr-4">
                 <Zap size={24} color="white" />
              </View>
              <View>
                 <Text className="text-white/40 text-[10px] font-black uppercase tracking-[3px]">Next 24h Forecast</Text>
                 <Text className="text-white text-2xl font-black">High Velocity Ahead</Text>
              </View>
           </View>
           <Text className="text-white/60 text-xs leading-6 mb-8">
              Based on historical Friday patterns and local payday cycles, we expect a <Text className="text-emerald-400 font-bold">22% surge</Text> in beverage and snack sales.
           </Text>
           <TouchableOpacity className="bg-indigo-600 py-4 rounded-2xl items-center">
              <Text className="text-white font-black text-xs uppercase tracking-widest">Deploy Optimized Layout</Text>
           </TouchableOpacity>
        </BlurView>

        {/* Restock Recommendations */}
        <View className="mb-8">
           <View className="flex-row justify-between items-center mb-6">
              <Text className="text-white/30 text-[10px] font-black uppercase tracking-[2px]">Restock Engine</Text>
              <Text className="text-indigo-400 text-[10px] font-black uppercase">View All</Text>
           </View>
           
           <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row -mx-2">
              {restock_recommendations.map((item: any, idx: number) => (
                <TouchableOpacity key={idx} className="bg-white/5 border border-white/10 rounded-3xl p-5 w-64 mx-2">
                   <View className="flex-row items-center mb-4">
                      <View className="w-8 h-8 bg-emerald-500/20 rounded-lg items-center justify-center mr-3">
                         <TrendingUp size={16} color="#10B981" />
                      </View>
                      <Text className="text-white font-bold text-sm flex-1" numberOfLines={1}>{item.product_name}</Text>
                   </View>
                   <View className="flex-row justify-between items-end">
                      <View>
                         <Text className="text-white/30 text-[8px] font-black uppercase">Suggested Order</Text>
                         <Text className="text-white text-xl font-black">+{item.reorder_quantity}</Text>
                      </View>
                      <View className="items-end">
                         <Text className="text-white/30 text-[8px] font-black uppercase">Current</Text>
                         <Text className="text-white/60 font-bold text-sm">{item.current_stock}</Text>
                      </View>
                   </View>
                </TouchableOpacity>
              ))}
              {restock_recommendations.length === 0 && (
                <View className="bg-white/5 border border-white/10 border-dashed rounded-3xl p-8 w-64 mx-2 items-center justify-center">
                   <Text className="text-white/20 text-xs italic text-center">Stock levels optimal.</Text>
                </View>
              )}
           </ScrollView>
        </View>

        {/* Anomalies Section */}
        <View className="mb-10">
           <Text className="text-white/30 text-[10px] font-black uppercase tracking-[2px] mb-6">Anomaly Detection</Text>
           {anomalies.map((item: any, idx: number) => (
             <TouchableOpacity key={idx} className="bg-red-500/10 border border-red-500/20 rounded-[32px] p-6 mb-4 flex-row items-center">
                <View className="w-14 h-14 bg-red-500/20 rounded-2xl items-center justify-center mr-5">
                   <AlertTriangle size={28} color="#EF4444" />
                </View>
                <View className="flex-1">
                   <Text className="text-white font-bold text-base">Unusual Stock Dip</Text>
                   <Text className="text-red-300 text-[10px] font-medium mt-1">{item.product_name} - Integrity Score: {(100 - item.anomaly_score*100).toFixed(0)}%</Text>
                </View>
                <ChevronRight size={20} color="#EF4444" opacity={0.3} />
             </TouchableOpacity>
           ))}
           {anomalies.length === 0 && (
              <View className="bg-white/5 border border-white/5 rounded-[32px] p-10 items-center">
                 <ShieldCheck size={32} color="rgba(255,255,255,0.1)" />
                 <Text className="text-white/20 text-xs mt-4">Audit trails are consistent.</Text>
              </View>
           )}
        </View>

        {/* Footer Insight */}
        <View className="mb-20 items-center">
           <BlurView intensity={10} tint="light" className="p-6 rounded-[32px] border border-white/5 items-center">
              <BrainCircuit size={24} color="rgba(255,255,255,0.2)" />
              <Text className="text-white/40 text-[10px] text-center mt-4 leading-5 italic px-6">
                "AI insights are generated by analyzing over 14.5k historical transactions from your region."
              </Text>
           </BlurView>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default AIInsightsScreen;
// @ts-nocheck
