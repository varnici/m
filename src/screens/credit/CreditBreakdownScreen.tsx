import React from 'react';
import { View, Text, ScrollView, SafeAreaView, StatusBar, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft } from 'lucide-react-native';

const CreditBreakdownScreen = () => {
  const navigation = useNavigation<any>();

  const scoreInfo = {
    score: 742,
    factors: [
      { id: 'sales', label: 'Sales', weight: 35, color: '#10B981', title: 'Sales Velocity', status: 'Strong', statusColor: 'text-emerald-500', statusBg: 'bg-emerald-50', barColor: 'bg-emerald-500' },
      { id: 'repayment', label: 'Repayment', weight: 30, color: '#0D9488', title: 'Repayment Consistency', status: 'Perfect', statusColor: 'text-teal-500', statusBg: 'bg-teal-50', barColor: 'bg-teal-500' },
      { id: 'category', label: 'Category', weight: 20, color: '#F59E0B', title: 'Category Risk', status: 'Moderate', statusColor: 'text-amber-500', statusBg: 'bg-amber-50', barColor: 'bg-amber-500' },
      { id: 'income', label: 'Income', weight: 15, color: '#3B82F6', title: 'Income Stability', status: 'Verified', statusColor: 'text-blue-500', statusBg: 'bg-blue-50', barColor: 'bg-blue-500' }
    ]
  };

  return (
    <SafeAreaView className="flex-1 bg-background-page">
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View className="bg-ventureroot-green pt-12 pb-6 px-4">
        <View className="flex-row items-center">
           <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3 p-2 -ml-2">
              <ChevronLeft color="white" size={24} />
           </TouchableOpacity>
           <View className="w-8 h-8 rounded-full bg-white mr-3 justify-center items-center">
             <View className="w-full h-full rounded-full bg-white" />
           </View>
           <Text className="text-white text-xl font-bold">Score Breakdown</Text>
        </View>
      </View>

      <ScrollView className="flex-1 px-4 pt-6" showsVerticalScrollIndicator={false}>
        {/* Main Overview Card */}
        <View className="bg-white rounded-2xl p-5 mb-5 shadow-sm border border-gray-100">
          <View className="flex-row justify-between items-end mb-4">
            <Text className="text-gray-900 font-bold text-base">What drives your {scoreInfo.score}</Text>
            <Text className="text-ventureroot-green font-bold text-2xl">{scoreInfo.score}</Text>
          </View>
          
          {/* Segmented Progress Bar */}
          <View className="flex-row h-3 rounded-full overflow-hidden mb-6">
            {scoreInfo.factors.map((factor, index) => (
              <View 
                key={factor.id} 
                style={{ width: `${factor.weight}%`, backgroundColor: factor.color }} 
              />
            ))}
          </View>

          {/* Legend */}
          <View className="flex-row flex-wrap mt-2">
            {scoreInfo.factors.map((factor) => (
              <View key={factor.id} className="w-1/2 flex-row items-center mb-3">
                <View className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: factor.color }} />
                <Text className="text-gray-500 text-xs font-medium">{factor.weight}% {factor.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Breakdown Cards */}
        {scoreInfo.factors.map((factor) => (
          <View key={factor.id} className="bg-white rounded-2xl p-5 mb-4 shadow-sm border border-gray-100 flex-row items-center">
             {/* Left Icon Dot */}
             <View className="w-10 h-10 rounded-full bg-gray-50 items-center justify-center mr-4">
               <View className="w-3 h-3 rounded-full" style={{ backgroundColor: factor.color }} />
             </View>
             
             {/* Central Info */}
             <View className="flex-1">
               <View className="flex-row items-center mb-1">
                 <Text className="text-gray-900 font-bold text-sm mr-2">{factor.title}</Text>
                 <View className={`px-2 py-0.5 rounded ${factor.statusBg}`}>
                   <Text className={`${factor.statusColor} font-bold text-[10px]`}>{factor.status}</Text>
                 </View>
               </View>
               <View className="h-1 bg-gray-100 rounded-full mt-2 overflow-hidden w-2/3">
                 <View className={`h-full rounded-full ${factor.barColor}`} style={{ width: `${factor.weight * 2}%` }} />
               </View>
             </View>

             {/* Right Weight */}
             <View className="items-end ml-2">
               <Text className="text-gray-900 font-bold text-lg">{factor.weight}%</Text>
               <Text className="text-gray-400 text-[10px] font-medium">weight</Text>
             </View>
          </View>
        ))}
        <View className="h-10" />
      </ScrollView>
    </SafeAreaView>
  );
};

export default CreditBreakdownScreen;
