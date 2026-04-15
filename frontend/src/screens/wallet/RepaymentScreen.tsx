import React, { useState } from 'react';
import { View, Text, ScrollView, SafeAreaView, StatusBar, TouchableOpacity } from 'react-native';
import type { RootStackScreenProps } from '@/navigation/types';
import { ChevronLeft, Wallet, Landmark, CheckCircle2 } from 'lucide-react-native';
import { colors } from '@/theme/colors';

const RepaymentScreen = ({
  navigation,
}: RootStackScreenProps<'Repayment'>) => {
  const [paymentSource, setPaymentSource] = useState('wallet');

  return (
    <SafeAreaView className="flex-1 bg-background-page">
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View className="bg-ventureroot-green pt-12 pb-6 px-4">
        <View className="flex-row items-center mb-4">
           <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3">
              <ChevronLeft color="white" size={24} />
           </TouchableOpacity>
           <Text className="text-white text-xl font-bold">Loan Repayment</Text>
        </View>
      </View>

      <ScrollView className="flex-1 p-4" showsVerticalScrollIndicator={false}>
        {/* Loan Balance Card */}
        <View className="bg-white rounded-3xl p-8 items-center mb-8 border border-gray-100 shadow-sm">
           <Text className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-2">Total Outstanding</Text>
           <Text className="text-gray-900 text-4xl font-black mb-4">₦18,000.00</Text>
           <View className="bg-orange-50 px-3 py-1 rounded-full">
              <Text className="text-orange-600 font-bold text-[10px]">Upcoming sweep: Dec 25</Text>
           </View>
        </View>

        {/* Payment Methods */}
        <View className="mb-8">
           <Text className="text-gray-500 text-xs font-bold uppercase mb-4 ml-1">Repayment Source</Text>
           
           <TouchableOpacity 
             onPress={() => setPaymentSource('wallet')}
             className={`bg-white rounded-2xl p-4 border mb-4 flex-row items-center ${paymentSource === 'wallet' ? 'border-ventureroot-green bg-emerald-50/20' : 'border-gray-100'}`}
           >
              <View className={`w-12 h-12 rounded-xl items-center justify-center ${paymentSource === 'wallet' ? 'bg-ventureroot-green' : 'bg-gray-100'}`}>
                 <Wallet size={24} color={paymentSource === 'wallet' ? 'white' : '#9CA3AF'} />
              </View>
              <View className="flex-1 ml-4">
                 <Text className="text-gray-900 font-bold text-sm">VR Wallet Balance</Text>
                 <Text className="text-gray-400 text-xs">Balance: ₦45,200</Text>
              </View>
              {paymentSource === 'wallet' && <CheckCircle2 size={24} color="#10B981" />}
           </TouchableOpacity>

           <TouchableOpacity 
             onPress={() => setPaymentSource('bank')}
             className={`bg-white rounded-2xl p-4 border flex-row items-center ${paymentSource === 'bank' ? 'border-ventureroot-green bg-emerald-50/20' : 'border-gray-100'}`}
           >
              <View className={`w-12 h-12 rounded-xl items-center justify-center ${paymentSource === 'bank' ? 'bg-ventureroot-green' : 'bg-gray-100'}`}>
                 <Landmark size={24} color={paymentSource === 'bank' ? 'white' : '#9CA3AF'} />
              </View>
              <View className="flex-1 ml-4">
                 <Text className="text-gray-900 font-bold text-sm">Bank Transfer / USSD</Text>
                 <Text className="text-gray-400 text-xs">Direct from your GTBank account</Text>
              </View>
              {paymentSource === 'bank' && <CheckCircle2 size={24} color="#10B981" />}
           </TouchableOpacity>
        </View>

        {/* Repayment Summary */}
        <View className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm mb-10">
           <Text className="text-gray-900 font-bold text-base mb-4">Summary</Text>
           <View className="gap-3">
              <View className="flex-row justify-between">
                 <Text className="text-gray-400 text-xs">Repayment Amount</Text>
                 <Text className="text-gray-900 font-bold text-xs">₦18,000</Text>
              </View>
              <View className="flex-row justify-between">
                 <Text className="text-gray-400 text-xs">Processing Fee</Text>
                 <Text className="text-emerald-600 font-bold text-xs">FREE</Text>
              </View>
              <View className="flex-row justify-between pt-3 border-t border-gray-50">
                 <Text className="text-gray-900 font-bold text-sm">Total to Pay</Text>
                 <Text className="text-gray-900 font-black text-sm">₦18,000</Text>
              </View>
           </View>
        </View>

        {/* Actions */}
        <TouchableOpacity 
          className="bg-ventureroot-green py-4 rounded-xl items-center shadow-lg mb-10"
          onPress={() => navigation.navigate('Wallet')}
        >
           <Text className="text-white font-bold text-base">Make Repayment →</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default RepaymentScreen;
