import React from 'react';
import { View, Text, ScrollView, StatusBar, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RootStackScreenProps } from '@/navigation/types';
import { ChevronLeft, PlusCircle, CheckCircle2, History, Info } from 'lucide-react-native';
import ScreenHeader from '@/components/ui/ScreenHeader';
import { colors } from '@/theme/colors';
import { useAuth } from '@/context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { loanService } from '@/services/walletService';

const LoanDashboardScreen = ({
  navigation,
}: RootStackScreenProps<'LoanDashboard'>) => {
  const { user } = useAuth();

  const {
    data,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['loanDashboard', user?.id],
    queryFn: () => loanService.getLoanDashboard(user!.id),
    enabled: !!user?.id,
    staleTime: 1000 * 10, // 10 seconds
  });

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background-page items-center justify-center">
        <ActivityIndicator size="large" color="#004D2C" />
        <Text className="text-ventureroot-green font-bold mt-4">Syncing loan status...</Text>
      </SafeAreaView>
    );
  }

  // Fallback default structure
  const availableCredit = (data?.available_credit ?? 0) / 100;
  const creditInUse = (data?.credit_in_use ?? 0) / 100;
  const activeLoans = data?.active_loans ?? [];
  const loanHistory = data?.loan_history ?? [];

  // Calculate percentage of available credit vs total tier limit
  const totalLimit = availableCredit + creditInUse;
  const creditAvailablePct = totalLimit > 0 ? Math.round((availableCredit / totalLimit) * 100) : 100;

  return (
    <SafeAreaView className="flex-1 bg-background-page">
      <StatusBar barStyle="light-content" />
      
      <ScreenHeader
        title="Loan Centre"
        subtitle="Your Loans"
        navigation={navigation}
        showBack={false}
      />

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Available Credit Card */}
        <View className="bg-white rounded-2xl mx-4 p-5 mt-6 border border-gray-100 shadow-sm flex-row items-center">
           <View className="w-16 h-16 rounded-full border-4 border-emerald-500 items-center justify-center mr-4">
              <Text className="text-emerald-600 font-bold text-xs">{creditAvailablePct}%</Text>
           </View>
           <View className="flex-1">
              <Text className="text-gray-400 text-xs font-medium">Available Credit</Text>
              <Text className="text-gray-900 text-2xl font-bold">₦{availableCredit.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</Text>
              <Text className="text-gray-400 text-[10px] mt-1">₦{creditInUse.toLocaleString('en-US')} in use · Gold tier limit</Text>
           </View>
        </View>

        {/* Active Loan Section */}
        <View className="px-4 mt-8">
           <View className="flex-row justify-between items-baseline mb-4">
              <Text className="text-gray-900 font-bold text-lg">Active Loans</Text>
           </View>

           {activeLoans.length === 0 ? (
             <View className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm items-center justify-center">
               <Text className="text-2xl mb-2">🌱</Text>
               <Text className="text-gray-950 font-bold text-sm text-center">No Active Loans</Text>
               <Text className="text-gray-400 text-xs text-center mt-1">Need inventory financing? Tap below to apply!</Text>
             </View>
           ) : (
             activeLoans.map((loan) => {
               const principal = loan.loan_amount / 100;
               const outstanding = loan.outstanding / 100;
               const repaid = principal - outstanding;
               const progressPct = principal > 0 ? Math.min(100, Math.max(0, Math.round((repaid / principal) * 100))) : 0;
               const formattedDueDate = loan.due_date ? new Date(loan.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '--';

               return (
                 <View key={loan.id} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm mb-4">
                    <View className="flex-row items-start justify-between mb-4">
                       <View className="flex-row items-center">
                          <View className="w-12 h-12 bg-orange-50 rounded-xl items-center justify-center mr-3">
                             <Text className="text-2xl">{loan.icon || '🌾'}</Text>
                          </View>
                          <View>
                             <Text className="text-gray-900 font-bold text-base">{loan.product_name}</Text>
                             <Text className="text-gray-400 text-xs text-[10px]">1 unit · ₦{principal.toLocaleString('en-US')}</Text>
                          </View>
                       </View>
                       <View className="items-end">
                          <Text className="text-emerald-500 font-bold text-xs capitalize">{loan.status}</Text>
                          {loan.insured && (
                            <View className="flex-row items-center bg-gray-50 px-1.5 py-0.5 rounded mt-1">
                               <CheckCircle2 size={10} color="#10B981" />
                               <Text className="text-gray-500 text-[8px] ml-1 font-bold italic">Insured</Text>
                            </View>
                          )}
                       </View>
                    </View>
       
                    <View className="flex-row justify-between items-end mb-2">
                       <Text className="text-gray-400 text-xs">Loan: <Text className="text-gray-900 font-bold">₦{principal.toLocaleString('en-US')}</Text></Text>
                       <Text className="text-emerald-500 font-bold text-[10px]">{progressPct}% repaid</Text>
                    </View>
       
                    {/* Progress Bar */}
                    <View className="h-2 bg-gray-100 rounded-full overflow-hidden mb-6">
                       <View className="h-full bg-emerald-500 rounded-full" style={{ width: `${progressPct}%` }} />
                    </View>
       
                    <View className="flex-row items-center justify-between border-t border-gray-50 pt-4">
                       <View>
                          <Text className="text-gray-400 text-[10px] uppercase font-bold tracking-wider">Next installment</Text>
                          <Text className="text-gray-900 font-bold text-base">₦{outstanding.toLocaleString('en-US')} · {formattedDueDate}</Text>
                       </View>
                       {loan.status === 'active' && (
                         <TouchableOpacity 
                           className="bg-ventureroot-green px-6 py-2 rounded-lg"
                           onPress={() => navigation.navigate('Repayment')}
                         >
                            <Text className="text-white font-bold text-xs">Repay</Text>
                         </TouchableOpacity>
                       )}
                    </View>
                 </View>
               );
             })
           )}
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
           {loanHistory.length === 0 ? (
             <View className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm items-center justify-center">
               <Text className="text-gray-400 text-xs">No previous loan records found.</Text>
             </View>
           ) : (
             <View className="bg-white rounded-2xl px-4 border border-gray-100 shadow-sm">
                {loanHistory.map((item, idx) => (
                  <View key={item.id} className={`flex-row justify-between py-4 ${idx < loanHistory.length - 1 ? 'border-b border-gray-50' : ''}`}>
                     <View>
                        <Text className="text-gray-900 font-bold text-sm">{item.product_name}</Text>
                        <Text className="text-gray-400 text-[10px] mt-0.5">{item.month}</Text>
                     </View>
                     <View className="items-end">
                        <Text className="text-gray-900 font-bold text-sm">₦{(item.amount / 100).toLocaleString('en-US')}</Text>
                        <View className="flex-row items-center mt-1">
                           <Text className="text-emerald-500 font-bold text-[10px] mr-1">{item.status}</Text>
                           {item.status === 'Paid' && <CheckCircle2 size={10} color="#10B981" />}
                        </View>
                     </View>
                  </View>
                ))}
             </View>
           )}
        </View>
        <View className="h-20" />
      </ScrollView>
    </SafeAreaView>
  );
};

export default LoanDashboardScreen;
