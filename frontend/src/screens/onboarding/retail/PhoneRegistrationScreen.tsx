import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Animated,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import OnboardingShell, { OnboardingButton } from '@/components/onboarding/OnboardingShell';
import { useOnboardingNav } from '@/hooks/useOnboardingNav';
import { validatePhone, formatPhoneInput } from '@/utils/validation';
import { ShieldCheck, Phone, Mail } from 'lucide-react-native';
import { colors } from '@/theme/colors';
import { otpService } from '@/services/otpService';
import { OTP_VERIFICATION_ENABLED } from '@/config/otpConfig';

const OTP_LENGTH = 6;
const COUNTDOWN_SECONDS = 180;

const PhoneRegistrationScreen = () => {
  const { goNext, goBack, step, total, data } = useOnboardingNav();

  // ── Phone ──────────────────────────────────────────────────────────────────
  const [phone, setPhone] = useState(data.phone || '');
  const phoneValidation = phone ? validatePhone(phone.replace(/\D/g, '')) : { valid: false };

  const buildE164 = (raw: string) => {
    const digits = raw.replace(/\D/g, '');
    const local = digits.replace(/^0/, '');
    return `+234${local}`;
  };

  // ── Email ──────────────────────────────────────────────────────────────────
  const [email, setEmail] = useState(data.email || '');
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  // ── OTP state ──────────────────────────────────────────────────────────────
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [sentPhone, setSentPhone] = useState('');
  const [sentEmail, setSentEmail] = useState('');
  const [deliveryNote, setDeliveryNote] = useState('');

  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const otpRef = useRef<TextInput>(null);

  // ── Countdown ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOtpSent) return;
    setCountdown(COUNTDOWN_SECONDS);
    const id = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) { clearInterval(id); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [isOtpSent, sentPhone, sentEmail]);

  const formatCountdown = () => {
    const m = Math.floor(countdown / 60);
    const s = countdown % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  // ── Send OTP (both channels) ──────────────────────────────────────────────
  const doSendOtp = async (targetPhone: string, targetEmail: string) => {
    setSending(true);
    try {
      const result = await otpService.sendOtp(targetPhone, targetEmail, 'phone_verify');
      setSentPhone(targetPhone);
      setSentEmail(targetEmail);
      setIsOtpSent(true);
      setOtp('');
      setOtpError('');
      setDeliveryNote(
        result.sms_sent && result.email_sent
          ? ''
          : result.sms_sent
          ? "Email delivery didn't go through — use the code from your SMS."
          : result.email_sent
          ? "SMS delivery didn't go through — use the code from your email."
          : 'Delivery is not fully configured yet — check with support if no code arrives.'
      );
    } catch (err: any) {
      Alert.alert('Could not send code', err.message || 'Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleSendOtp = async () => {
    const fullPhone = buildE164(phone);
    const trimmedEmail = email.trim().toLowerCase();

    if (!OTP_VERIFICATION_ENABLED) {
      // Verification temporarily bypassed — see config/otpConfig.ts.
      goNext({
        phone: fullPhone,
        email: trimmedEmail,
        phoneVerified: true,
        emailVerified: true,
      });
      return;
    }

    await doSendOtp(fullPhone, trimmedEmail);
  };

  // ── Verify OTP ─────────────────────────────────────────────────────────────
  const handleVerify = async () => {
    if (otp.length < OTP_LENGTH) return;
    setVerifying(true);
    try {
      await otpService.verifyOtp(sentPhone, sentEmail, otp);
      goNext({
        phone: sentPhone,
        email: sentEmail,
        phoneVerified: true,
        emailVerified: true,
      });
    } catch (err: any) {
      setOtpError(err.message || 'Incorrect code. Please try again.');
      triggerShake();
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    setOtp('');
    setOtpError('');
    await doSendOtp(sentPhone, sentEmail);
  };

  const handleBack = () => {
    if (isOtpSent) {
      setIsOtpSent(false);
      setOtp('');
      setOtpError('');
    } else {
      goBack();
    }
  };

  // ── Input step ─────────────────────────────────────────────────────────────
  if (!isOtpSent) {
    const canSend = (phoneValidation as any).valid && emailValid;

    return (
      <OnboardingShell
        currentStep={step}
        totalSteps={total}
        title={OTP_VERIFICATION_ENABLED ? 'Verify Your Details' : 'Your Details'}
        subtitle={
          OTP_VERIFICATION_ENABLED
            ? "We'll send a 6-digit code to both your phone and email — either one works to verify."
            : 'Enter your phone and email to continue.'
        }
        onBack={goBack}
        footer={
          <OnboardingButton
            title={sending ? 'Sending...' : OTP_VERIFICATION_ENABLED ? 'Send Verification Code' : 'Continue'}
            onPress={handleSendOtp}
            disabled={!canSend || sending}
          />
        }
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {/* SIM KYC badge */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: 'rgba(0, 77, 44, 0.05)',
              alignSelf: 'flex-start',
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 8,
              marginBottom: 20,
            }}
          >
            <ShieldCheck size={14} color={colors.ventureroot.green} />
            <Text style={{ fontSize: 10, fontWeight: '700', color: colors.ventureroot.green, marginLeft: 6, letterSpacing: 0.5 }}>
              {OTP_VERIFICATION_ENABLED ? 'SMS + EMAIL VERIFICATION' : 'CONTACT DETAILS'}
            </Text>
          </View>

          {/* ── Phone input ── */}
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 6, letterSpacing: 0.5 }}>
              MOBILE NUMBER
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14 }}>
                <Text style={{ fontSize: 15, color: '#0F172A', fontWeight: '600' }}>+234</Text>
              </View>
              <View style={{ flex: 1 }}>
                <TextInput
                  value={phone}
                  onChangeText={(t) => {
                    const formatted = formatPhoneInput(t);
                    if (formatted.replace(/\D/g, '').length <= 10) setPhone(formatted);
                  }}
                  placeholder="801 234 5678"
                  placeholderTextColor="#94A3B8"
                  keyboardType="phone-pad"
                  maxLength={12}
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderWidth: 1.5,
                    borderColor: (phoneValidation as any).error && phone ? '#EF4444' : '#E2E8F0',
                    borderRadius: 12,
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    fontSize: 15,
                    color: '#0F172A',
                  }}
                />
              </View>
            </View>
            {(phoneValidation as any).error && phone ? (
              <Text style={{ fontSize: 12, color: '#EF4444', marginTop: 4 }}>{(phoneValidation as any).error}</Text>
            ) : null}
          </View>

          {/* ── Email input ── */}
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 6, letterSpacing: 0.5 }}>
              EMAIL ADDRESS
            </Text>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#FFFFFF',
              borderWidth: 1.5,
              borderColor: email && !emailValid ? '#EF4444' : '#E2E8F0',
              borderRadius: 12,
              paddingHorizontal: 16,
            }}>
              <Mail size={16} color={colors.ventureroot.green} style={{ marginRight: 10 }} />
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="you@domain.com"
                placeholderTextColor="#94A3B8"
                keyboardType="email-address"
                autoCapitalize="none"
                style={{ flex: 1, paddingVertical: 14, fontSize: 15, color: '#0F172A' }}
              />
            </View>
            {email && !emailValid && (
              <Text style={{ fontSize: 12, color: '#EF4444', marginTop: 4 }}>Please enter a valid email address.</Text>
            )}
          </View>

          <Text style={{ fontSize: 11, color: '#94A3B8', lineHeight: 16 }}>
            This will be used for secure login and transaction authorization.
          </Text>
        </KeyboardAvoidingView>
      </OnboardingShell>
    );
  }

  // ── OTP verification step ──────────────────────────────────────────────────
  return (
    <OnboardingShell
      currentStep={step}
      totalSteps={total}
      title="Verification"
      subtitle={`Code sent to +234 ${phone} and ${sentEmail}`}
      onBack={handleBack}
      footer={
        <OnboardingButton
          title={verifying ? 'Verifying...' : 'Verify & Continue'}
          onPress={handleVerify}
          disabled={otp.length < OTP_LENGTH || verifying}
        />
      }
    >
      {/* Channel badge */}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
        <View style={{
          flexDirection: 'row', alignItems: 'center',
          backgroundColor: 'rgba(0,77,44,0.05)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
        }}>
          <Phone size={13} color={colors.ventureroot.green} />
          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.ventureroot.green, marginLeft: 6, letterSpacing: 0.5 }}>
            SMS
          </Text>
        </View>
        <View style={{
          flexDirection: 'row', alignItems: 'center',
          backgroundColor: '#EFF6FF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
        }}>
          <Mail size={13} color="#3B82F6" />
          <Text style={{ fontSize: 11, fontWeight: '700', color: '#2563EB', marginLeft: 6, letterSpacing: 0.5 }}>
            EMAIL
          </Text>
        </View>
      </View>

      {deliveryNote ? (
        <Text style={{ fontSize: 12, color: '#B45309', backgroundColor: '#FFFBEB', padding: 10, borderRadius: 10, marginBottom: 16 }}>
          {deliveryNote}
        </Text>
      ) : null}

      {/* OTP boxes */}
      <Animated.View style={{ alignItems: 'center', marginTop: 8, transform: [{ translateX: shakeAnim }] }}>
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 12 }}>
          {Array.from({ length: OTP_LENGTH }).map((_, i) => (
            <View
              key={i}
              style={{
                width: 48, height: 60, borderRadius: 14,
                alignItems: 'center', justifyContent: 'center',
                borderWidth: 2,
                borderColor: otp[i] ? colors.ventureroot.green : otpError ? '#EF4444' : '#E2E8F0',
                backgroundColor: otp[i] ? 'rgba(0, 77, 44, 0.05)' : '#FFFFFF',
              }}
            >
              <Text style={{ fontSize: 24, fontWeight: '700', color: colors.ventureroot.green }}>
                {otp[i] || ''}
              </Text>
              {!otp[i] && (
                <View style={{ width: 16, height: 2, backgroundColor: '#CBD5E1', position: 'absolute', bottom: 14 }} />
              )}
            </View>
          ))}
        </View>

        {/* Hidden full-width tap-to-focus input */}
        <TextInput
          ref={otpRef}
          value={otp}
          onChangeText={(t) => {
            setOtpError('');
            setOtp(t.replace(/\D/g, '').slice(0, OTP_LENGTH));
          }}
          keyboardType="number-pad"
          autoFocus
          style={{ position: 'absolute', opacity: 0, width: '100%', height: 60 }}
        />
      </Animated.View>

      {otpError ? (
        <Text style={{ fontSize: 13, color: '#EF4444', textAlign: 'center', marginTop: 8 }}>{otpError}</Text>
      ) : null}

      {/* Resend */}
      <View style={{ alignItems: 'center', marginTop: 24 }}>
        {sending ? (
          <ActivityIndicator size="small" color={colors.ventureroot.green} />
        ) : (
          <>
            <Text style={{ fontSize: 13, color: '#64748B', marginBottom: 8 }}>
              {countdown > 0 ? `Resend code in ${formatCountdown()}` : "Didn't receive a code?"}
            </Text>

            {countdown === 0 && (
              <TouchableOpacity onPress={handleResend} style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.ventureroot.green }}>
                  Resend Code
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    </OnboardingShell>
  );
};

export default PhoneRegistrationScreen;
