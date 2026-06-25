import React from 'react';
import { View, Text } from 'react-native';
import OnboardingShell, { OnboardingButton } from '@/components/onboarding/OnboardingShell';
import { useOnboardingNav } from '@/hooks/useOnboardingNav';
import { ShieldCheck, Clock, Bell } from 'lucide-react-native';
import { colors } from '@/theme/colors';

const WorkerVerificationPendingScreen = () => {
  const { goNext, step, total } = useOnboardingNav();
  return (
    <OnboardingShell
      currentStep={step}
      totalSteps={total}
      title="Verification In Progress"
      scrollable={false}
      footer={
        <OnboardingButton
          title="Continue setting up your account"
          onPress={() => goNext()}
        />
      }
    >
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 }}>
        <View
          style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: '#D1FAE5',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 24,
          }}
        >
          <ShieldCheck size={36} color={colors.ventureroot.green} />
        </View>

        <Text style={{ fontSize: 20, fontWeight: '800', color: '#0F172A', marginBottom: 8, textAlign: 'center' }}>
          We're verifying your identity
        </Text>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 24 }}>
          <Clock size={14} color="#64748B" />
          <Text style={{ fontSize: 13, color: '#64748B' }}>
            Usually takes 30 seconds to 3 minutes
          </Text>
        </View>

        <View
          style={{
            backgroundColor: '#F8FAFC',
            borderRadius: 16,
            padding: 20,
            width: '100%',
            gap: 16,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: '#EFF6FF',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Bell size={18} color="#3B82F6" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#0F172A', marginBottom: 2 }}>
                We'll notify you
              </Text>
              <Text style={{ fontSize: 12, color: '#64748B', lineHeight: 17 }}>
                You can close the app and come back. We'll send a push notification when
                your identity is confirmed.
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: '#D1FAE5',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ShieldCheck size={18} color={colors.ventureroot.green} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#0F172A', marginBottom: 2 }}>
                Your data is secure
              </Text>
              <Text style={{ fontSize: 12, color: '#64748B', lineHeight: 17 }}>
                BVN and NIN are encrypted end-to-end and never stored in plain text.
              </Text>
            </View>
          </View>
        </View>
      </View>
    </OnboardingShell>
  );
};

export default WorkerVerificationPendingScreen;
