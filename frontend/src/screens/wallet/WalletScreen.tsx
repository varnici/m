import React from 'react';
import { View, Text, ScrollView, StatusBar, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RootStackScreenProps } from '@/navigation/types';
import { ArrowUpCircle, Send, ArrowDownCircle, AlertCircle, ChevronRight, ChevronLeft } from 'lucide-react-native';
import { colors } from '@/theme/colors';
import ActivityItem from '@/components/ui/ActivityItem';
import BottomTabBar from '@/components/ui/BottomTabBar';

import { useAuth } from '@/context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { walletService } from '@/services/walletService';

const WalletScreen = ({ navigation }: RootStackScreenProps<'Wallet'>) => {
  const { user } = useAuth();

  const { data: wallet, isLoading } = useQuery({
    queryKey: ['wallet', user?.id],
    queryFn: () => walletService.getWalletDetails(user!.id),
    enabled: !!user?.id,
  });

  if (isLoading) {
    return (
      <View className="flex-1 bg-background-page items-center justify-center">
        <Text className="text-ventureroot-green font-bold">Loading wallet...</Text>
      </View>
    );
  }

  // Fallback data
  const walletData = wallet || {
    balance_kobo: 0,
    account_number: 'VR-W-XXXXX',
    recent_transactions: []
  };
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
           <Text className="text-white/70 text-[10px] font-mono">{walletData.account_number}</Text>
        </View>

        <Text className="text-white text-center text-4xl font-black mb-8">₦{(walletData.balance_kobo / 100).toLocaleString()}</Text>

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
             {walletData.recent_transactions.map((item, index) => (
                <ActivityItem
                  key={index}
                  title={item.description}
                  subtitle={new Date(item.created_at).toLocaleDateString()}
                  amount={item.amount_kobo / 100}
                  type={item.type === 'sale' || item.type === 'deposit' || item.type === 'loan' ? 'credit' : 'debit'}
                  icon={
                    <View className={`w-10 h-10 rounded-full items-center justify-center ${
                      item.type === 'sale' ? 'bg-emerald-50' : 
                      item.type === 'loan' ? 'bg-orange-50' : 
                      'bg-blue-50'
                    }`}>
                      <Text>{item.type === 'sale' ? '💚' : item.type === 'loan' ? '💰' : '🔄'}</Text>
                    </View>
                  }
                />
             ))}
           </View>
        </View>
      </ScrollView>

      <BottomTabBar navigation={navigation} activeRoute="Wallet" />
    </SafeAreaView>
  );
};

export default WalletScreen;
