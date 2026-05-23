import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  Award,
  CheckCircle,
  Building,
  CreditCard,
  Plus,
  ArrowUpRight,
  TrendingUp,
} from 'lucide-react-native';
import type { RootStackScreenProps } from '@/navigation/types';
import { useAuth } from '@/context/AuthContext';

type KYCLevel = {
  tier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
  limit: string;
  benefits: string[];
  color: string;
};

const KYC_TIERS: KYCLevel[] = [
  { tier: 'Bronze', limit: '₦50,000 / day', benefits: ['Basic payments', 'Micro-loans (up to ₦15k)'], color: '#B45309' },
  { tier: 'Silver', limit: '₦250,000 / day', benefits: ['Advanced logistics access', 'Standard loans (up to ₦100k)', 'Savings vault'], color: '#6B7280' },
  { tier: 'Gold', limit: '₦1,000,000 / day', benefits: ['Group Buy pool coordination', 'Premium credit rates (up to ₦500k)', 'Priority support'], color: '#D97706' },
  { tier: 'Platinum', limit: 'Unlimited / day', benefits: ['Wholesale line-of-credit (up to ₦2.5m)', 'Zero fees on pool deposits', 'Custom brand storefront'], color: '#4F46E5' },
];

const AccountDetailsScreen = ({ navigation }: RootStackScreenProps<'AccountDetails'>) => {
  const { user } = useAuth();
  const userName = user?.email
    ? user.email.split('@')[0].split(/[._-]/).map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    : 'Chidi Okonkwo';

  const [activeTier, setActiveTier] = useState<KYCLevel['tier']>('Gold');
  const [trustScore, setTrustScore] = useState(870); // out of 1000
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const progressPercentage = (trustScore / 1000) * 100;
  const currentTierInfo = KYC_TIERS.find(t => t.tier === activeTier) || KYC_TIERS[2];

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <StatusBar barStyle="dark-content" />
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-slate-100">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="w-10 h-10 rounded-full bg-slate-100 items-center justify-center"
          >
            <ChevronLeft size={24} color="#1E293B" />
          </TouchableOpacity>
          <Text className="text-slate-900 font-extrabold text-base">Merchant Account</Text>
          <View className="w-10" />
        </View>

        <ScrollView
          className="flex-1 px-4 pt-4"
          showsVerticalScrollIndicator={false}
        >
          {/* Merchant Profile Badge */}
          <View className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm mb-6 flex-row items-center justify-between">
            <View className="flex-1 mr-4">
              <Text className="text-slate-400 text-xs font-bold uppercase tracking-wider">Trading Name</Text>
              <Text className="text-slate-900 font-black text-xl mt-1">{userName}</Text>
              <Text className="text-slate-500 text-xs mt-1">Merchant ID: VR-8302-NG</Text>
            </View>
            <View className="w-14 h-14 rounded-2xl bg-amber-50 items-center justify-center border border-amber-200">
              <Award size={32} color="#D97706" />
            </View>
          </View>

          {/* Trust Scoring Center */}
          <View className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm mb-6">
            <View className="flex-row justify-between items-baseline mb-3">
              <Text className="text-slate-900 font-bold text-base">Fintech Trust Score</Text>
              <Text className="text-emerald-600 font-black text-xl">{trustScore} <Text className="text-slate-400 text-xs">/ 1000</Text></Text>
            </View>
            
            <View className="h-3 bg-slate-100 rounded-full overflow-hidden mb-4">
              <View className="h-full bg-emerald-500 rounded-full" style={{ width: `${progressPercentage}%` }} />
            </View>

            <View className="bg-emerald-50/40 border border-emerald-100 p-3 rounded-2xl mb-4">
              <Text className="text-emerald-800 text-xs font-semibold leading-relaxed">
                🚀 Points to Platinum: <Text className="font-extrabold text-emerald-950">130</Text>. Record regular sales and maintain perfect credit repayment schedules to level up!
              </Text>
            </View>

            {/* Checklist */}
            <Text className="text-slate-400 text-[10px] font-black uppercase tracking-wider mb-3 ml-1">
              Active Verifications
            </Text>
            
            <View className="gap-3">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <CheckCircle size={16} color="#10B981" />
                  <Text className="text-slate-700 text-xs font-semibold ml-3">BVN Verification</Text>
                </View>
                <Text className="text-emerald-600 text-[10px] font-bold bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100">MATCHED</Text>
              </View>

              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <CheckCircle size={16} color="#10B981" />
                  <Text className="text-slate-700 text-xs font-semibold ml-3">Face Verification (Liveness check)</Text>
                </View>
                <Text className="text-emerald-600 text-[10px] font-bold bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100">VERIFIED</Text>
              </View>

              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <CheckCircle size={16} color="#10B981" />
                  <Text className="text-slate-700 text-xs font-semibold ml-3">Active Sales History (6+ months)</Text>
                </View>
                <Text className="text-emerald-600 text-[10px] font-bold bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100">ESTABLISHED</Text>
              </View>

              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <CheckCircle size={16} color="#10B981" />
                  <Text className="text-slate-700 text-xs font-semibold ml-3">Tax Compliance</Text>
                </View>
                <Text className="text-emerald-600 text-[10px] font-bold bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100">COMPLIANT</Text>
              </View>
            </View>
          </View>

          {/* KYC Tier Explorer */}
          <View className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm mb-6">
            <Text className="text-slate-900 font-bold text-base mb-4">KYC Limits & Levels</Text>
            
            <View className="flex-row gap-2 mb-6">
              {KYC_TIERS.map(tier => (
                <TouchableOpacity
                  key={tier.tier}
                  onPress={() => setActiveTier(tier.tier)}
                  className={`flex-1 py-3 px-1 rounded-2xl items-center border ${
                    activeTier === tier.tier
                      ? 'bg-ventureroot-green border-ventureroot-green shadow-sm'
                      : 'bg-slate-50 border-slate-100'
                  }`}
                >
                  <Text className={`text-[10px] font-black uppercase tracking-wider ${
                    activeTier === tier.tier ? 'text-white' : 'text-slate-500'
                  }`}>
                    {tier.tier}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View className="bg-slate-50 border border-slate-100 p-4 rounded-2xl mb-4">
              <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Daily Spending Limit</Text>
              <Text className="text-slate-900 font-extrabold text-lg mt-1">{currentTierInfo.limit}</Text>
            </View>

            <Text className="text-slate-400 text-[10px] font-black uppercase tracking-wider mb-2 ml-1">Tier Benefits</Text>
            <View className="gap-2.5">
              {currentTierInfo.benefits.map((benefit, i) => (
                <View key={i} className="flex-row items-center">
                  <View className="w-1.5 h-1.5 rounded-full bg-ventureroot-green mr-2.5" />
                  <Text className="text-slate-700 text-xs font-semibold leading-normal">{benefit}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Connected Financial Channels */}
          <View className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm mb-8">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-slate-900 font-bold text-base">Payment Channels</Text>
              <TouchableOpacity className="flex-row items-center bg-slate-100 px-3 py-1.5 rounded-full">
                <Plus size={12} color="#475569" />
                <Text className="text-slate-700 text-[10px] font-bold ml-1">Add Channel</Text>
              </TouchableOpacity>
            </View>

            {/* Bank Channel */}
            <View className="flex-row items-center justify-between p-3.5 border border-slate-100 rounded-2xl mb-3">
              <View className="flex-row items-center">
                <View className="w-10 h-10 bg-blue-50 rounded-xl items-center justify-center mr-3">
                  <Building size={20} color="#2563EB" />
                </View>
                <View>
                  <Text className="text-slate-900 font-extrabold text-sm">Access Bank plc</Text>
                  <Text className="text-slate-400 text-[10px] mt-0.5">Account ending in *4821 · NUBAN</Text>
                </View>
              </View>
              <Text className="text-emerald-600 text-[10px] font-bold">PRIMARY</Text>
            </View>

            {/* Card Channel */}
            <View className="flex-row items-center justify-between p-3.5 border border-slate-100 rounded-2xl">
              <View className="flex-row items-center">
                <View className="w-10 h-10 bg-slate-100 rounded-xl items-center justify-center mr-3">
                  <CreditCard size={20} color="#475569" />
                </View>
                <View>
                  <Text className="text-slate-900 font-extrabold text-sm">Verve Card</Text>
                  <Text className="text-slate-400 text-[10px] mt-0.5">Card ending in *9901 · Exp 08/29</Text>
                </View>
              </View>
              <Text className="text-slate-400 text-[10px] font-bold">ACTIVE</Text>
            </View>
          </View>
          
          <View className="h-10" />
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
};

export default AccountDetailsScreen;
