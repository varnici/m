import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, StyleSheet, useWindowDimensions } from 'react-native';
import OnboardingShell, { OnboardingButton } from '@/components/onboarding/OnboardingShell';
import { useOnboardingNav } from '@/hooks/useOnboardingNav';
import { Phone, CheckCircle2 } from 'lucide-react-native';
import { colors } from '@/theme/colors';

export default function WorkerPhoneScreen() {
  const { goNext, goBack, step, total } = useOnboardingNav();
  const { width } = useWindowDimensions();
  const horizontalPadding = Math.max(20, width * 0.06);

  const [phone, setPhone] = useState('');
  const [touched, setTouched] = useState(false);

  const digitsOnly = phone.replace(/\D/g, '');
  const isValid = digitsOnly.length === 10;
  const showError = touched && digitsOnly.length > 0 && digitsOnly.length < 10;

  const formatPhone = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, 10);
    // Format as XXX XXXX XXX
    if (digits.length <= 3) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
    return `${digits.slice(0, 3)} ${digits.slice(3, 7)} ${digits.slice(7)}`;
  };

  const handlePhoneChange = useCallback((text: string) => {
    const digits = text.replace(/\D/g, '');
    if (digits.length <= 10) {
      setPhone(text);
    }
    if (!touched && digits.length > 0) setTouched(true);
  }, [touched]);

  const handleContinue = useCallback(() => {
    goNext({ phone: digitsOnly });
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
          title="Continue"
          onPress={handleContinue}
          disabled={!isValid}
        />
      }
    >
      <View style={{ marginTop: 8 }}>
        <Text style={styles.label}>PHONE NUMBER</Text>
        <View style={[
          styles.phoneRow,
          showError && styles.phoneRowError,
          isValid && touched && styles.phoneRowValid,
        ]}>
          <View style={styles.countryCode}>
            <Text style={styles.flag}>🇳🇬</Text>
            <Text style={styles.codeText}>+234</Text>
          </View>
          <View style={styles.divider} />
          <TextInput
            style={styles.phoneInput}
            value={formatPhone(phone)}
            onChangeText={handlePhoneChange}
            placeholder="801 2345 678"
            placeholderTextColor="#94A3B8"
            keyboardType="phone-pad"
            maxLength={12} // 10 digits + 2 spaces
          />
        </View>

        {showError && (
          <Text style={styles.errorText}>
            Please enter a valid 10-digit phone number
          </Text>
        )}

        {isValid && touched && (
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
