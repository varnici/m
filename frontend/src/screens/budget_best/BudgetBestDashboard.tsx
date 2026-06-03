import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  RefreshControl,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Plus,
  Target,
  TrendingUp,
  Award,
  Settings,
  AlertCircle,
  ShieldCheck,
  Zap,
  CreditCard,
  ShoppingCart,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getDashboard } from '../../services/budgetBestApi';
import { SavingsDashboard, SavingsGoalResponse } from '../../types/budget-best';
import SavingsBucket from '../../components/SavingsBucket';

const BudgetBestDashboard = ({ navigation }: any) => {
  const [data, setData] = useState<SavingsDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creditOffer, setCreditOffer] = useState<any>(null);

  const loadDashboardData = async () => {
    try {
      setError(null);
      const dashboardData = await getDashboard();
      setData(dashboardData);
      
      // Simulate/Fetch credit offer based on trust score
      if (dashboardData.streak?.streak_count && dashboardData.streak.streak_count >= 1) {
        setCreditOffer({
          amount: 100000,
          title: "Inventory Credit Available",
          description: "Your consistent savings earned you ₦100,000 in credit."
        });
      }
    } catch (err: any) {
      console.error('Error loading dashboard:', err);
      setError('Failed to load savings data. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const getTierInfo = (streakCount: number) => {
    if (streakCount >= 30) return { label: 'Platinum', color: '#E5E4E2' };
    if (streakCount >= 14) return { label: 'Gold', color: '#FFD700' };
    if (streakCount >= 7) return { label: 'Silver', color: '#C0C0C0' };
    return { label: 'Bronze', color: '#CD7F32' };
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView className="flex-1 bg-slate-950 justify-center items-center">
        <ActivityIndicator size="large" color="#10B981" />
      </SafeAreaView>
    );
  }

  const tier = getTierInfo(data?.streak?.streak_count || 0);

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View className="px-6 pt-6 pb-4 flex-row items-center justify-between">
        <View>
          <Text className="text-white text-2xl font-bold">Budget_Best</Text>
          <View className="flex-row items-center gap-1">
            <ShieldCheck color="#10B981" size={14} />
            <Text className="text-emerald-400 text-xs font-bold uppercase tracking-wider">
              Principal Protected
            </Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate('BudgetBestSettings')}
          className="p-3 bg-white/10 rounded-full"
        >
          <Settings color="white" size={24} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10B981" />
        }
      >
        {/* Total Savings Card */}
        <View className="px-6 mb-6">
          <LinearGradient
            colors={['#064E3B', '#065F46']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="rounded-3xl p-6 shadow-xl"
          >
            <Text className="text-emerald-400/80 text-xs font-bold mb-1 uppercase tracking-widest">
              Total Secure Savings
            </Text>
            <Text className="text-white text-4xl font-bold mb-4">
              ₦{((data?.total_saved_kobo || 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </Text>
            <View className="flex-row items-center gap-2 bg-black/20 self-start px-3 py-1 rounded-full">
              <TrendingUp color="#10B981" size={14} />
              <Text className="text-emerald-400 text-xs font-semibold">
                Growing daily
              </Text>
            </View>
          </LinearGradient>
        </View>

        {/* AI Dynamic Suggestion Banner */}
        {data?.dynamic_suggestion && data.dynamic_suggestion.reason !== 'no_active_goals' && (
          <View className="px-6 mb-6">
            <View className="bg-emerald-500/10 border border-emerald-500/20 rounded-3xl p-4 flex-row items-center gap-3">
              <View className="bg-emerald-500/20 p-2 rounded-xl">
                <Zap color="#10B981" size={20} />
              </View>
              <View className="flex-1">
                <Text className="text-emerald-400 text-xs font-black uppercase tracking-widest mb-0.5">
                  AI Optimization
                </Text>
                <Text className="text-white/80 text-xs font-medium">
                  {data.dynamic_suggestion.message}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Credit Offer UI */}
        {creditOffer && (
          <View className="px-6 mb-6">
            <TouchableOpacity 
              onPress={() => navigation.navigate('CreditApplication')}
              className="bg-blue-600 rounded-3xl p-6 shadow-xl overflow-hidden"
            >
              <View className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-white/10 rounded-full" />
              <View className="flex-row items-center gap-3 mb-2">
                <View className="bg-white/20 p-2 rounded-xl">
                  <CreditCard color="white" size={24} />
                </View>
                <Text className="text-white text-lg font-black">{creditOffer.title}</Text>
              </View>
              <Text className="text-white/90 text-sm font-medium mb-4">
                {creditOffer.description}
              </Text>
              <View className="bg-white py-3 rounded-2xl items-center shadow-sm">
                <Text className="text-blue-700 font-black uppercase tracking-widest text-xs">Claim ₦{creditOffer.amount.toLocaleString()} Credit</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Streak Section */}
        <View className="px-6 mb-6">
          <View className="bg-white/5 border border-white/10 rounded-3xl p-5 flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-white/40 text-xs uppercase font-bold mb-1 tracking-widest">
                Savings Streak
              </Text>
              <Text className="text-white text-3xl font-bold">
                {data?.streak?.streak_count || 0} Days
              </Text>
              <Text className="text-emerald-500/80 text-xs font-medium mt-1">
                Keep saving to reach {tier.label} Tier
              </Text>
            </View>
            <View
              className="w-16 h-16 rounded-2xl items-center justify-center shadow-lg"
              style={{ backgroundColor: tier.color }}
            >
              <Award color="#1F2937" size={32} />
            </View>
          </View>
        </View>

        {/* Goals Section */}
        <View className="px-6 mb-6">
          <View className="flex-row items-center justify-between mb-4 px-1">
            <Text className="text-white text-xl font-bold">Visual Buckets</Text>
            <View className="flex-row items-center gap-2">
              <TouchableOpacity onPress={() => navigation.navigate('BudgetBestGoals')}>
                <Plus color="#10B981" size={24} />
              </TouchableOpacity>
            </View>
          </View>

          {data?.goals.map((goal: SavingsGoalResponse) => (
            <View key={goal.id} className="mb-4">
              <SavingsBucket
                title={goal.title}
                category={goal.category}
                currentAmount={goal.current_total_kobo}
                targetAmount={goal.target_amount_kobo}
                progress={goal.progress_percentage}
              />
              
              {/* One-Click Order for Restock Buckets at 100% */}
              {goal.category.toLowerCase() === 'restock' && goal.progress_percentage >= 100 && (
                <TouchableOpacity 
                  onPress={() => Linking.openURL('whatsapp://send?phone=2348000000000&text=I am ready to restock!')}
                  className="mt-2 bg-indigo-600/20 border border-indigo-500/30 rounded-2xl p-4 flex-row items-center justify-between"
                >
                  <View className="flex-row items-center gap-3">
                    <ShoppingCart color="#818CF8" size={20} />
                    <Text className="text-indigo-200 font-bold">One-Click Order Stock</Text>
                  </View>
                  <Text className="text-indigo-400 text-xs font-black uppercase tracking-widest">Order Now</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}

          {data?.goals.length === 0 && !loading && (
            <View className="bg-white/5 border border-dashed border-white/20 rounded-3xl p-10 items-center">
              <Target color="rgba(255,255,255,0.2)" size={48} />
              <Text className="text-white/40 text-center mt-4 font-medium">
                No active savings goals yet.{"\n"}Start small, dream big.
              </Text>
            </View>
          )}
        </View>

        {/* Trust Banner */}
        <View className="px-6 mb-10">
          <LinearGradient
            colors={['rgba(59, 130, 246, 0.1)', 'rgba(59, 130, 246, 0.05)']}
            className="border border-blue-500/20 rounded-3xl p-5 flex-row gap-4"
          >
            <View className="bg-blue-500/20 p-3 rounded-2xl self-start">
              <AlertCircle color="#60A5FA" size={24} />
            </View>
            <View className="flex-1">
              <Text className="text-blue-300 text-base font-bold mb-1">
                Budget_Best Guarantee
              </Text>
              <Text className="text-blue-200/60 text-xs leading-4">
                Your principal is protected. We earn from banking partnerships, not by charging you fees on your savings.
              </Text>
            </View>
          </LinearGradient>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default BudgetBestDashboard;
