import React from 'react';
import { View, Text } from 'react-native';
import OnboardingShell, { OnboardingButton } from '@/components/onboarding/OnboardingShell';
import { useOnboardingNav } from '@/hooks/useOnboardingNav';
import { CheckCircle, Shield, Clock } from 'lucide-react-native';
import { colors } from '@/theme/colors';

const WorkerCompletionScreen = () => {
  const { goNext, step, total } = useOnboardingNav();
  return (
    <OnboardingShell
      currentStep={step}
      totalSteps={total}
      title="You're all set!"
      scrollable={false}
      footer={
        <OnboardingButton
          title="Continue to your dashboard"
          onPress={() => goNext()}
        />
      }
    >
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16 }}>
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
                backgroundColor: '#D1FAE5',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Shield size={20} color={colors.ventureroot.green} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#0F172A' }}>
                Risk Profile
              </Text>
              <Text style={{ fontSize: 12, color: '#64748B' }}>
                Balanced — moderate risk, solid returns
              </Text>
            </View>
          </View>

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
      </View>
    </OnboardingShell>
  );
};

export default WorkerCompletionScreen;
