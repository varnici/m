import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  ScrollView,
  StatusBar,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, CheckCircle2, AlertCircle } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useBudgetBestGoals } from '@/hooks/useBudgetBest';
import { createReminder } from '@/services/budgetBestApi';

const PRESET_AMOUNTS = [200, 500, 3000, 4000, 5000];

const BudgetBestDeposit = ({ navigation, route }: any) => {
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);
  const [showReminder, setShowReminder] = useState(false);
  const [reminderTime, setReminderTime] = useState('08:00');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { goals, loading: goalsLoading } = useBudgetBestGoals(true);

  useEffect(() => {
    if (route?.params?.goalId) {
      setSelectedGoal(route.params.goalId);
    }
  }, [route?.params?.goalId]);

  const getAmount = (): number => {
    if (customAmount) {
      return parseInt(customAmount, 10) || 0;
    }
    return selectedAmount || 0;
  };

  const amount = useMemo(() => getAmount(), [selectedAmount, customAmount]);

  const handleDeposit = async () => {
    if (amount <= 0) {
      setError('Please select or enter a valid amount');
      return;
    }

    if (!selectedGoal) {
      setError('Please select a goal');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { recordTransaction } = await import('@/services/budgetBestApi');
      await recordTransaction({
        goal_id: selectedGoal,
        amount,
        transaction_type: 'deposit',
      });

      if (showReminder && reminderTime) {
        await createReminder({
          goal_id: selectedGoal,
          reminder_time: `${reminderTime}:00`,
          reminder_frequency: 'daily',
          reminder_enabled: true,
        });
      }

      setSuccess(true);
      setTimeout(() => {
        navigation.goBack();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to process deposit');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View className="px-6 py-4 flex-row items-center justify-between border-b border-white/10">
        <Text className="text-white text-xl font-bold">Make a Deposit</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <X color="white" size={24} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          className="flex-1 px-6 py-6"
        >
          {/* Select Goal */}
          <View className="mb-6">
            <Text className="text-white font-bold text-sm mb-3 uppercase">
              Select Goal
            </Text>
            {goalsLoading ? (
              <View className="py-4">
                <ActivityIndicator color="#10B981" />
              </View>
            ) : goals.map((goal) => (
              <TouchableOpacity
                key={goal.id}
                onPress={() => setSelectedGoal(goal.id)}
                className={`p-4 rounded-2xl mb-2 flex-row items-center justify-between border ${
                  selectedGoal === goal.id
                    ? 'bg-emerald-500/20 border-emerald-500'
                    : 'bg-white/5 border-white/10'
                }`}
              >
                <View className="flex-1">
                  <Text className="text-white font-semibold">
                    {goal.goal_name}
                  </Text>
                  <Text className="text-white/60 text-xs mt-1">
                    Current: ₦{goal.current_savings.toLocaleString()}
                  </Text>
                </View>
                {selectedGoal === goal.id && (
                  <CheckCircle2 color="#10B981" size={20} />
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Preset Amounts */}
          <View className="mb-6">
            <Text className="text-white font-bold text-sm mb-3 uppercase">
              Quick Amounts
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {PRESET_AMOUNTS.map((preset) => (
                <TouchableOpacity
                  key={preset}
                  onPress={() => {
                    setSelectedAmount(preset);
                    setCustomAmount('');
                  }}
                  className={`flex-1 min-w-[30%] py-3 px-2 rounded-2xl border items-center ${
                    selectedAmount === preset && !customAmount
                      ? 'bg-emerald-500/20 border-emerald-500'
                      : 'bg-white/5 border-white/10'
                  }`}
                >
                  <Text
                    className={`font-bold ${
                      selectedAmount === preset && !customAmount
                        ? 'text-emerald-400'
                        : 'text-white'
                    }`}
                  >
                    ₦{preset.toLocaleString()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Custom Amount */}
          <View className="mb-6">
            <Text className="text-white font-bold text-sm mb-3 uppercase">
              Custom Amount
            </Text>
            <View className="flex-row items-center bg-white/5 border border-white/10 rounded-2xl px-4">
              <Text className="text-white text-lg font-bold">₦</Text>
              <TextInput
                value={customAmount}
                onChangeText={(text) => {
                  setCustomAmount(text);
                  setSelectedAmount(null);
                }}
                placeholder="Enter amount"
                placeholderTextColor="#666"
                keyboardType="number-pad"
                className="flex-1 py-4 px-2 text-white text-lg"
              />
            </View>
          </View>

          {/* Amount Display */}
          {amount > 0 && (
            <View className="mb-6">
              <LinearGradient
                colors={['#10B981', '#059669']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                className="rounded-2xl p-4"
              >
                <Text className="text-white/80 text-sm mb-2">
                  Deposit Amount
                </Text>
                <Text className="text-white text-3xl font-bold">
                  ₦{amount.toLocaleString()}
                </Text>
              </LinearGradient>
            </View>
          )}

          {/* Reminder Toggle */}
          <View className="mb-6 bg-white/5 border border-white/10 rounded-2xl p-4">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-white font-semibold">Set Reminder</Text>
              <TouchableOpacity
                onPress={() => setShowReminder(!showReminder)}
                className={`w-12 h-7 rounded-full flex items-center justify-center ${
                  showReminder ? 'bg-emerald-500' : 'bg-white/10'
                }`}
              >
                <View
                  className={`w-6 h-6 rounded-full bg-white ${
                    showReminder ? 'ml-3' : 'ml-0'
                  }`}
                />
              </TouchableOpacity>
            </View>

            {showReminder && (
              <View className="mt-3">
                <Text className="text-white/60 text-xs mb-2">Daily at</Text>
                <TextInput
                  value={reminderTime}
                  onChangeText={setReminderTime}
                  placeholder="HH:MM"
                  placeholderTextColor="#666"
                  className="bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-white text-center"
                />
              </View>
            )}
          </View>

          {/* Error Message */}
          {error && (
            <View className="mb-6 bg-red-500/10 border border-red-500/30 rounded-2xl p-3 flex-row gap-2">
              <AlertCircle color="#f87171" size={20} />
              <Text className="text-red-300 text-sm flex-1">{error}</Text>
            </View>
          )}

          {/* Success Message */}
          {success && (
            <View className="mb-6 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-3 flex-row gap-2">
              <CheckCircle2 color="#10B981" size={20} />
              <Text className="text-emerald-300 text-sm flex-1">
                Deposit successful!
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Footer Button */}
        <View className="px-6 py-4 border-t border-white/10">
          <TouchableOpacity
            onPress={handleDeposit}
            disabled={loading || amount === 0 || !selectedGoal}
            className={`py-4 rounded-2xl items-center ${
              loading || amount === 0 || !selectedGoal
                ? 'bg-white/10'
                : 'bg-emerald-500'
            }`}
          >
            {loading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text
                className={`font-bold text-lg ${
                  loading || amount === 0 || !selectedGoal
                    ? 'text-white/50'
                    : 'text-white'
                }`}
              >
                Confirm Deposit
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default BudgetBestDeposit;
