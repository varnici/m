import React from 'react';
import { View, Text, ScrollView, StatusBar, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft, Plus, Sprout, TrendingUp, Info } from 'lucide-react-native';
import { colors } from '@/theme/colors';

const SavingsGoalsScreen = () => {
  const navigation = useNavigation<any>();

  const goals = [
    { title: 'New Delivery Bike', current: 240000, target: 450000, color: '#3B82F6', category: 'Equipment' },
    { title: 'Warehouse Rent Jan', current: 85000, target: 120000, color: '#10B981', category: 'Operations' },
    { title: 'Emergency Fund', current: 12000, target: 100000, color: '#F59E0B', category: 'Buffer' },
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
              <Text className="text-white text-xl font-bold">Savings Goals</Text>
           </View>
           <TouchableOpacity className="bg-white/20 p-2 rounded-full">
              <Plus size={20} color="white" />
           </TouchableOpacity>
        </View>

        <View className="bg-white/10 p-4 rounded-2xl flex-row items-center mt-2 border border-white/10">
           <Sprout size={24} color="#A7F3D0" />
           <View className="ml-4">
              <Text className="text-white/60 text-[8px] font-bold uppercase tracking-widest">Total Savings</Text>
              <Text className="text-white text-2xl font-black">₦337,000</Text>
           </View>
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
         {/* Introduction */}
         <View className="p-4 pt-6">
            <Text className="text-gray-900 font-bold text-lg mb-1">Active Targets</Text>
            <Text className="text-gray-400 text-xs">Reach your business milestones faster.</Text>
         </View>

         {/* Goals List */}
         <View className="px-4 pb-10">
            {goals.map((goal, idx) => {
               const progress = (goal.current / goal.target) * 100;
               return (
                  <View key={idx} className="bg-white rounded-3xl p-6 mb-4 border border-gray-100 shadow-sm">
                     <View className="flex-row justify-between items-start mb-6">
                        <View>
                           <View className="bg-slate-50 px-2 py-0.5 rounded-md self-start mb-2">
                              <Text className="text-gray-400 text-[8px] font-bold uppercase">{goal.category}</Text>
                           </View>
                           <Text className="text-gray-900 font-bold text-lg">{goal.title}</Text>
                        </View>
                        <View className="bg-emerald-50 px-3 py-1.5 rounded-xl">
                           <Text className="text-emerald-700 font-black text-xs">{progress.toFixed(0)}%</Text>
                        </View>
                     </View>

                     <View className="h-2.5 bg-gray-100 rounded-full mb-4 overflow-hidden">
                        <View 
                          className="h-full rounded-full" 
                          style={{ width: `${progress}%`, backgroundColor: goal.color }} 
                        />
                     </View>

                     <View className="flex-row justify-between items-end">
                        <View>
                           <Text className="text-gray-400 text-[8px] font-bold uppercase">Current Savings</Text>
                           <Text className="text-gray-900 font-bold text-base">₦{goal.current.toLocaleString()}</Text>
                        </View>
                        <View className="items-end">
                           <Text className="text-gray-400 text-[8px] font-bold uppercase">Target</Text>
                           <Text className="text-gray-400 font-bold text-sm">₦{goal.target.toLocaleString()}</Text>
                        </View>
                     </View>

                     <TouchableOpacity className="mt-6 pt-4 border-t border-gray-50 flex-row items-center justify-center">
                        <TrendingUp size={14} color="#10B981" />
                        <Text className="text-ventureroot-green font-bold text-xs ml-2">Add Savings</Text>
                     </TouchableOpacity>
                  </View>
               );
            })}
         </View>

         {/* Tip Box */}
         <View className="mx-4 mb-20 bg-blue-50 p-4 rounded-2xl border border-blue-100 flex-row">
            <Info size={20} color="#3B82F6" className="mt-0.5 mr-3" />
            <Text className="text-blue-900 text-[10px] leading-4 flex-1">
               <Text className="font-bold">Pro-tip:</Text> Setting up <Text className="font-bold text-blue-700">Auto-Save Schedule</Text> can help you reach your Warehouse Rent goal 12 days earlier based on your current sales velocity.
            </Text>
         </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default SavingsGoalsScreen;
