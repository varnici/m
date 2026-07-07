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
import { ShieldCheck, Phone, Mail, ArrowRight } from 'lucide-react-native';
import { colors } from '@/theme/colors';
import { otpService, type OtpChannel } from '@/services/otpService';
import { sendEmailOtp, verifyEmailOtp } from '@/lib/emailOtp';

const OTP_LENGTH = 6;
const COUNTDOWN_SECONDS = 180;

const PhoneRegistrationScreen = () => {
  const { goNext, goBack, step, total, data } = useOnboardingNav();

  // ── Channel (sms | email) ──────────────────────────────────────────────────
  const [channel, setChannel] = useState<OtpChannel>('email');

  // ── SMS input ──────────────────────────────────────────────────────────────
  const [phone, setPhone] = useState(data.phone || '');
  const phoneValidation = phone ? validatePhone(phone.replace(/\D/g, '')) : { valid: false };

  const buildE164 = (raw: string) => {
    const digits = raw.replace(/\D/g, '');
    const local = digits.replace(/^0/, '');
    return `+234${local}`;
  };

  // ── Email input ────────────────────────────────────────────────────────────
  const [email, setEmail] = useState(data.email || '');
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  // ── OTP state ──────────────────────────────────────────────────────────────
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [sentTo, setSentTo] = useState('');          // display string
  const [sentChannel, setSentChannel] = useState<OtpChannel>('sms'); // channel used for send
  const [sentTarget, setSentTarget] = useState('');  // exact target used

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
  }, [isOtpSent, sentTarget]);

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

  // ── Send OTP ───────────────────────────────────────────────────────────────
  const doSendOtp = async (targetChannel: OtpChannel, target: string, display: string) => {
    setSending(true);
    try {
      if (targetChannel === 'email') {
        await sendEmailOtp(target);
      } else {
        await otpService.sendOtp(target, targetChannel, 'phone_verify');
      }
      setSentChannel(targetChannel);
      setSentTarget(target);
      setSentTo(display);
      setIsOtpSent(true);
      setOtp('');
      setOtpError('');
    } catch (err: any) {
      Alert.alert('Could not send code', err.message || 'Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleSendOtp = async () => {
    if (channel === 'sms') {
      const fullPhone = buildE164(phone);
      await doSendOtp('sms', fullPhone, `+234 ${phone}`);
    } else {
      await doSendOtp('email', email.trim().toLowerCase(), email.trim().toLowerCase());
    }
  };

  // ── Switch channel (in OTP step) ───────────────────────────────────────────
  const handleSwitchToEmail = async () => {
    if (!emailValid) {
      Alert.alert(
        'Email required',
        'Please go back and enter a valid email address to use email OTP.',
      );
      return;
    }
    const target = email.trim().toLowerCase();
    await doSendOtp('email', target, target);
  };

  const handleSwitchToSms = async () => {
    if (!(phoneValidation as any).valid) return;
    const fullPhone = buildE164(phone);
    await doSendOtp('sms', fullPhone, `+234 ${phone}`);
  };

  // ── Verify OTP ─────────────────────────────────────────────────────────────
  const handleVerify = async () => {
    if (otp.length < OTP_LENGTH) return;
    setVerifying(true);
    try {
      if (sentChannel === 'email') {
        await verifyEmailOtp(sentTarget, otp);
      } else {
        await otpService.verifyOtp(sentTarget, sentChannel, otp);
      }
      const patch: Record<string, any> = {
        phoneVerified: sentChannel === 'sms',
        emailVerified: sentChannel === 'email',
      };
      if (sentChannel === 'sms') patch.phone = sentTarget;
      if (sentChannel === 'email') patch.email = sentTarget;
      goNext(patch);
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
    await doSendOtp(sentChannel, sentTarget, sentTo);
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
    const canSend = channel === 'sms' ? (phoneValidation as any).valid : emailValid;

    return (
      <OnboardingShell
        currentStep={step}
        totalSteps={total}
        title="Phone Number"
        subtitle={
          channel === 'sms'
            ? 'Secure your business profile with a verified phone number.'
            : 'Enter your email address to receive a verification code.'
        }
        onBack={goBack}
        footer={
          <OnboardingButton
            title={sending ? 'Sending...' : 'Send Verification Code'}
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
              {channel === 'sms' ? 'SIM KYC CROSS-CHECK READY' : 'EMAIL VERIFICATION'}
            </Text>
          </View>

          {/* ── SMS input ── */}
          {channel === 'sms' && (
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
              ) : (
                <Text style={{ fontSize: 11, color: '#94A3B8', marginTop: 6, lineHeight: 16 }}>
                  This will be used for secure login and transaction authorization.
                </Text>
              )}
            </View>
          )}

          {/* ── Email input ── */}
          {channel === 'email' && (
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
              {emailValid && (
                <Text style={{ fontSize: 11, color: '#94A3B8', marginTop: 6, lineHeight: 16 }}>
                  A 6-digit code will be sent to this email address.
                </Text>
              )}
            </View>
          )}

          {/* ── Channel toggle ── */}
          <View style={{ alignItems: 'center', marginTop: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', opacity: 0.4, marginBottom: 10 }}>
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
        </KeyboardAvoidingView>
      </OnboardingShell>
    );
  }

  // ── OTP verification step ──────────────────────────────────────────────────
  const otherChannel = sentChannel === 'sms' ? 'email' : 'sms';
  const canSwitchToOther = sentChannel === 'sms' ? emailValid : (phoneValidation as any).valid;

  return (
    <OnboardingShell
      currentStep={step}
      totalSteps={total}
      title="Verification"
      subtitle={
        sentChannel === 'sms'
          ? `Code sent via SMS to ${sentTo}`
          : `Code sent to ${sentTo}`
      }
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
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: sentChannel === 'sms' ? 'rgba(0,77,44,0.05)' : '#EFF6FF',
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        marginBottom: 20,
      }}>
        {sentChannel === 'sms'
          ? <Phone size={13} color={colors.ventureroot.green} />
          : <Mail size={13} color="#3B82F6" />}
        <Text style={{
          fontSize: 11,
          fontWeight: '700',
          color: sentChannel === 'sms' ? colors.ventureroot.green : '#2563EB',
          marginLeft: 6,
          letterSpacing: 0.5,
        }}>
          {sentChannel === 'sms' ? 'SMS CODE' : 'EMAIL CODE'}
        </Text>
      </View>

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

      {/* Resend + channel switch */}
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

            {/* Switch channel option */}
            {canSwitchToOther && (
              <TouchableOpacity
                onPress={sentChannel === 'sms' ? handleSwitchToEmail : handleSwitchToSms}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  marginTop: 4,
                  paddingVertical: 8,
                  paddingHorizontal: 16,
                  backgroundColor: sentChannel === 'sms' ? '#EFF6FF' : 'rgba(0,77,44,0.05)',
                  borderRadius: 20,
                }}
              >
                {sentChannel === 'sms'
                  ? <Mail size={13} color="#3B82F6" />
                  : <Phone size={13} color={colors.ventureroot.green} />}
                <Text style={{
                  fontSize: 12,
                  fontWeight: '600',
                  color: sentChannel === 'sms' ? '#2563EB' : colors.ventureroot.green,
                }}>
                  {sentChannel === 'sms' ? 'No signal? Try email instead' : 'Try SMS instead'}
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
