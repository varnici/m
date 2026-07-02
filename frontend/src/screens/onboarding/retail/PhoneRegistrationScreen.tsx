import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, TextInput, Animated, Alert, ActivityIndicator } from 'react-native';
import OnboardingShell, { OnboardingButton, OnboardingInput } from '@/components/onboarding/OnboardingShell';
import { useOnboardingNav } from '@/hooks/useOnboardingNav';
import { validatePhone, formatPhoneInput } from '@/utils/validation';
import { ShieldCheck } from 'lucide-react-native';
import { colors } from '@/theme/colors';
import { supabase } from '@/lib/supabase';

const OTP_LENGTH = 6;
const COUNTDOWN_SECONDS = 180;

const PhoneRegistrationScreen = () => {
  const { goNext, goBack, step, total, data } = useOnboardingNav();

  const [phone, setPhone] = useState(data.phone || '');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const otpRef = useRef<TextInput>(null);

  const phoneValidation = phone ? validatePhone(phone.replace(/\D/g, '')) : { valid: false };

  useEffect(() => {
    if (!isOtpSent) return;
    setCountdown(COUNTDOWN_SECONDS);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isOtpSent]);

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

  const buildE164 = (raw: string) => {
    const digits = raw.replace(/\D/g, '');
    const local = digits.replace(/^0/, '');
    return `+234${local}`;
  };

  const handleSendOtp = async () => {
    setSending(true);
    const fullPhone = buildE164(phone);
    const { error } = await supabase.auth.updateUser({ phone: fullPhone });
    setSending(false);
    if (error) {
      Alert.alert('Could not send code', error.message);
      return;
    }
    setIsOtpSent(true);
    setOtp('');
    setOtpError('');
  };

  const handleVerify = async () => {
    if (otp.length < OTP_LENGTH) return;
    setVerifying(true);
    const fullPhone = buildE164(phone);
    const { error } = await supabase.auth.verifyOtp({
      phone: fullPhone,
      token: otp,
      type: 'phone_change',
    });
    setVerifying(false);
    if (error) {
      setOtpError('Incorrect code. Please try again.');
      triggerShake();
      return;
    }
    goNext({ phone: fullPhone, phoneVerified: true });
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

  const handleResend = async () => {
    setOtp('');
    setOtpError('');
    await handleSendOtp();
  };

  const handlePhoneChange = (text: string) => {
    setPhone(formatPhoneInput(text));
  };

  if (!isOtpSent) {
    return (
      <OnboardingShell
        currentStep={step}
        totalSteps={total}
        title="Phone Number"
        subtitle="Secure your business profile with a verified phone number."
        onBack={goBack}
        footer={
          <OnboardingButton
            title={sending ? 'Sending...' : 'Send Verification Code'}
            onPress={handleSendOtp}
            disabled={!phoneValidation.valid || sending}
          />
        }
      >
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
            SIM KYC CROSS-CHECK READY
          </Text>
        </View>

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
                onChangeText={handlePhoneChange}
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
          ) : (
            <Text style={{ fontSize: 11, color: '#94A3B8', marginTop: 6, lineHeight: 16 }}>
              This will be used for your secure login and transaction authorization.
            </Text>
          )}
        </View>
      </OnboardingShell>
    );
  }

  return (
    <OnboardingShell
      currentStep={step}
      totalSteps={total}
      title="Verification"
      subtitle={`We sent a 6-digit code to +234 ${phone}`}
      onBack={handleBack}
      footer={
        <OnboardingButton
          title={verifying ? 'Verifying...' : 'Verify & Continue'}
          onPress={handleVerify}
          disabled={otp.length < OTP_LENGTH || verifying}
        />
      }
    >
      <Animated.View style={{ alignItems: 'center', marginTop: 16, transform: [{ translateX: shakeAnim }] }}>
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

      <View style={{ alignItems: 'center', marginTop: 24 }}>
        {sending ? (
          <ActivityIndicator size="small" color={colors.ventureroot.green} />
        ) : (
          <>
            <Text style={{ fontSize: 13, color: '#64748B', marginBottom: 8 }}>
              {countdown > 0 ? `Resend code in ${formatCountdown()}` : "Didn't receive a code?"}
            </Text>
            {countdown === 0 && (
              <TouchableOpacity onPress={handleResend}>
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
