import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, CheckCircle2, Shield, Zap } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { acceptPolicy, getPolicy } from '@/services/budgetBestApi';

const BudgetBestPolicy = ({ navigation }: any) => {
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [policyId, setPolicyId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const policy = await getPolicy('1.0');
        setPolicyId(policy.id);
        setAccepted(policy.accepted);
      } catch {
        // Keep UI usable even if policy fetch fails.
      }
    })();
  }, []);

  const handleAccept = async () => {
    try {
      setLoading(true);
      if (!policyId) {
        throw new Error('Policy record unavailable');
      }
      await acceptPolicy(policyId);
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View className="px-6 py-4 flex-row items-center justify-between border-b border-white/10">
        <Text className="text-white text-xl font-bold">Budget_Best Terms</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <X color="white" size={24} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} className="flex-1 px-6 py-6">
        {/* Trust Badge */}
        <View className="mb-6">
          <LinearGradient
            colors={['#10B981', '#059669']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="rounded-2xl p-6 items-center"
          >
            <Shield color="white" size={40} />
            <Text className="text-white text-lg font-bold mt-3 text-center">
              Budget_Best Guarantee
            </Text>
            <Text className="text-white/90 text-sm mt-2 text-center">
              Your money is protected, your future is secure
            </Text>
          </LinearGradient>
        </View>

        {/* The Core Promise */}
        <View className="mb-6">
          <Text className="text-white text-lg font-bold mb-3">
            The Core Promise
          </Text>
          <View className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4">
            <Text className="text-emerald-200 text-base leading-relaxed">
              We believe in{' '}
              <Text className="font-bold">1:1 value</Text>
              . Every naira you save is yours. Your savings are protected and
              cannot be reduced by management fees.
            </Text>
          </View>
        </View>

        {/* Example */}
        <View className="mb-6 bg-white/5 border border-white/10 rounded-2xl p-4">
          <Text className="text-white font-bold text-sm mb-3 uppercase">
            Example: Monthly Savings
          </Text>
          <View className="space-y-3">
            <View className="flex-row items-center justify-between">
              <Text className="text-white/60">Daily deposit</Text>
              <Text className="text-white font-bold">₦200</Text>
            </View>
            <View className="flex-row items-center justify-between">
              <Text className="text-white/60">For 30 days</Text>
              <Text className="text-white font-bold">₦6,000</Text>
            </View>
            <View className="border-t border-white/10 pt-3 flex-row items-center justify-between">
              <Text className="text-white font-bold">You receive</Text>
              <Text className="text-emerald-400 text-lg font-bold">
                ₦6,000
              </Text>
            </View>
            <Text className="text-white/60 text-xs mt-2">
              ✓ No deductions · ✓ No hidden fees · ✓ 100% guaranteed
            </Text>
          </View>
        </View>

        {/* How We Sustain */}
        <View className="mb-6">
          <Text className="text-white text-lg font-bold mb-3">
            How We Sustain This
          </Text>
          <View className="space-y-3">
            {[
              {
                title: 'Interest Income',
                desc: 'We earn approximately 1% annual interest on aggregated savings held in tier-1 banks.',
              },
              {
                title: 'Premium Features',
                desc: 'Advanced analytics, priority reminders, and white-label options for businesses are paid features.',
              },
              {
                title: 'Service Revenue',
                desc: 'Optional auto-sweep and financial advisory services generate additional revenue.',
              },
            ].map((item, idx) => (
              <View key={idx} className="bg-white/5 border border-white/10 rounded-lg p-3">
                <Text className="text-white font-semibold text-sm">
                  {item.title}
                </Text>
                <Text className="text-white/60 text-xs mt-1">{item.desc}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Data Security */}
        <View className="mb-6">
          <Text className="text-white text-lg font-bold mb-3">
            Your Data is Safe
          </Text>
          <View className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
            <View className="flex-row gap-3">
              <Zap color="#60A5FA" size={20} />
              <View className="flex-1">
                <Text className="text-white font-semibold text-sm">
                  Bank-Grade Security
                </Text>
                <Text className="text-white/60 text-xs mt-1">
                  AES-256 encryption for all transactions
                </Text>
              </View>
            </View>
            <View className="flex-row gap-3">
              <Zap color="#60A5FA" size={20} />
              <View className="flex-1">
                <Text className="text-white font-semibold text-sm">
                  Regulatory Compliance
                </Text>
                <Text className="text-white/60 text-xs mt-1">
                  Compliant with CBN and NDIC guidelines
                </Text>
              </View>
            </View>
            <View className="flex-row gap-3">
              <Zap color="#60A5FA" size={20} />
              <View className="flex-1">
                <Text className="text-white font-semibold text-sm">
                  Regular Audits
                </Text>
                <Text className="text-white/60 text-xs mt-1">
                  Third-party security audits quarterly
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Terms Summary */}
        <View className="mb-6">
          <Text className="text-white text-lg font-bold mb-3">
            Quick Terms Summary
          </Text>
          <View className="space-y-2">
            {[
              'Minimum daily deposit: ₦100',
              'Maximum monthly goal: ₦500,000',
              'Savings held with Tier-1 Banks',
              'Withdrawal available anytime',
              'Zero penalties for early withdrawal',
              'Interest credited quarterly',
              'Emergency withdrawal with 24h notice',
            ].map((term, idx) => (
              <View key={idx} className="flex-row items-start gap-2">
                <CheckCircle2 color="#10B981" size={16} className="mt-1" />
                <Text className="text-white/80 text-sm flex-1">{term}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Full Policy Text */}
        <View className="mb-20">
          <Text className="text-white text-sm font-mono bg-white/5 p-4 rounded-lg">
            {`BUDGET_BEST: ZERO-LOSS SAVINGS GUARANTEE

Effective Date: January 1, 2024
Version: 1.0

1. THE BUDGET_BEST GUARANTEE
We believe in 1:1 value. Every amount you save is yours.
Your savings are protected and cannot be reduced by management fees.

Example: If you save ₦200 daily for 30 days, you will receive
₦6,000 at the month's end, regardless of fees.

2. HOW WE COVER COSTS
Our operational costs are covered through:
- A transparent 1% annual interest earned on aggregated savings
- Optional premium features (premium reminders, advanced analytics)
- Auto-sweep and advisory service fees
- No deduction from your principal savings amount

3. YOUR SAVINGS ARE YOURS
- 100% of your daily deposits go to your savings
- Interest earned helps sustain the platform
- You can withdraw anytime (subject to active goals)
- Emergency withdrawal with 24-hour notice

4. DATA SECURITY
- All transactions encrypted with industry-standard SSL
- Your data is protected under banking-grade security standards
- Regular security audits by third-party professionals
- GDPR and CBN compliant

5. DISPUTE RESOLUTION
- Any discrepancies resolved within 48 hours
- Escalation to financial ombudsman if needed
- Full transaction history available anytime

6. MODIFICATIONS
- Policy changes announced 30 days in advance
- Your consent required for material changes
- Right to close account without penalty

By accepting these terms, you understand and agree to Budget_Best's
savings guarantee and data protection policies.`}
          </Text>
        </View>
      </ScrollView>

      {/* Footer */}
      <View className="px-6 py-4 border-t border-white/10 gap-3">
        <TouchableOpacity
          onPress={() => setAccepted(!accepted)}
          className="flex-row items-center gap-3 py-3 px-4 bg-white/5 border border-white/10 rounded-lg"
        >
          <View
            className={`w-5 h-5 rounded border-2 items-center justify-center ${
              accepted
                ? 'bg-emerald-500 border-emerald-500'
                : 'border-white/30'
            }`}
          >
            {accepted && <CheckCircle2 color="white" size={16} />}
          </View>
          <Text className="text-white text-sm">
            I accept the Budget_Best Guarantee
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleAccept}
          disabled={!accepted || loading}
          className={`py-4 rounded-lg items-center ${
            accepted ? 'bg-emerald-500' : 'bg-white/10'
          }`}
        >
          {loading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text
              className={`font-bold text-lg ${
                accepted ? 'text-white' : 'text-white/50'
              }`}
            >
              Continue to Budget_Best
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default BudgetBestPolicy;
