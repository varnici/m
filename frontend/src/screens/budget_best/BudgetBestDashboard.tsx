import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Plus,
  Target,
  TrendingUp,
  Zap,
  Award,
  Settings,
  AlertCircle,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface Goal {
  id: string;
  goal_name: string;
  goal_type: string;
  target_amount: number;
  current_savings: number;
  daily_target: number;
  deadline: string;
  is_active: boolean;
}

interface Streak {
  current_streak: number;
  tier_level: string;
  badges: string[];
}

const BudgetBestDashboard = ({ navigation }: any) => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [streak, setStreak] = useState<Streak | null>(null);
  const [totalSavings, setTotalSavings] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      // Load goals and streak from API
      // For now, using dummy data
      setGoals([
        {
          id: '1',
          goal_name: 'Shop Rent',
          goal_type: 'shop_rent',
          target_amount: 50000,
          current_savings: 18500,
          daily_target: 1666.67,
          deadline: '2024-05-31',
          is_active: true,
        },
        {
          id: '2',
          goal_name: 'House Rent',
          goal_type: 'house_rent',
          target_amount: 80000,
          current_savings: 42000,
          daily_target: 2666.67,
          deadline: '2024-05-31',
          is_active: true,
        },
      ]);
      setTotalSavings(60500);
      setStreak({
        current_streak: 15,
        tier_level: 'silver',
        badges: ['week_warrior'],
      });
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getTierColor = (tier: string) => {
    const colors: any = {
      bronze: '#CD7F32',
      silver: '#C0C0C0',
      gold: '#FFD700',
      platinum: '#E5E4E2',
    };
    return colors[tier] || '#1F2937';
  };

  const getTierLabel = (tier: string) => {
    return tier.charAt(0).toUpperCase() + tier.slice(1);
  };

  const getGoalProgress = (goal: Goal) => {
    return Math.min((goal.current_savings / goal.target_amount) * 100, 100);
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-slate-950 justify-center items-center">
        <ActivityIndicator size="large" color="#10B981" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View className="px-6 pt-6 pb-4 flex-row items-center justify-between">
        <View>
          <Text className="text-white text-2xl font-bold">Budget_Best</Text>
          <Text className="text-white/60 text-sm">Secure your future daily</Text>
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate('BudgetBestSettings')}
          className="p-3 bg-white/10 rounded-full"
        >
          <Settings color="white" size={24} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        {/* Total Savings Card */}
        <View className="px-6 mb-6">
          <LinearGradient
            colors={['#10B981', '#059669']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="rounded-3xl p-6"
          >
            <Text className="text-white/80 text-sm font-semibold mb-2">
              TOTAL SAVINGS
            </Text>
            <Text className="text-white text-3xl font-bold mb-4">
              ₦{totalSavings.toLocaleString()}
            </Text>
            <View className="flex-row items-center gap-2">
              <TrendingUp color="white" size={16} />
              <Text className="text-white/90 text-sm">
                On track with your goals
              </Text>
            </View>
          </LinearGradient>
        </View>

        {/* Streak Section */}
        {streak && (
          <View className="px-6 mb-6">
            <View className="bg-white/5 border border-white/10 rounded-3xl p-4 flex-row items-center justify-between">
              <View className="flex-1">
                <Text className="text-white/60 text-xs uppercase font-bold mb-1">
                  Current Streak
                </Text>
                <Text className="text-white text-2xl font-bold">
                  {streak.current_streak} days
                </Text>
              </View>
              <View
                className="w-20 h-20 rounded-full items-center justify-center"
                style={{ backgroundColor: getTierColor(streak.tier_level) }}
              >
                <View className="items-center">
                  <Award color="white" size={32} />
                  <Text className="text-white/80 text-xs font-bold mt-1">
                    {getTierLabel(streak.tier_level)}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Quick Actions */}
        <View className="px-6 mb-6">
          <View className="flex-row gap-3">
            <TouchableOpacity
              onPress={() => navigation.navigate('BudgetBestDeposit')}
              className="flex-1 bg-emerald-500 rounded-2xl p-4 items-center flex-row justify-center gap-2"
            >
              <Plus color="white" size={20} />
              <Text className="text-white font-semibold">Deposit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigation.navigate('BudgetBestGoals')}
              className="flex-1 bg-blue-500/20 border border-blue-500/30 rounded-2xl p-4 items-center flex-row justify-center gap-2"
            >
              <Target color="#60A5FA" size={20} />
              <Text className="text-blue-400 font-semibold">New Goal</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Goals Section */}
        <View className="px-6 mb-6">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-white text-lg font-bold">Active Goals</Text>
            <Text className="text-white/60 text-sm">{goals.length}</Text>
          </View>

          {goals.map((goal) => {
            const progress = getGoalProgress(goal);
            const daysLeft = Math.ceil(
              (new Date(goal.deadline).getTime() - new Date().getTime()) /
                (1000 * 60 * 60 * 24)
            );

            return (
              <TouchableOpacity
                key={goal.id}
                onPress={() =>
                  navigation.navigate('BudgetBestGoalDetail', { goalId: goal.id })
                }
                className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-3"
              >
                <View className="flex-row items-center justify-between mb-3">
                  <Text className="text-white font-semibold flex-1">
                    {goal.goal_name}
                  </Text>
                  <Text className="text-emerald-400 text-sm font-bold">
                    {progress.toFixed(0)}%
                  </Text>
                </View>

                {/* Progress Bar */}
                <View className="h-2 bg-white/10 rounded-full mb-3 overflow-hidden">
                  <View
                    className="h-full bg-emerald-500 rounded-full"
                    style={{ width: `${progress}%` }}
                  />
                </View>

                {/* Savings Info */}
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-white/60 text-sm">
                    ₦{goal.current_savings.toLocaleString()} / ₦
                    {goal.target_amount.toLocaleString()}
                  </Text>
                  <Text className="text-white/60 text-sm">
                    {daysLeft > 0 ? `${daysLeft} days` : 'Deadline reached'}
                  </Text>
                </View>

                {/* Daily Target */}
                <View className="flex-row items-center gap-2">
                  <Zap color="#F97316" size={14} />
                  <Text className="text-white/60 text-xs">
                    Daily target: ₦{goal.daily_target.toLocaleString()}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Policy Consent Banner */}
        <View className="px-6 mb-6">
          <View className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-4 flex-row gap-3">
            <AlertCircle color="#60A5FA" size={20} />
            <View className="flex-1">
              <Text className="text-blue-300 text-sm font-semibold mb-1">
                Budget_Best Guarantee
              </Text>
              <Text className="text-blue-200/80 text-xs">
                Every naira you save is yours. Zero deductions from your principal.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default BudgetBestDashboard;
