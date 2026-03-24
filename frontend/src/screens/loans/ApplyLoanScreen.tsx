import React, { useState } from 'react';
import { View, Text, ScrollView, SafeAreaView, StatusBar, TouchableOpacity, TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft, Info, Landmark, ShieldCheck } from 'lucide-react-native';
import { colors } from '@/theme/colors';

const ApplyLoanScreen = () => {
  const navigation = useNavigation<any>();
  const [amount, setAmount] = useState('120000');
  const [purpose, setPurpose] = useState('Inventory Restock');

  const presets = ['50,000', '120,000', '250,000', '500,000'];

  return (
    <SafeAreaView className="flex-1 bg-background-page">
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View className="bg-ventureroot-green pt-12 pb-6 px-4">
        <View className="flex-row items-center mb-4">
           <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3">
              <ChevronLeft color="white" size={24} />
           </TouchableOpacity>
           <Text className="text-white text-xl font-bold">Apply for Loan</Text>
        </View>
      </View>

      <ScrollView className="flex-1 p-4" showsVerticalScrollIndicator={false}>
        {/* Loan Limit Info */}
        <View className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex-row items-center mb-6">
           <View className="w-10 h-10 bg-emerald-100 rounded-full items-center justify-center mr-3">
              <Landmark size={20} color="#059669" />
           </View>
           <View className="flex-1">
              <Text className="text-emerald-900 font-bold text-sm">Max Limit: ₦250,000</Text>
              <Text className="text-emerald-800 text-[10px]">Based on your Gold tier trust score (742)</Text>
           </View>
        </View>

        {/* Input Section */}
        <View className="mb-8">
           <Text className="text-gray-500 text-xs font-bold uppercase mb-3 ml-1">How much do you need?</Text>
           <View className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm items-center">
              <View className="flex-row items-baseline mb-6">
                 <Text className="text-gray-400 text-2xl font-bold mr-2">₦</Text>
                 <TextInput
                   className="text-gray-900 text-4xl font-black min-w-[150px] text-center"
                   value={amount}
                   onChangeText={setAmount}
                   keyboardType="numeric"
                 />
              </View>
              
              <View className="flex-row flex-wrap justify-center gap-2">
                 {presets.map((p) => (
                    <TouchableOpacity 
                      key={p} 
                      onPress={() => setAmount(p.replace(/,/g, ''))}
                      className={`px-4 py-2 rounded-full border ${amount === p.replace(/,/g, '') ? 'bg-ventureroot-green border-ventureroot-green' : 'bg-gray-50 border-gray-100'}`}
                    >
                       <Text className={`text-xs font-bold ${amount === p.replace(/,/g, '') ? 'text-white' : 'text-gray-500'}`}>₦{p}</Text>
                    </TouchableOpacity>
                 ))}
              </View>
           </View>
        </View>

        {/* Purpose */}
        <View className="mb-8">
           <Text className="text-gray-500 text-xs font-bold uppercase mb-3 ml-1">Loan Purpose</Text>
           <View className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
              <TextInput
                className="text-gray-900 font-medium py-1"
                placeholder="What is this loan for?"
                value={purpose}
                onChangeText={setPurpose}
              />
           </View>
        </View>

        {/* Estimated Repayment */}
        <View className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm mb-10">
           <Text className="text-gray-900 font-bold text-base mb-4">Estimated Repayment</Text>
           <View className="gap-3">
              <View className="flex-row justify-between">
                 <Text className="text-gray-400 text-xs">Interest Rate (30 days)</Text>
                 <Text className="text-emerald-600 font-bold text-xs">2.5%</Text>
              </View>
              <View className="flex-row justify-between">
                 <Text className="text-gray-400 text-xs">Insurance Fee</Text>
                 <Text className="text-gray-900 font-bold text-xs">₦1,200</Text>
              </View>
              <View className="flex-row justify-between pt-3 border-t border-gray-50">
                 <Text className="text-gray-900 font-bold text-sm">Total Repayment</Text>
                 <Text className="text-gray-900 font-black text-sm">₦{(parseInt(amount) || 0) + ((parseInt(amount) || 0) * 0.025) + 1200}</Text>
              </View>
           </View>
        </View>

        {/* Info Box */}
        <View className="flex-row items-center gap-2 px-2 mb-10">
           <ShieldCheck size={14} color="#10B981" />
           <Text className="text-gray-400 text-[10px]">Your credit score will increase upon successful repayment</Text>
        </View>

        {/* Submit */}
        <TouchableOpacity 
          className="bg-ventureroot-green py-4 rounded-xl items-center shadow-lg mb-10"
          onPress={() => navigation.navigate('ContractViewer')}
        >
           <Text className="text-white font-bold text-base">Review Contract →</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ApplyLoanScreen;
