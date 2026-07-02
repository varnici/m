import React, { useState, useCallback } from 'react';
import { View, Text, ActivityIndicator, Alert } from 'react-native';
import OnboardingShell, { OnboardingButton } from '@/components/onboarding/OnboardingShell';
import { useOnboardingNav } from '@/hooks/useOnboardingNav';
import { useAuth } from '@/context/AuthContext';
import { useOnboardingStore } from '@/store/onboardingStore';
import { useUserProfileStore } from '@/store/userProfileStore';
import { submitWorkerOnboarding } from '@/services/onboardingSubmitService';
import { CheckCircle, Shield, Clock, TrendingUp, Zap, AlertCircle } from 'lucide-react-native';
import { colors } from '@/theme/colors';
import { useNavigation } from '@react-navigation/native';
import type { RootStackNavigation } from '@/navigation/types';

const RISK_DISPLAY: Record<string, { icon: typeof Shield; color: string; bg: string; label: string }> = {
  Conservative: { icon: Shield, color: '#3B82F6', bg: '#DBEAFE', label: 'Conservative — low-risk, steady returns' },
  Balanced: { icon: TrendingUp, color: colors.ventureroot.green, bg: '#D1FAE5', label: 'Balanced — moderate risk, solid returns' },
  Aggressive: { icon: Zap, color: '#F59E0B', bg: '#FEF3C7', label: 'Aggressive — high growth, higher risk' },
};

const WorkerCompletionScreen = () => {
  const { step, total, data } = useOnboardingNav();
  const { user } = useAuth();
  const navigation = useNavigation<RootStackNavigation>();
  const completeOnboarding = useOnboardingStore((s) => s.completeOnboarding);
  const setAccountType = useUserProfileStore((s) => s.setAccountType);

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const riskProfile = data.riskProfile ?? 'Balanced';
  const riskInfo = RISK_DISPLAY[riskProfile] ?? RISK_DISPLAY.Balanced;
  const RiskIcon = riskInfo.icon;

  const handleContinue = useCallback(async () => {
    if (!user?.id) {
      Alert.alert('Error', 'Session expired. Please log in again.');
      return;
    }

    setSubmitting(true);
    const result = await submitWorkerOnboarding(data, user.id);
    setSubmitting(false);

    if (!result.success) {
      Alert.alert(
        'Submission Failed',
        result.error || 'Something went wrong. Please try again.',
        [{ text: 'Retry', onPress: handleContinue }, { text: 'Cancel' }],
      );
      return;
    }

    setSubmitted(true);
    setAccountType('nine_to_five');
    completeOnboarding();

    setTimeout(() => {
      navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
    }, 600);
  }, [user, data, completeOnboarding, setAccountType, navigation]);

  return (
    <OnboardingShell
      currentStep={step}
      totalSteps={total}
      title="You're all set!"
      scrollable={false}
      footer={
        <OnboardingButton
          title={submitting ? 'Creating your account...' : submitted ? 'Redirecting...' : 'Continue to your dashboard'}
          onPress={handleContinue}
          disabled={submitting || submitted}
        />
      }
    >
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16 }}>
        {submitting ? (
          <>
            <ActivityIndicator size="large" color={colors.ventureroot.green} style={{ marginBottom: 24 }} />
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#0F172A', textAlign: 'center' }}>
              Setting up your account...
            </Text>
            <Text style={{ fontSize: 13, color: '#64748B', textAlign: 'center', marginTop: 6 }}>
              This only takes a moment.
            </Text>
          </>
        ) : (
          <>
            <View
              style={{
                width: 88,
                height: 88,
                borderRadius: 44,
                backgroundColor: '#D1FAE5',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 24,
              }}
            >
              <CheckCircle size={44} color={colors.ventureroot.green} />
            </View>

            <Text
              style={{
                fontSize: 22,
                fontWeight: '800',
                color: '#0F172A',
                textAlign: 'center',
                marginBottom: 6,
              }}
            >
              Account Created
            </Text>

            <Text
              style={{
                fontSize: 14,
                color: '#64748B',
                textAlign: 'center',
                lineHeight: 20,
                marginBottom: 32,
              }}
            >
              Your investment account is ready. Start exploring local business
              opportunities on the marketplace.
            </Text>

            <View
              style={{
                backgroundColor: '#F8FAFC',
                borderRadius: 16,
                padding: 20,
                width: '100%',
                gap: 16,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    backgroundColor: riskInfo.bg,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <RiskIcon size={20} color={riskInfo.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#0F172A' }}>
                    Risk Profile
                  </Text>
                  <Text style={{ fontSize: 12, color: '#64748B' }}>
                    {riskInfo.label}
                  </Text>
                </View>
              </View>

              {data.firstName && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      backgroundColor: '#EDE9FE',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 18, fontWeight: '700', color: '#7C3AED' }}>
                      {data.firstName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#0F172A' }}>
                      {data.firstName} {data.lastName}
                    </Text>
                    <Text style={{ fontSize: 12, color: '#64748B' }}>
                      {data.employer ?? 'Worker account'}
                    </Text>
                  </View>
                </View>
              )}

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    backgroundColor: '#FEF3C7',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Clock size={20} color="#D97706" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#0F172A' }}>
                    Identity Verification
                  </Text>
                  <Text style={{ fontSize: 12, color: '#64748B' }}>
                    In progress — we'll notify you when confirmed
                  </Text>
                </View>
              </View>
            </View>
          </>
        )}
      </View>
    </OnboardingShell>
  );
};

export default WorkerCompletionScreen;
