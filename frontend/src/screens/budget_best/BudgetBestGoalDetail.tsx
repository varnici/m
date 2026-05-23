import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  X,
  TrendingUp,
  Calendar,
  Zap,
  Download,
  ArrowUpRight,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useBudgetBestGoalDetail } from '@/hooks/useBudgetBest';

const BudgetBestGoalDetail = ({ navigation, route }: any) => {
  const { goalId } = route.params;
  const { goal, transactions, loading, recordTransaction } = useBudgetBestGoalDetail(goalId);

  if (loading || !goal) {
    return (
      <SafeAreaView className="flex-1 bg-slate-950 justify-center items-center">
        <ActivityIndicator size="large" color="#10B981" />
      </SafeAreaView>
    );
  }

  const currentSavings = goal.current_total_kobo / 100;
  const targetAmount = goal.target_amount_kobo / 100;
  const progress = goal.progress_percentage ?? ((currentSavings / (targetAmount || 1)) * 100);
  const deadlineDate = goal.target_date || new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();
  const daysLeft = Math.max(1, Math.ceil(
    (new Date(deadlineDate).getTime() - new Date().getTime()) /
      (1000 * 60 * 60 * 24)
  ));
  const remaining = Math.max(targetAmount - currentSavings, 0);
  const dailyNeeded = remaining / daysLeft;
  const dailyTarget = (goal.auto_save_amount_kobo || 0) / 100;

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View className="px-6 py-4 flex-row items-center justify-between border-b border-white/10">
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <X color="white" size={24} />
        </TouchableOpacity>
        <Text className="text-white text-xl font-bold">{goal.title}</Text>
        <View className="w-6" />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} className="flex-1 px-6 py-6">
        {/* Main Progress Card */}
        <LinearGradient
          colors={['#10B981', '#059669']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="rounded-3xl p-6 mb-6"
        >
          <Text className="text-white/80 text-sm font-semibold mb-2">
            TOTAL SAVED
          </Text>
          <Text className="text-white text-3xl font-bold mb-4">
            ₦{currentSavings.toLocaleString()}
          </Text>

          {/* Progress Bar */}
          <View className="h-2 bg-white/30 rounded-full mb-4 overflow-hidden">
            <View
              className="h-full bg-white rounded-full"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </View>

          <View className="flex-row items-center justify-between">
            <Text className="text-white/90 text-sm">
              {progress.toFixed(0)}% of ₦{targetAmount.toLocaleString()}
            </Text>
            <Text className="text-white/90 text-sm">
              ₦{remaining.toLocaleString()} left
            </Text>
          </View>
        </LinearGradient>

        {/* Key Metrics */}
        <View className="grid grid-cols-2 gap-3 mb-6">
          <View className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <Text className="text-white/60 text-xs uppercase font-bold mb-2">
              Daily Target
            </Text>
            <Text className="text-white text-lg font-bold">
              ₦{dailyTarget.toLocaleString()}
            </Text>
            <Text className="text-white/40 text-xs mt-1">Original</Text>
          </View>

          <View className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <Text className="text-white/60 text-xs uppercase font-bold mb-2">
              Daily Needed
            </Text>
            <Text className={`text-lg font-bold ${dailyNeeded > dailyTarget ? 'text-orange-400' : 'text-emerald-400'}`}>
              ₦{dailyNeeded.toLocaleString()}
            </Text>
            <Text className="text-white/40 text-xs mt-1">To stay on track</Text>
          </View>

          <View className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <View className="flex-row items-center gap-1 mb-2">
              <Calendar size={16} color="#888" />
              <Text className="text-white/60 text-xs uppercase font-bold">
                Days Left
              </Text>
            </View>
            <Text className={`text-lg font-bold ${daysLeft <= 7 ? 'text-red-400' : 'text-white'}`}>
              {daysLeft}
            </Text>
            <Text className="text-white/40 text-xs mt-1">Until deadline</Text>
          </View>

          <View className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <Text className="text-white/60 text-xs uppercase font-bold mb-2">
              Deadline
            </Text>
            <Text className="text-white text-lg font-bold">
              {new Date(deadlineDate).toLocaleDateString()}
            </Text>
            <Text className="text-white/40 text-xs mt-1">Target date</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View className="gap-2 mb-6">
          <TouchableOpacity
            onPress={() => navigation.navigate('BudgetBestDeposit', { goalId: goal.id })}
            className="bg-emerald-500 rounded-2xl py-4 flex-row items-center justify-center gap-2"
          >
            <ArrowUpRight color="white" size={20} />
            <Text className="text-white font-bold">Make a Deposit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={async () => {
              try {
                await recordTransaction(1000, 'withdrawal');
              } catch (err: any) {
                Alert.alert('Withdrawal failed', err?.message || 'Please try again');
              }
            }}
            className="bg-blue-500/20 border border-blue-500/30 rounded-2xl py-4 flex-row items-center justify-center gap-2"
          >
            <Download color="#60A5FA" size={20} />
            <Text className="text-blue-400 font-bold">Quick Withdraw (₦1,000)</Text>
          </TouchableOpacity>
        </View>

        {/* Deadline Status */}
        {daysLeft <= 7 && (
          <View className="bg-orange-500/10 border border-orange-500/30 rounded-2xl p-4 mb-6">
            <Text className="text-orange-400 text-sm font-bold mb-1">
              ⚠️ Approaching Deadline
            </Text>
            <Text className="text-orange-300/80 text-xs">
              You need to save ₦{dailyNeeded.toLocaleString()} daily to reach
              your goal.
            </Text>
          </View>
        )}

        {/* Transaction History */}
        <View>
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-white text-lg font-bold">
              Transaction History
            </Text>
            <Text className="text-white/60 text-sm">{transactions.length}</Text>
          </View>

          {transactions.map((txn) => {
            const isDeposit = txn.transaction_type === 'deposit';
            return (
              <View
                key={txn.id}
                className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-3 flex-row items-center justify-between"
              >
                <View className="flex-row items-center gap-3 flex-1">
                  <View
                    className={`w-10 h-10 rounded-full items-center justify-center ${
                      isDeposit
                        ? 'bg-emerald-500/20'
                        : 'bg-red-500/20'
                    }`}
                  >
                    <TrendingUp
                      color={isDeposit ? '#10B981' : '#EF4444'}
                      size={20}
                      style={{
                        transform: [
                          { rotate: isDeposit ? '0deg' : '180deg' },
                        ],
                      }}
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-white font-semibold text-sm">
                      {txn.transaction_type === 'deposit'
                        ? 'Deposit'
                        : txn.transaction_type === 'withdrawal'
                        ? 'Withdrawal'
                        : 'Interest'}
                    </Text>
                    <Text className="text-white/60 text-xs">{new Date(txn.created_at).toLocaleDateString()}</Text>
                  </View>
                </View>
                <Text
                  className={`text-lg font-bold ${
                    isDeposit ? 'text-emerald-400' : 'text-red-400'
                  }`}
                >
                  {isDeposit ? '+' : '-'}₦{Number(txn.amount_kobo / 100).toLocaleString()}
                </Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default BudgetBestGoalDetail;
