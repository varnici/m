import React from 'react';
import { View, Text, ScrollView, StatusBar, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft, ShieldCheck } from 'lucide-react-native';

const ActiveLoanScreen = () => {
  const navigation = useNavigation<any>();

  const activeLoans = [
    {
      id: 1,
      icon: '🌽',
      title: 'Dangote Flour 50kg',
      details: '50 units • ₦120,000',
      status: 'Active',
      repaidPercent: 60,
      nextDate: 'Dec 25',
    },
    {
      id: 2,
      icon: '🥛',
      title: 'Peak Milk 40-pack',
      details: '20 units • ₦35,000',
      status: 'Active',
      repaidPercent: 20,
      nextDate: 'Dec 28',
    },
  ];

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
             {/* Profile placeholder if needed based on design, otherwise basic circle */}
             <View className="w-full h-full rounded-full bg-white" />
           </View>
           <Text className="text-white text-xl font-bold">Active Loans</Text>
        </View>
      </View>

      <ScrollView className="flex-1 px-4 pt-6" showsVerticalScrollIndicator={false}>
        {activeLoans.map((loan) => (
          <View key={loan.id} className="bg-white rounded-2xl p-5 mb-5 shadow-sm border border-gray-100">
            <View className="flex-row items-start justify-between mb-4">
              <View className="flex-row items-center">
                <View className="w-12 h-12 bg-amber-50 rounded-xl items-center justify-center mr-3">
                  <Text className="text-2xl">{loan.icon}</Text>
                </View>
                <View>
                  <Text className="text-gray-900 font-bold text-base">{loan.title}</Text>
                  <Text className="text-gray-500 text-[10px] mt-0.5 font-medium">{loan.details}</Text>
                </View>
              </View>
              <View className="items-end">
                <Text className="text-emerald-500 font-bold text-xs">{loan.status}</Text>
                <View className="flex-row items-center mt-1 bg-emerald-50 px-1.5 py-0.5 rounded">
                  <ShieldCheck size={10} color="#10B981" />
                  <Text className="text-emerald-600 text-[8px] ml-1 font-bold">Insured</Text>
                </View>
              </View>
            </View>

            {/* Repayment Progress Info */}
            <View className="flex-row justify-between mb-2">
              <Text className="text-gray-400 text-[10px] font-medium">{loan.repaidPercent}% repaid</Text>
              <Text className="text-gray-400 text-[10px] font-medium">Next: {loan.nextDate}</Text>
            </View>

            {/* Progress Bar */}
            <View className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-6">
              <View 
                className="h-full bg-ventureroot-green rounded-full" 
                style={{ width: `${loan.repaidPercent}%` }} 
              />
            </View>

            {/* Actions */}
            <View className="flex-row items-center justify-between">
              <TouchableOpacity 
                className="bg-ventureroot-green py-3 px-6 rounded-lg flex-1 mr-3 items-center justify-center"
                onPress={() => navigation.navigate('Repayment')}
                accessible={true}
                accessibilityLabel="Make Repayment"
              >
                <Text className="text-white font-bold text-sm">Make Repayment</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                className="py-3 px-6 rounded-lg border border-ventureroot-green items-center justify-center"
                onPress={() => navigation.navigate('ContractViewer')}
                accessible={true}
                accessibilityLabel="View Contract"
              >
                <Text className="text-ventureroot-green font-bold text-sm">Contract</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
        <View className="h-10" />
      </ScrollView>
    </SafeAreaView>
  );
};

export default ActiveLoanScreen;
