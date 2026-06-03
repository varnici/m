import React from 'react';
import { View, Text, ScrollView, StatusBar, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RootStackScreenProps } from '@/navigation/types';
import { ChevronLeft, Info, TrendingUp, Sliders, Shield } from 'lucide-react-native';
import { colors } from '@/theme/colors';
import ScreenHeader from '@/components/ui/ScreenHeader';

const CreditDashboardScreen = ({
  navigation,
}: RootStackScreenProps<'CreditDashboard'>) => {
  const drivers = [
    { name: 'Sales Velocity', weight: '35%', status: 'Strong', color: '#10B981', value: 85 },
    { name: 'Repayment Consistency', weight: '30%', status: 'Perfect', color: '#10B981', value: 100 },
    { name: 'Category Risk', weight: '20%', status: 'Moderate', color: '#F59E0B', value: 55 },
    { name: 'Income Stability', weight: '15%', status: 'Verified', color: '#3B82F6', value: 90 },
  ];

  return (
    <SafeAreaView className="flex-1 bg-background-page">
      <StatusBar barStyle="light-content" />
      
      <ScreenHeader
        title="Score Breakdown"
        navigation={navigation}
      />

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Main Score Card */}
        <TouchableOpacity 
          className="bg-white rounded-2xl mx-4 p-6 mt-6 border border-gray-100 shadow-sm active:opacity-80"
          onPress={() => navigation.navigate('CreditBreakdown')}
        >
           <View className="flex-row justify-between items-baseline mb-6">
              <Text className="text-gray-900 font-bold text-base">What drives your 742</Text>
              <Text className="text-emerald-600 text-3xl font-black">742</Text>
           </View>

           {/* Segmented Progress Bar */}
           <View className="h-2.5 rounded-full flex-row overflow-hidden mb-6">
              <View className="bg-emerald-500 h-full" style={{ width: '35%' }} />
              <View className="bg-emerald-400 h-full" style={{ width: '30%' }} />
              <View className="bg-orange-400 h-full" style={{ width: '20%' }} />
              <View className="bg-blue-400 h-full" style={{ width: '15%' }} />
           </View>

           {/* Legend */}
           <View className="flex-row flex-wrap gap-x-4 gap-y-2">
              {drivers.map((d, i) => (
                 <View key={i} className="flex-row items-center">
                    <View className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: d.color }} />
                    <Text className="text-gray-400 text-[10px] uppercase font-bold tracking-tighter">
                       {d.weight} {d.name.split(' ')[0]}
                    </Text>
                 </View>
              ))}
           </View>
        </TouchableOpacity>

        {/* Drivers List */}
        <View className="px-4 mt-8 mb-10">
           <Text className="text-gray-900 font-bold text-lg mb-4">Driving Factors</Text>
           <View className="gap-4">
              {drivers.map((driver, idx) => (
                 <TouchableOpacity 
                   key={idx} 
                   className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm"
                   onPress={() => {
                     if (driver.name === 'Sales Velocity') navigation.navigate('SalesVelocity');
                   }}
                   activeOpacity={driver.name === 'Sales Velocity' ? 0.7 : 1}
                 >
                    <View className="flex-row items-center justify-between mb-4">
                       <View className="flex-row items-center">
                          <View className="w-10 h-10 rounded-full bg-slate-50 items-center justify-center mr-3">
                             <Shield size={20} color={driver.color} />
                          </View>
                          <View>
                             <Text className="text-gray-900 font-bold text-sm">{driver.name}</Text>
                             <View className="bg-emerald-50 px-1.5 py-0.5 rounded mt-0.5 inline-block self-start">
                                <Text className="text-emerald-600 text-[10px] font-bold">{driver.status}</Text>
                             </View>
                          </View>
                       </View>
                       <View className="items-end">
                          <Text className="text-gray-900 font-bold text-sm">{driver.weight}</Text>
                          <Text className="text-gray-400 text-[10px] uppercase font-bold tracking-widest">weight</Text>
                       </View>
                    </View>
                    
                    {/* Tiny Progress Bar for driver */}
                    <View className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                       <View className="h-full rounded-full" style={{ width: `${driver.value}%`, backgroundColor: driver.color }} />
                    </View>
                 </TouchableOpacity>
              ))}
           </View>
        </View>

        {/* Simulator Call to Action */}
        <TouchableOpacity className="mx-4 mb-10 bg-slate-900 rounded-2xl p-5 flex-row items-center">
            <View className="w-12 h-12 bg-white/10 rounded-xl items-center justify-center mr-4">
               <Sliders size={24} color="white" />
            </View>
            <View className="flex-1">
               <Text className="text-white font-bold text-base">Credit Simulator</Text>
               <Text className="text-white/60 text-xs mt-1">See how small changes affect your score</Text>
            </View>
            <ChevronLeft size={20} color="white" opacity={0.5} style={{ transform: [{ rotate: '180deg'}] }} />
        </TouchableOpacity>
        <View className="h-20" />
      </ScrollView>
    </SafeAreaView>
  );
};

export default CreditDashboardScreen;
