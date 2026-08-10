import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity } from 'react-native';
import Toast from 'react-native-toast-message';
import OnboardingShell, { OnboardingButton } from '@/components/onboarding/OnboardingShell';
import { useOnboardingNav } from '@/hooks/useOnboardingNav';
import { submitRetailOnboarding } from '@/services/onboardingSubmitService';
import { useAuth } from '@/context/AuthContext';
import { useOnboardingStore } from '@/store/onboardingStore';
import { colors } from '@/theme/colors';

type Status = 'idle' | 'submitting' | 'success' | 'error';

const ActivationScreen = () => {
  const { goNext, step, total, data } = useOnboardingNav();
  const { user } = useAuth();
  const [status, setStatus] = useState<Status>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = useCallback(async () => {
    if (!user?.id) {
      setStatus('error');
      setErrorMessage('User session not found. Please log in again.');
      return;
    }

    setStatus('submitting');
    setErrorMessage(null);

    try {
      const result = await submitRetailOnboarding(data, user.id);

      if (result.success) {
        setStatus('success');
        if (result.kycMessage) {
          // Toast persists across the goNext() navigation below — an inline
          // banner on this screen would flash and vanish immediately.
          Toast.show({
            type: result.kycVerified ? 'success' : 'info',
            text1: result.kycVerified ? 'Identity verified' : 'Identity verification pending',
            text2: result.kycMessage,
            visibilityTime: 5000,
          });
        }
        useOnboardingStore.getState().completeOnboarding();
        goNext();
      } else {
        setStatus('error');
        setErrorMessage(result.error || 'Something went wrong during activation.');
      }
    } catch (err: any) {
      setStatus('error');
      setErrorMessage(err.message || 'An unexpected error occurred.');
    }
  }, [data, user, goNext]);

  useEffect(() => {
    handleSubmit();
  }, [handleSubmit]);

  return (
    <OnboardingShell
      currentStep={step}
      totalSteps={total}
      title="Activating Your Account"
      scrollable={false}
    >
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 }}>
        {status === 'submitting' && (
          <>
            <ActivityIndicator size="large" color={colors.ventureroot.green} style={{ marginBottom: 24 }} />
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 8, textAlign: 'center' }}>
              Setting up your account...
            </Text>
            <Text style={{ fontSize: 14, color: '#64748B', textAlign: 'center' }}>
              Syncing your business profile and securing payment gateways.
            </Text>
          </>
        )}

        {status === 'success' && (
          <>
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: '#F0FDF4',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 24,
              }}
            >
              <Text style={{ fontSize: 28, color: colors.ventureroot.green }}>{'✓'}</Text>
            </View>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 8, textAlign: 'center' }}>
              VentureRoot is ready!
            </Text>
            <Text style={{ fontSize: 14, color: '#64748B', textAlign: 'center' }}>
              Your account has been activated successfully.
            </Text>
          </>
        )}

        {status === 'error' && (
          <>
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: '#FEF2F2',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 24,
              }}
            >
              <Text style={{ fontSize: 28, color: '#EF4444' }}>!</Text>
            </View>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 8, textAlign: 'center' }}>
              Activation Failed
            </Text>
            <Text style={{ fontSize: 14, color: '#64748B', textAlign: 'center', marginBottom: 24 }}>
              {errorMessage}
            </Text>
            <OnboardingButton title="Retry" onPress={handleSubmit} />
          </>
        )}

        {status === 'idle' && (
          <>
            <ActivityIndicator size="large" color={colors.ventureroot.green} style={{ marginBottom: 24 }} />
            <Text style={{ fontSize: 14, color: '#64748B', textAlign: 'center' }}>
              Preparing activation...
            </Text>
          </>
        )}
      </View>
    </OnboardingShell>
  );
};

export default ActivationScreen;
