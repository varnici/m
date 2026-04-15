import React from 'react';
import { View, Text, ScrollView, SafeAreaView, StatusBar, TouchableOpacity } from 'react-native';
import type { RootStackScreenProps } from '@/navigation/types';
import { ChevronLeft, FileText, CheckCircle2, Shield } from 'lucide-react-native';
import { colors } from '@/theme/colors';

const ContractViewerScreen = ({
  navigation,
}: RootStackScreenProps<'ContractViewer'>) => {
  return (
    <SafeAreaView className="flex-1 bg-background-page">
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View className="bg-ventureroot-green pt-12 pb-6 px-4">
        <View className="flex-row items-center mb-4">
           <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3">
              <ChevronLeft color="white" size={24} />
           </TouchableOpacity>
           <Text className="text-white text-xl font-bold">Loan Agreement</Text>
        </View>
      </View>

      <ScrollView className="flex-1 p-4" showsVerticalScrollIndicator={false}>
        {/* Document Header */}
        <View className="bg-white rounded-t-3xl p-6 border-b border-gray-100 items-center">
           <View className="w-16 h-16 bg-emerald-50 rounded-2xl items-center justify-center mb-4">
              <FileText size={32} color="#10B981" />
           </View>
           <Text className="text-gray-900 font-bold text-lg">Indomie Stock Finance</Text>
           <Text className="text-gray-400 text-xs mt-1">Ref ID: VR-LOAN-2024-88A</Text>
        </View>

        {/* Terms Content */}
        <View className="bg-white p-6 border-b border-gray-100">
           <Text className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-4">Key Terms</Text>
           
           <View className="gap-4">
              <View className="flex-row justify-between">
                 <Text className="text-gray-500 text-xs">Principal Amount</Text>
                 <Text className="text-gray-900 font-bold text-xs">₦120,000</Text>
              </View>
              <View className="flex-row justify-between">
                 <Text className="text-gray-500 text-xs">Interest Rate</Text>
                 <Text className="text-gray-900 font-bold text-xs">2.5% (₦3,000)</Text>
              </View>
              <View className="flex-row justify-between">
                 <Text className="text-gray-500 text-xs">Duration</Text>
                 <Text className="text-gray-900 font-bold text-xs">30 Days</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-gray-500 text-xs">Repayment Date</Text>
                <Text className="text-gray-900 font-bold text-xs">Jan 12, 2025</Text>
              </View>
           </View>
        </View>

        {/* Legal Text */}
        <View className="bg-white p-6 border-b border-gray-100">
           <Text className="text-gray-900 font-bold text-sm mb-3">Terms & Conditions</Text>
           <Text className="text-gray-400 text-[10px] leading-5 text-justify">
             By accepting this agreement, the borrower agrees to the repayment of the principal plus interest by the specified date. 
             VentureRoot reserves the right to automatically deduct repayment from the linked wallet. 
             Failure to repay will result in a trust score reduction and may affect future credit eligibility. 
             This loan is insured against fire and theft of stock.
           </Text>
        </View>

        {/* Signature Area */}
        <View className="bg-white rounded-b-3xl p-6 mb-8">
           <Text className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-4">E-Signature</Text>
           <View className="h-24 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 items-center justify-center">
              <Text className="text-gray-300 font-medium text-xs italic">Digital fingerprint seal applied</Text>
           </View>
           <View className="flex-row items-center mt-4">
              <Shield size={14} color="#10B981" />
              <Text className="text-emerald-600 text-[10px] font-bold ml-1 uppercase">BVN Verified Identity</Text>
           </View>
        </View>

        {/* Actions */}
        <TouchableOpacity 
          className="bg-ventureroot-green py-4 rounded-xl items-center shadow-lg mb-4"
          onPress={() => navigation.navigate('LoanDashboard')}
        >
           <Text className="text-white font-bold text-base">Accept & Disburse ₦120,000</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          className="py-2 items-center mb-10"
          onPress={() => navigation.goBack()}
        >
           <Text className="text-gray-400 font-bold text-sm">Decline</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ContractViewerScreen;
