import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import OnboardingShell, { OnboardingButton } from '@/components/onboarding/OnboardingShell';
import { useOnboardingNav } from '@/hooks/useOnboardingNav';
import { validatePhone, formatPhoneInput } from '@/utils/validation';
import { Phone, CheckCircle2, Mail, ArrowRight } from 'lucide-react-native';
import { colors } from '@/theme/colors';
import { otpService, type OtpChannel } from '@/services/otpService';

export default function WorkerPhoneScreen() {
  const { goNext, goBack, step, total, data } = useOnboardingNav();

  const [channel, setChannel] = useState<OtpChannel>('email');

  // ── SMS ──────────────────────────────────────────────────────────────────
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

  // ── Email ─────────────────────────────────────────────────────────────────
  const [email, setEmail] = useState(data.email ?? '');
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  // ── Send OTP & navigate ───────────────────────────────────────────────────
  const [sending, setSending] = useState(false);

  const handleContinue = useCallback(async () => {
    setSending(true);
    try {
      if (channel === 'sms') {
        const fullPhone = `+234${digitsOnly.replace(/^0/, '')}`;
        await otpService.sendOtp(fullPhone, 'sms', 'phone_verify');
        goNext({ phone: fullPhone, otpTarget: fullPhone, otpChannel: 'sms' });
      } else {
        const target = email.trim().toLowerCase();
        await otpService.sendOtp(target, 'email', 'phone_verify');
        goNext({ email: target, otpTarget: target, otpChannel: 'email' });
      }
    } catch (err: any) {
      Alert.alert('Could not send code', err.message || 'Please try again.');
    } finally {
      setSending(false);
    }
  }, [channel, digitsOnly, email, goNext]);

  const canContinue = channel === 'sms' ? phoneValidation.valid : emailValid;

  return (
    <OnboardingShell
      currentStep={step}
      totalSteps={total}
      title={channel === 'sms' ? 'Your phone number' : 'Email verification'}
      subtitle={
        channel === 'sms'
          ? "We'll send a verification code via SMS to confirm your number."
          : "We'll send a 6-digit code to your email address."
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
        {/* ── Phone input ── */}
        {channel === 'sms' && (
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
        )}

        {/* ── Email input ── */}
        {channel === 'email' && (
          <View style={{ marginTop: 8 }}>
            <Text style={styles.label}>EMAIL ADDRESS</Text>
            <View style={[
              styles.emailRow,
              email && !emailValid && styles.phoneRowError,
              emailValid && styles.phoneRowValid,
            ]}>
              <Mail size={16} color={colors.ventureroot.green} style={{ marginRight: 10 }} />
              <TextInput
                style={styles.phoneInput}
                value={email}
                onChangeText={setEmail}
                placeholder="you@domain.com"
                placeholderTextColor="#94A3B8"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            {email && !emailValid && (
              <Text style={styles.errorText}>Please enter a valid email address.</Text>
            )}
            {emailValid && (
              <View style={styles.validRow}>
                <CheckCircle2 size={14} color={colors.status.success} />
                <Text style={styles.validText}>Valid email address</Text>
              </View>
            )}
          </View>
        )}

        {/* ── Channel toggle ── */}
        <View style={{ alignItems: 'center', marginTop: 24 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', opacity: 0.35, marginBottom: 12 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: '#CBD5E1' }} />
            <Text style={{ fontSize: 11, color: '#475569', marginHorizontal: 12 }}>or</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: '#CBD5E1' }} />
          </View>

          <TouchableOpacity
            onPress={() => setChannel(channel === 'sms' ? 'email' : 'sms')}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 }}
          >
            {channel === 'sms'
              ? <Mail size={14} color={colors.ventureroot.green} />
              : <Phone size={14} color={colors.ventureroot.green} />}
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.ventureroot.green }}>
              {channel === 'sms' ? 'Use email verification instead' : 'Use SMS verification instead'}
            </Text>
            <ArrowRight size={13} color={colors.ventureroot.green} />
          </TouchableOpacity>
        </View>

        {/* Footer note */}
        <View style={{ marginTop: 'auto', paddingBottom: 12, paddingTop: 24 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            {channel === 'sms'
              ? <Phone size={14} color="#94A3B8" style={{ marginTop: 2, marginRight: 8 }} />
              : <Mail size={14} color="#94A3B8" style={{ marginTop: 2, marginRight: 8 }} />}
            <Text style={{ fontSize: 12, color: '#94A3B8', lineHeight: 18, flex: 1 }}>
              {channel === 'sms'
                ? 'Standard SMS rates may apply. We will never share your phone number with third parties.'
                : 'A secure 6-digit code will be sent to your inbox. Check your spam folder if you don\'t see it.'}
            </Text>
          </View>
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
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
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
