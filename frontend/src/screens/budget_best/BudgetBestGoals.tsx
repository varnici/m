import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  X,
  Plus,
  Trash2,
  Calendar,
} from 'lucide-react-native';
import { useBudgetBestGoals } from '@/hooks/useBudgetBest';

interface Bucket {
  id: string;
  name: string;
  percentage: number;
  amount: number;
  color: string;
  icon: string;
}

const GOAL_TYPES = [
  { label: 'Shop Rent', value: 'shop_rent', color: '#F97316' },
  { label: 'House Rent', value: 'house_rent', color: '#3B82F6' },
  { label: 'Bills & Utilities', value: 'bills', color: '#8B5CF6' },
  { label: 'Staff Salaries', value: 'staff_salaries', color: '#EC4899' },
  { label: 'Custom', value: 'custom', color: '#10B981' },
];

const BudgetBestGoals = ({ navigation }: any) => {
  const { goals, loading, createGoal, deleteGoal, refresh } = useBudgetBestGoals(true);

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    goalName: '',
    goalType: 'shop_rent',
    targetAmount: '',
    monthlyGoal: '',
    deadline: new Date().toISOString().split('T')[0],
  });

  const [submitting, setSubmitting] = useState(false);

  // Visual Bucket Breakdown - calculated from goals
  const getBuckets = (): Bucket[] => {
    const total = goals.reduce((sum, g) => sum + (g.target_amount_kobo || 0) / 100, 0);
    if (total <= 0) return [];
    return goals.map((goal) => {
      const targetAmount = (goal.target_amount_kobo || 0) / 100;
      const percentage = (targetAmount / total) * 100;
      const categoryValue = goal.category || 'custom';
      const color = GOAL_TYPES.find((t) => t.value === categoryValue)?.color || '#10B981';
      return {
        id: goal.id,
        name: goal.title,
        percentage: percentage,
        amount: (goal.current_total_kobo || 0) / 100,
        color,
        icon: categoryValue,
      };
    });
  };

  const handleCreateGoal = async () => {
    if (!formData.goalName || !formData.targetAmount || !formData.monthlyGoal) {
      Alert.alert('Missing fields', 'Please fill in goal name, target amount, and monthly goal.');
      return;
    }

    try {
      setSubmitting(true);
      await createGoal({
        goal_name: formData.goalName.trim(),
        goal_type: formData.goalType,
        target_amount: Number(formData.targetAmount),
        monthly_goal: Number(formData.monthlyGoal),
        deadline: formData.deadline,
      });
      setFormData({
        goalName: '',
        goalType: 'shop_rent',
        targetAmount: '',
        monthlyGoal: '',
        deadline: new Date().toISOString().split('T')[0],
      });
      setShowForm(false);
      await refresh();
    } catch (err: any) {
      Alert.alert('Could not create goal', err?.message || 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteGoal = (goalId: string) => {
    Alert.alert('Delete goal', 'This goal will be archived from active list.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteGoal(goalId);
          } catch (err: any) {
            Alert.alert('Could not delete goal', err?.message || 'Please try again.');
          }
        },
      },
    ]);
  };

  const buckets = useMemo(() => getBuckets(), [goals]);
  const totalAmount = goals.reduce((sum, g) => sum + (g.target_amount_kobo || 0) / 100, 0);

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View className="px-6 py-4 flex-row items-center justify-between border-b border-white/10">
        <Text className="text-white text-xl font-bold">Savings Goals</Text>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="p-2"
        >
          <X color="white" size={24} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView showsVerticalScrollIndicator={false} className="flex-1 px-6 py-6">
          {/* Visual Bucket Breakdown */}
          {buckets.length > 0 && (
            <View className="mb-8">
              <Text className="text-white font-bold text-sm mb-4 uppercase">
                Savings Breakdown
              </Text>

              {/* Bucket Visualization */}
              <View className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-4">
                {buckets.map((bucket, idx) => (
                  <View key={bucket.id} className="mb-4">
                    <View className="flex-row items-center justify-between mb-2">
                      <View className="flex-row items-center gap-2 flex-1">
                        <View
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: bucket.color }}
                        />
                        <Text className="text-white font-semibold text-sm flex-1">
                          {bucket.name}
                        </Text>
                      </View>
                      <Text className="text-white/60 text-xs">
                        {bucket.percentage.toFixed(0)}%
                      </Text>
                    </View>

                    {/* Bucket Fill */}
                    <View className="h-6 bg-white/10 rounded-lg overflow-hidden mb-1">
                      <View
                        className="h-full rounded-lg"
                        style={{
                          width: `${bucket.percentage}%`,
                          backgroundColor: bucket.color,
                          opacity: 0.7,
                        }}
                      />
                    </View>

                    <Text className="text-white/60 text-xs">
                      ₦{bucket.amount.toLocaleString()} / ₦
                      {(totalAmount * (bucket.percentage / 100)).toLocaleString()}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Bucket Legend */}
              <View className="flex-row flex-wrap gap-2">
                {buckets.map((bucket) => (
                  <View
                    key={bucket.id}
                    className="flex-1 min-w-[40%] bg-white/5 border border-white/10 rounded-lg p-2"
                  >
                    <Text className="text-white/60 text-xs mb-1">
                      {bucket.name}
                    </Text>
                    <Text className="text-white font-bold">
                      ₦{bucket.amount.toLocaleString()}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Active Goals List */}
          <View className="mb-6">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-white font-bold text-sm uppercase">
                Active Goals ({goals.length})
              </Text>
            </View>

            {loading ? (
              <View className="py-6 items-center">
                <ActivityIndicator color="#10B981" />
              </View>
            ) : goals.map((goal) => {
              const categoryValue = goal.category || 'custom';
              const goalType = GOAL_TYPES.find((t) => t.value === categoryValue);
              const currentSavings = (goal.current_total_kobo || 0) / 100;
              const targetAmount = (goal.target_amount_kobo || 0) / 100;
              const progress = goal.progress_percentage ?? ((currentSavings / (targetAmount || 1)) * 100);
              const deadlineDate = goal.target_date || new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();
              const daysLeft = Math.max(1, Math.ceil(
                (new Date(deadlineDate).getTime() - new Date().getTime()) /
                  (1000 * 60 * 60 * 24)
              ));

              return (
                <View
                  key={goal.id}
                  className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-3"
                >
                  <View className="flex-row items-start justify-between mb-3">
                    <View className="flex-1">
                      <View className="flex-row items-center gap-2 mb-1">
                        <View
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: goalType?.color }}
                        />
                        <Text className="text-white font-semibold">
                          {goal.title}
                        </Text>
                      </View>
                      <Text className="text-white/60 text-xs">
                        Target: ₦{targetAmount.toLocaleString()}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleDeleteGoal(goal.id)}
                      className="p-2"
                    >
                      <Trash2 color="#ef4444" size={16} />
                    </TouchableOpacity>
                  </View>

                  {/* Progress Bar */}
                  <View className="h-2 bg-white/10 rounded-full mb-2 overflow-hidden">
                    <View
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(progress, 100)}%`,
                        backgroundColor: goalType?.color,
                      }}
                    />
                  </View>

                  {/* Stats */}
                  <View className="flex-row items-center justify-between">
                    <Text className="text-white/60 text-xs">
                      {progress.toFixed(0)}% complete
                    </Text>
                    <View className="flex-row items-center gap-1">
                      <Calendar size={12} color="#888" />
                      <Text className="text-white/60 text-xs">
                        {daysLeft} days left
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>

          {/* Create Goal Form */}
          {showForm && (
            <View className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-6">
              <Text className="text-white font-bold text-sm mb-4">
                New Savings Goal
              </Text>

              {/* Goal Name */}
              <View className="mb-4">
                <Text className="text-white/60 text-xs mb-2 uppercase">
                  Goal Name
                </Text>
                <TextInput
                  value={formData.goalName}
                  onChangeText={(text) =>
                    setFormData({ ...formData, goalName: text })
                  }
                  placeholder="e.g., Shop Rent"
                  placeholderTextColor="#666"
                  className="bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-white"
                />
              </View>

              {/* Goal Type */}
              <View className="mb-4">
                <Text className="text-white/60 text-xs mb-2 uppercase">
                  Type
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  className="gap-2"
                >
                  {GOAL_TYPES.map((type) => (
                    <TouchableOpacity
                      key={type.value}
                      onPress={() =>
                        setFormData({ ...formData, goalType: type.value })
                      }
                      className={`px-4 py-2 rounded-lg border ${
                        formData.goalType === type.value
                          ? 'bg-emerald-500/20 border-emerald-500'
                          : 'bg-white/10 border-white/10'
                      }`}
                    >
                      <Text
                        className={
                          formData.goalType === type.value
                            ? 'text-emerald-300 text-xs font-semibold'
                            : 'text-white/60 text-xs'
                        }
                      >
                        {type.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Target Amount */}
              <View className="mb-4">
                <Text className="text-white/60 text-xs mb-2 uppercase">
                  Target Amount
                </Text>
                <View className="flex-row items-center bg-white/10 border border-white/10 rounded-lg px-3">
                  <Text className="text-white">₦</Text>
                  <TextInput
                    value={formData.targetAmount}
                    onChangeText={(text) =>
                      setFormData({ ...formData, targetAmount: text })
                    }
                    placeholder="50000"
                    placeholderTextColor="#666"
                    keyboardType="number-pad"
                    className="flex-1 py-2 px-2 text-white"
                  />
                </View>
              </View>

              {/* Monthly Goal */}
              <View className="mb-4">
                <Text className="text-white/60 text-xs mb-2 uppercase">
                  Monthly Goal
                </Text>
                <View className="flex-row items-center bg-white/10 border border-white/10 rounded-lg px-3">
                  <Text className="text-white">₦</Text>
                  <TextInput
                    value={formData.monthlyGoal}
                    onChangeText={(text) =>
                      setFormData({ ...formData, monthlyGoal: text })
                    }
                    placeholder="50000"
                    placeholderTextColor="#666"
                    keyboardType="number-pad"
                    className="flex-1 py-2 px-2 text-white"
                  />
                </View>
              </View>

              {/* Deadline */}
              <View className="mb-6">
                <Text className="text-white/60 text-xs mb-2 uppercase">
                  Deadline
                </Text>
                <TextInput
                  value={formData.deadline}
                  onChangeText={(text) =>
                    setFormData({ ...formData, deadline: text })
                  }
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#666"
                  className="bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-white"
                />
              </View>

              {/* Action Buttons */}
              <View className="flex-row gap-2">
                <TouchableOpacity
                  onPress={() => setShowForm(false)}
                  className="flex-1 bg-white/10 rounded-lg py-3"
                >
                  <Text className="text-white text-center font-semibold">
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleCreateGoal}
                  disabled={submitting}
                  className="flex-1 bg-emerald-500 rounded-lg py-3"
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text className="text-white text-center font-semibold">
                      Create Goal
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Footer Button */}
        <View className="px-6 py-4 border-t border-white/10">
          {showForm ? null : (
            <TouchableOpacity
              onPress={() => setShowForm(true)}
              className="bg-emerald-500 rounded-2xl py-4 flex-row items-center justify-center gap-2"
            >
              <Plus color="white" size={20} />
              <Text className="text-white font-bold text-lg">Add New Goal</Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default BudgetBestGoals;
