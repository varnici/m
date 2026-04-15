import React from 'react';
import { View, Text, ScrollView, SafeAreaView, StatusBar, TouchableOpacity } from 'react-native';
import type { RootStackScreenProps } from '@/navigation/types';
import { ChevronLeft, PlusCircle, CheckCircle2, History, Info } from 'lucide-react-native';
import { colors } from '@/theme/colors';

const LoanDashboardScreen = ({
  navigation,
}: RootStackScreenProps<'LoanDashboard'>) => {
  return (
    <SafeAreaView className="flex-1 bg-background-page">
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View className="bg-ventureroot-green pt-12 pb-6 px-4">
        <View className="flex-row items-center mb-4">
           <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3">
              <ChevronLeft color="white" size={24} />
           </TouchableOpacity>
           <View>
              <Text className="text-white/70 text-xs font-medium uppercase tracking-wider">Your Loans</Text>
              <Text className="text-white text-2xl font-bold">Loan Centre</Text>
           </View>
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Available Credit Card */}
        <View className="bg-white rounded-2xl mx-4 p-5 mt-6 border border-gray-100 shadow-sm flex-row items-center">
           <View className="w-16 h-16 rounded-full border-4 border-emerald-500 items-center justify-center mr-4">
              <Text className="text-emerald-600 font-bold text-xs">65%</Text>
           </View>
           <View className="flex-1">
              <Text className="text-gray-400 text-xs font-medium">Available Credit</Text>
              <Text className="text-gray-900 text-2xl font-bold">₦250,000</Text>
              <Text className="text-gray-400 text-[10px] mt-1">₦130,000 in use · Gold tier limit</Text>
           </View>
        </View>

        {/* Active Loan Section */}
        <View className="px-4 mt-8">
           <View className="flex-row justify-between items-baseline mb-4">
              <Text className="text-gray-900 font-bold text-lg">Active Loan</Text>
           </View>

           <View className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <View className="flex-row items-start justify-between mb-4">
                 <View className="flex-row items-center">
                    <View className="w-12 h-12 bg-orange-50 rounded-xl items-center justify-center mr-3">
                       <Text className="text-2xl">🌾</Text>
                    </View>
                    <View>
                       <Text className="text-gray-900 font-bold text-base">Dangote Flour 50kg</Text>
                       <Text className="text-gray-400 text-xs text-[10px]">30 bags · ₦4,500/bag</Text>
                    </View>
                 </View>
                 <View className="items-end">
                    <Text className="text-emerald-500 font-bold text-xs">Active</Text>
                    <View className="flex-row items-center bg-gray-50 px-1.5 py-0.5 rounded mt-1">
                       <CheckCircle2 size={10} color="#10B981" />
                       <Text className="text-gray-500 text-[8px] ml-1 font-bold italic">Insured</Text>
                    </View>
                 </View>
              </View>
 
              <View className="flex-row justify-between items-end mb-2">
                 <Text className="text-gray-400 text-xs">Loan: <Text className="text-gray-900 font-bold">₦120,000</Text></Text>
                 <Text className="text-emerald-500 font-bold text-[10px]">60% repaid</Text>
              </View>
 
              {/* Progress Bar */}
              <View className="h-2 bg-gray-100 rounded-full overflow-hidden mb-6">
                 <View className="h-full bg-emerald-500 rounded-full w-[60%]" />
              </View>
 
              <View className="flex-row items-center justify-between border-t border-gray-50 pt-4">
                 <View>
                    <Text className="text-gray-400 text-[10px] uppercase font-bold tracking-wider">Next installment</Text>
                    <Text className="text-gray-900 font-bold text-base">₦18,000 · Dec 25</Text>
                 </View>
                 <TouchableOpacity 
                   className="bg-ventureroot-green px-6 py-2 rounded-lg"
                   onPress={() => navigation.navigate('Repayment')}
                 >
                    <Text className="text-white font-bold text-xs">Repay</Text>
                 </TouchableOpacity>
              </View>
           </View>
        </View>

        {/* Apply Button */}
        <TouchableOpacity 
          className="mx-4 mt-6 bg-ventureroot-green/10 py-4 rounded-xl flex-row items-center justify-center border border-ventureroot-green/20"
          onPress={() => navigation.navigate('ApplyLoan')}
        >
           <PlusCircle size={20} color="#004D2C" />
           <Text className="text-ventureroot-green font-bold text-base ml-2">Apply for New Loan</Text>
        </TouchableOpacity>

        {/* Loan History */}
        <View className="px-4 mt-8 mb-10">
           <Text className="text-gray-900 font-bold text-lg mb-4">Loan History</Text>
           <View className="bg-white rounded-2xl px-4 border border-gray-100 shadow-sm">
              {[
                { id: 1, title: 'Indomie Noodles', month: 'Nov 2024', amount: '₦45,000', status: 'Paid' },
                { id: 2, title: 'Peak Milk 40-pack', month: 'Oct 2024', amount: '₦28,000', status: 'Paid' },
              ].map((item, idx) => (
                <View key={idx} className={`flex-row justify-between py-4 ${idx === 0 ? 'border-b border-gray-50' : ''}`}>
                   <View>
                      <Text className="text-gray-900 font-bold text-sm">{item.title}</Text>
                      <Text className="text-gray-400 text-[10px] mt-0.5">{item.month}</Text>
                   </View>
                   <View className="items-end">
                      <Text className="text-gray-900 font-bold text-sm">{item.amount}</Text>
                      <View className="flex-row items-center mt-1">
                         <Text className="text-emerald-500 font-bold text-[10px] mr-1">{item.status}</Text>
                         {item.status === 'Paid' && <CheckCircle2 size={10} color="#10B981" />}
                      </View>
                   </View>
                </View>
              ))}
           </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default LoanDashboardScreen;
