import React, { useState, useCallback } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import OnboardingShell, { OnboardingButton, OnboardingInput } from '@/components/onboarding/OnboardingShell';
import { useOnboardingNav } from '@/hooks/useOnboardingNav';
import { validateEmail } from '@/utils/validation';
import { Mail, CheckCircle2 } from 'lucide-react-native';
import { colors } from '@/theme/colors';
import { supabase } from '@/lib/supabase';

export default function WorkerEmailScreen() {
  const { goNext, goBack, step, total, data } = useOnboardingNav();

  const [email, setEmail] = useState(data.email ?? '');
  const [touched, setTouched] = useState(false);
  const [checking, setChecking] = useState(false);
  const [serverError, setServerError] = useState('');

  const validation = validateEmail(email);
  const showError = touched && email.length > 0 && !validation.valid;

  const handleEmailChange = useCallback((text: string) => {
    setEmail(text.trim());
    setServerError('');
    if (!touched && text.length > 0) setTouched(true);
  }, [touched]);

  const handleContinue = useCallback(async () => {
    setChecking(true);
    setServerError('');
    try {
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email.toLowerCase())
        .maybeSingle();
      if (existing) {
        setServerError('An account with this email already exists');
        setChecking(false);
        return;
      }
    } catch {
      // Non-fatal: auth layer will catch conflicts on submission
    }
    setChecking(false);
    goNext({ email: email.toLowerCase() });
  }, [email, goNext]);

  const canContinue = validation.valid && !checking && !serverError;

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
              ? validation.error
              : serverError || undefined
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

        {validation.valid && !checking && !serverError && touched && (
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
