import React, { useState } from 'react';
import { View, Text, ScrollView, StatusBar, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RootStackScreenProps } from '@/navigation/types';
import { ChevronLeft, Landmark, User, Zap, ChevronRight, Info } from 'lucide-react-native';
import { colors } from '@/theme/colors';

const WithdrawalScreen = ({
  navigation,
}: RootStackScreenProps<'Withdrawal'>) => {
  const [amount, setAmount] = useState('25000');
  const [method, setMethod] = useState('bank');

  return (
    <SafeAreaView className="flex-1 bg-background-page">
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View className="bg-ventureroot-green pt-12 pb-6 px-4">
        <View className="flex-row items-center mb-4">
           <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3">
              <ChevronLeft color="white" size={24} />
           </TouchableOpacity>
           <Text className="text-white text-xl font-bold">Withdraw Funds</Text>
        </View>
      </View>

      <ScrollView className="flex-1 p-4" showsVerticalScrollIndicator={false}>
         {/* Amount Input */}
         <View className="mb-8 items-center pt-6">
            <Text className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-4">Enter Amount</Text>
            <View className="flex-row items-center">
               <Text className="text-gray-400 text-2xl font-black mr-2">₦</Text>
               <TextInput
                 className="text-gray-900 text-5xl font-black min-w-[100px] text-center"
                 value={amount}
                 onChangeText={setAmount}
                 keyboardType="numeric"
               />
            </View>
            <View className="mt-4 bg-gray-100 px-4 py-1 rounded-full">
               <Text className="text-gray-500 text-[10px] font-bold">Max: ₦45,200 (Total Balance)</Text>
            </View>
         </View>

         {/* Withdrawal Method Selection */}
         <View className="mb-8">
            <Text className="text-gray-500 text-xs font-bold uppercase mb-3 ml-1">Destination</Text>
            
            <View className="gap-3">
               <TouchableOpacity 
                 onPress={() => setMethod('bank')}
                 className={`p-5 rounded-3xl border flex-row items-center ${method === 'bank' ? 'bg-emerald-50 border-emerald-500' : 'bg-white border-gray-100'}`}
               >
                  <View className="w-12 h-12 bg-white rounded-2xl items-center justify-center border border-gray-100 shadow-sm mr-4">
                     <Landmark size={24} color="#10B981" />
                  </View>
                  <View className="flex-1">
                     <Text className="text-gray-900 font-bold text-sm">Commercial Bank</Text>
                     <Text className="text-gray-500 text-[10px]">Access Bank · ****8291</Text>
                  </View>
                  <View className={`w-5 h-5 rounded-full border-2 items-center justify-center ${method === 'bank' ? 'border-emerald-500' : 'border-gray-200'}`}>
                     {method === 'bank' && <View className="w-2.5 h-2.5 rounded-full bg-emerald-500" />}
                  </View>
               </TouchableOpacity>

               <TouchableOpacity 
                 onPress={() => setMethod('agent')}
                 className={`p-5 rounded-3xl border flex-row items-center ${method === 'agent' ? 'bg-emerald-50 border-emerald-500' : 'bg-white border-gray-100'}`}
               >
                  <View className="w-12 h-12 bg-white rounded-2xl items-center justify-center border border-gray-100 shadow-sm mr-4">
                     <User size={24} color="#3B82F6" />
                  </View>
                  <View className="flex-1">
                     <Text className="text-gray-900 font-bold text-sm">VentureRoot Agent</Text>
                     <Text className="text-gray-500 text-[10px]">Cash out at nearby shop (Oyingbo)</Text>
                  </View>
                  <View className={`w-5 h-5 rounded-full border-2 items-center justify-center ${method === 'agent' ? 'border-emerald-500' : 'border-gray-200'}`}>
                     {method === 'agent' && <View className="w-2.5 h-2.5 rounded-full bg-emerald-500" />}
                  </View>
               </TouchableOpacity>
            </View>
         </View>

         {/* Summary Info */}
         <View className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm mb-10">
            <View className="flex-row justify-between mb-4">
               <Text className="text-gray-400 text-xs">Processing Fee</Text>
               <Text className="text-gray-900 font-bold text-xs">₦100.00</Text>
            </View>
            <View className="flex-row justify-between pt-4 border-t border-gray-50">
               <Text className="text-gray-900 font-bold text-sm">Total Settlement</Text>
               <Text className="text-gray-900 font-black text-sm">₦{(parseInt(amount) || 0) + 100}</Text>
            </View>
         </View>

         {/* Confirm CTA */}
         <TouchableOpacity 
           className="bg-ventureroot-green py-4 rounded-xl items-center shadow-lg mb-4"
           onPress={() => navigation.navigate('Wallet')}
         >
            <Text className="text-white font-bold text-base">Confirm Withdrawal →</Text>
         </TouchableOpacity>

         <View className="flex-row items-center justify-center mb-10">
            <Zap size={14} color="#10B981" />
            <Text className="text-gray-400 text-[8px] font-bold ml-1 uppercase">Instant settlement usually within 5 mins</Text>
         </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default WithdrawalScreen;
