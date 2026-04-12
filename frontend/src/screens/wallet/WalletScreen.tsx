import React from 'react';
import { View, Text, ScrollView, SafeAreaView, StatusBar, TouchableOpacity } from 'react-native';
import type { RootStackScreenProps } from '@/navigation/types';
import { ArrowUpCircle, Send, ArrowDownCircle, AlertCircle, ChevronRight, ChevronLeft } from 'lucide-react-native';
import { colors } from '@/theme/colors';
import ActivityItem from '@/components/ui/ActivityItem';

const ACTIVITY_ITEMS = [
  {
    title: 'Sale Proceeds',
    subtitle: 'Today, 2:34 PM',
    amount: 18400,
    type: 'credit',
    icon: <View className="w-10 h-10 rounded-full bg-emerald-50 items-center justify-center"><Text>💚</Text></View>,
  },
  {
    title: 'Repayment Sweep',
    subtitle: 'Dec 15, 9:00 AM',
    amount: 16000,
    type: 'debit',
    icon: <View className="w-10 h-10 rounded-full bg-blue-50 items-center justify-center"><Text>🔄</Text></View>,
  },
  {
    title: 'Loan Disbursed',
    subtitle: 'Dec 1',
    amount: 120000,
    type: 'loan',
    icon: <View className="w-10 h-10 rounded-full bg-orange-50 items-center justify-center"><Text>💰</Text></View>,
  },
  {
    title: 'Pool Contribution',
    subtitle: 'Nov 28',
    amount: 21150,
    type: 'debit',
    icon: <View className="w-10 h-10 rounded-full bg-amber-50 items-center justify-center"><Text>🤝</Text></View>,
  },
];

const WalletScreen = ({ navigation }: RootStackScreenProps<'Wallet'>) => {
  return (
    <SafeAreaView className="flex-1 bg-background-page">
      <StatusBar barStyle="light-content" />
      
      {/* Header Area */}
      <View className="bg-ventureroot-green pt-12 pb-8 px-4 rounded-b-[32px]">
        <View className="flex-row items-center justify-between mb-6">
           <TouchableOpacity onPress={() => navigation.goBack()}>
              <ChevronLeft color="white" size={24} />
           </TouchableOpacity>
           <Text className="text-white/70 text-xs font-medium">VentureRoot Wallet</Text>
           <Text className="text-white/70 text-[10px] font-mono">VR-W-00284</Text>
        </View>

        <Text className="text-white text-center text-4xl font-black mb-8">₦45,200.00</Text>

        <View className="flex-row justify-between px-6">
           {[
             { label: 'Add Money', icon: ArrowUpCircle },
             { label: 'Send', icon: Send },
             { label: 'Withdraw', icon: ArrowDownCircle },
           ].map((action, i) => (
              <TouchableOpacity key={i} className="items-center">
                 <View className="w-12 h-12 bg-white/20 rounded-xl items-center justify-center mb-2">
                    <action.icon size={24} color="white" />
                 </View>
                 <Text className="text-white text-[10px] font-bold">{action.label}</Text>
              </TouchableOpacity>
           ))}
        </View>
      </View>

      <ScrollView className="flex-1 px-4 pt-6" showsVerticalScrollIndicator={false}>
        {/* Upcoming Sweep */}
        <View className="bg-orange-50/50 border border-orange-100 rounded-2xl p-4 flex-row items-start mb-8">
           <AlertCircle size={20} color="#F59E0B" style={{ marginTop: 2 }} />
           <View className="ml-3 flex-1">
              <Text className="text-orange-900 font-bold text-sm mb-1">Upcoming Sweep</Text>
              <Text className="text-orange-800 text-xs leading-5">
                <Text className="font-bold">₦16,000</Text> auto-deducted Dec 25 for loan repayment
              </Text>
           </View>
        </View>

        {/* Transactions list */}
        <View className="mb-10">
           <View className="flex-row justify-between items-center mb-4">
              <Text className="text-gray-900 font-bold text-lg">Recent Transactions</Text>
              <TouchableOpacity>
                 <Text className="text-ventureroot-green text-xs font-bold">View All →</Text>
              </TouchableOpacity>
           </View>

           <View className="bg-white rounded-2xl px-4 border border-gray-100 shadow-sm">
             {ACTIVITY_ITEMS.map((item, index) => (
                <ActivityItem
                  key={index}
                  title={item.title}
                  subtitle={item.subtitle}
                  amount={item.amount}
                  type={item.type as any}
                  icon={item.icon}
                />
             ))}
           </View>
        </View>
      </ScrollView>

      {/* Footer Navigation Overlay (Simulated for consistency) */}
      <View className="absolute bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-100 flex-row items-center justify-around px-4">
         <TouchableOpacity onPress={() => navigation.navigate('Dashboard')} className="items-center">
            <Text className="text-gray-400 text-[10px]">Home</Text>
         </TouchableOpacity>
         <TouchableOpacity onPress={() => navigation.navigate('LoanDashboard')} className="items-center">
            <Text className="text-gray-400 text-[10px]">Loans</Text>
         </TouchableOpacity>
         <TouchableOpacity onPress={() => navigation.navigate('SalesDashboard')} className="items-center">
            <Text className="text-gray-400 text-[10px]">Sales</Text>
         </TouchableOpacity>
         <TouchableOpacity className="items-center">
            <Text className="text-ventureroot-green font-bold text-[10px]">Wallet</Text>
         </TouchableOpacity>
         <TouchableOpacity onPress={() => navigation.navigate('More')} className="items-center">
            <Text className="text-gray-400 text-[10px]">More</Text>
         </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default WalletScreen;
