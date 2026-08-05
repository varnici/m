import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import OnboardingShell, { OnboardingButton } from '@/components/onboarding/OnboardingShell';
import { useOnboardingNav } from '@/hooks/useOnboardingNav';
import { validatePhone, formatPhoneInput } from '@/utils/validation';
import { CheckCircle2 } from 'lucide-react-native';
import { colors } from '@/theme/colors';
import { otpService } from '@/services/otpService';
import { OTP_VERIFICATION_ENABLED } from '@/config/otpConfig';

export default function WorkerPhoneScreen() {
  const { goNext, goBack, step, total, data } = useOnboardingNav();

  // Email was already collected (and validated) in WorkerEmailScreen — this
  // step only needs the phone number; the verification code that follows
  // goes to both automatically.
  const email = (data.email as string | undefined)?.trim().toLowerCase() ?? '';

  const [phone, setPhone] = useState(data.phone ?? '');
  const [phoneTouched, setPhoneTouched] = useState(false);
  const digitsOnly = phone.replace(/\D/g, '');
  const phoneValidation = validatePhone(digitsOnly);
  const showPhoneError = phoneTouched && digitsOnly.length > 0 && !phoneValidation.valid;

  const handlePhoneChange = useCallback((text: string) => {
    const digits = text.replace(/\D/g, '');
    if (digits.length <= 10) setPhone(formatPhoneInput(text));
    if (!phoneTouched && digits.length > 0) setPhoneTouched(true);
  }, [phoneTouched]);

  const [sending, setSending] = useState(false);

  const handleContinue = useCallback(async () => {
    if (!email) {
      Alert.alert('Missing email', 'Please go back and enter your email address first.');
      return;
    }
    const fullPhone = `+234${digitsOnly.replace(/^0/, '')}`;

    if (!OTP_VERIFICATION_ENABLED) {
      // Verification temporarily bypassed — see config/otpConfig.ts.
      goNext({ phone: fullPhone, phoneVerified: true, emailVerified: true });
      return;
    }

    setSending(true);
    try {
      await otpService.sendOtp(fullPhone, email, 'phone_verify');
      goNext({ phone: fullPhone, otpTarget: fullPhone });
    } catch (err: any) {
      Alert.alert('Could not send code', err.message || 'Please try again.');
    } finally {
      setSending(false);
    }
  }, [digitsOnly, email, goNext]);

  const canContinue = phoneValidation.valid;

  return (
    <OnboardingShell
      currentStep={step}
      totalSteps={total}
      title="Your phone number"
      subtitle={
        OTP_VERIFICATION_ENABLED
          ? "We'll send a verification code to both your phone and email."
          : 'Enter your phone number to continue.'
      }
      onBack={goBack}
      footer={
        <OnboardingButton
          title={sending ? 'Sending code...' : 'Continue'}
          onPress={handleContinue}
          disabled={!canContinue || sending}
        />
      }
    >
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ marginTop: 8 }}>
          <Text style={styles.label}>PHONE NUMBER</Text>
          <View style={[
            styles.phoneRow,
            showPhoneError && styles.phoneRowError,
            phoneValidation.valid && phoneTouched && styles.phoneRowValid,
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

          {showPhoneError && (
            <Text style={styles.errorText}>{phoneValidation.error}</Text>
          )}
          {phoneValidation.valid && phoneTouched && (
            <View style={styles.validRow}>
              <CheckCircle2 size={14} color={colors.status.success} />
              <Text style={styles.validText}>Valid phone number</Text>
            </View>
          )}
          {digitsOnly.length > 0 && digitsOnly.length < 10 && phoneTouched && (
            <Text style={styles.counterText}>{digitsOnly.length}/10 digits entered</Text>
          )}
        </View>

        <View style={{ marginTop: 'auto', paddingBottom: 12, paddingTop: 24 }}>
          <Text style={{ fontSize: 12, color: '#94A3B8', lineHeight: 18 }}>
            {OTP_VERIFICATION_ENABLED ? (
              <>
                Standard SMS rates may apply. Your verification code also goes to{' '}
                <Text style={{ fontWeight: '700' }}>{email}</Text> — either code works.
              </>
            ) : (
              'Used for secure login and transaction authorization.'
            )}
          </Text>
        </View>
      </KeyboardAvoidingView>
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
