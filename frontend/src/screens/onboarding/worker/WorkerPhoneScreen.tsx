import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, StyleSheet, Alert } from 'react-native';
import OnboardingShell, { OnboardingButton } from '@/components/onboarding/OnboardingShell';
import { useOnboardingNav } from '@/hooks/useOnboardingNav';
import { validatePhone, formatPhoneInput } from '@/utils/validation';
import { Phone, CheckCircle2 } from 'lucide-react-native';
import { colors } from '@/theme/colors';
import { supabase } from '@/lib/supabase';

export default function WorkerPhoneScreen() {
  const { goNext, goBack, step, total, data } = useOnboardingNav();

  const [phone, setPhone] = useState(data.phone ?? '');
  const [touched, setTouched] = useState(false);

  const digitsOnly = phone.replace(/\D/g, '');
  const validation = validatePhone(digitsOnly);
  const showError = touched && digitsOnly.length > 0 && !validation.valid;

  const handlePhoneChange = useCallback((text: string) => {
    const digits = text.replace(/\D/g, '');
    if (digits.length <= 10) {
      setPhone(formatPhoneInput(text));
    }
    if (!touched && digits.length > 0) setTouched(true);
  }, [touched]);

  const [sending, setSending] = useState(false);

  const handleContinue = useCallback(async () => {
    setSending(true);
    const fullPhone = `+234${digitsOnly.replace(/^0/, '')}`;
    const { error } = await supabase.auth.updateUser({ phone: fullPhone });
    setSending(false);
    if (error) {
      Alert.alert('Could not send code', error.message);
      return;
    }
    goNext({ phone: fullPhone });
  }, [goNext, digitsOnly]);

  return (
    <OnboardingShell
      currentStep={step}
      totalSteps={total}
      title="Your phone number"
      subtitle="We'll send a verification code via SMS to confirm your number."
      onBack={goBack}
      footer={
        <OnboardingButton
          title={sending ? 'Sending code...' : 'Continue'}
          onPress={handleContinue}
          disabled={!validation.valid || sending}
        />
      }
    >
      <View style={{ marginTop: 8 }}>
        <Text style={styles.label}>PHONE NUMBER</Text>
        <View style={[
          styles.phoneRow,
          showError && styles.phoneRowError,
          validation.valid && touched && styles.phoneRowValid,
        ]}>
          <View style={styles.countryCode}>
            <Text style={styles.flag}>🇳🇬</Text>
            <Text style={styles.codeText}>+234</Text>
          </View>
          <View style={styles.divider} />
          <TextInput
            style={styles.phoneInput}
            value={formatPhoneInput(phone)}
            onChangeText={handlePhoneChange}
            placeholder="801 234 5678"
            placeholderTextColor="#94A3B8"
            keyboardType="phone-pad"
            maxLength={12}
          />
        </View>

        {showError && (
          <Text style={styles.errorText}>{validation.error}</Text>
        )}

        {validation.valid && touched && (
          <View style={styles.validRow}>
            <CheckCircle2 size={14} color={colors.status.success} />
            <Text style={styles.validText}>Valid phone number</Text>
          </View>
        )}

        {digitsOnly.length > 0 && digitsOnly.length < 10 && touched && (
          <Text style={styles.counterText}>
            {digitsOnly.length}/10 digits entered
          </Text>
        )}
      </View>

      <View style={{ marginTop: 'auto', paddingBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
          <Phone size={14} color="#94A3B8" style={{ marginTop: 2, marginRight: 8 }} />
          <Text style={{ fontSize: 12, color: '#94A3B8', lineHeight: 18, flex: 1 }}>
            Standard SMS rates may apply. We will never share your phone number
            with third parties.
          </Text>
        </View>
      </View>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    overflow: 'hidden',
  },
  phoneRowError: {
    borderColor: '#EF4444',
  },
  phoneRowValid: {
    borderColor: '#10B981',
  },
  countryCode: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: '#F8FAFC',
  },
  flag: {
    fontSize: 18,
    marginRight: 6,
  },
  codeText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#334155',
  },
  divider: {
    width: 1,
    height: 28,
    backgroundColor: '#E2E8F0',
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
    color: '#0F172A',
    letterSpacing: 0.5,
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
  },
  validRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  validText: {
    fontSize: 12,
    color: '#10B981',
    marginLeft: 6,
  },
  counterText: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 4,
  },
});
