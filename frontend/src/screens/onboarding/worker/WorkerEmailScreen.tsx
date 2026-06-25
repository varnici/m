import React, { useState, useCallback } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import OnboardingShell, { OnboardingButton, OnboardingInput } from '@/components/onboarding/OnboardingShell';
import { useOnboardingNav } from '@/hooks/useOnboardingNav';
import { Mail, CheckCircle2 } from 'lucide-react-native';
import { colors } from '@/theme/colors';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function WorkerEmailScreen() {
  const { goNext, goBack, step, total } = useOnboardingNav();

  const [email, setEmail] = useState('');
  const [touched, setTouched] = useState(false);
  const [checking, setChecking] = useState(false);
  const [accountExists, setAccountExists] = useState(false);

  const isValidFormat = EMAIL_REGEX.test(email);
  const showError = touched && email.length > 0 && !isValidFormat;
  const showAccountError = touched && isValidFormat && accountExists;

  const handleEmailChange = useCallback((text: string) => {
    setEmail(text.trim());
    setAccountExists(false);
    if (!touched && text.length > 0) setTouched(true);
  }, [touched]);

  const handleContinue = useCallback(() => {
    setChecking(true);
    setTimeout(() => {
      setChecking(false);
      const exists = false;
      setAccountExists(exists);
      if (!exists) {
        goNext({ email });
      }
    }, 1200);
  }, [email, goNext]);

  const canContinue = isValidFormat && !checking && !accountExists;

  return (
    <OnboardingShell
      currentStep={step}
      totalSteps={total}
      title="What's your email?"
      subtitle="We'll use this to secure your account and send important updates."
      onBack={goBack}
      footer={
        <OnboardingButton
          title={checking ? 'Checking...' : 'Continue'}
          onPress={handleContinue}
          disabled={!canContinue}
        />
      }
    >
      <View style={{ marginTop: 8 }}>
        <OnboardingInput
          label="EMAIL ADDRESS"
          value={email}
          onChangeText={handleEmailChange}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          error={
            showError
              ? 'Please enter a valid email address'
              : showAccountError
              ? 'An account with this email already exists'
              : undefined
          }
        />

        {checking && (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
            <ActivityIndicator size="small" color={colors.ventureroot.green} />
            <Text style={{ fontSize: 12, color: '#64748B', marginLeft: 8 }}>
              Checking availability...
            </Text>
          </View>
        )}

        {isValidFormat && !checking && !accountExists && touched && (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
            <CheckCircle2 size={14} color={colors.status.success} />
            <Text style={{ fontSize: 12, color: colors.status.success, marginLeft: 6 }}>
              Email format looks good
            </Text>
          </View>
        )}
      </View>

      <View style={{ marginTop: 'auto', paddingBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
          <Mail size={14} color="#94A3B8" style={{ marginTop: 2, marginRight: 8 }} />
          <Text style={{ fontSize: 12, color: '#94A3B8', lineHeight: 18, flex: 1 }}>
            You'll receive a verification code at this email address in the next step.
            Make sure you have access to this inbox.
          </Text>
        </View>
      </View>
    </OnboardingShell>
  );
}
