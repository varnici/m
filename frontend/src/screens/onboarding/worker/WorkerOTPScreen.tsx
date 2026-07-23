import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
  Animated,
  Alert,
  ActivityIndicator,
} from 'react-native';
import OnboardingShell, { OnboardingButton } from '@/components/onboarding/OnboardingShell';
import { useOnboardingNav } from '@/hooks/useOnboardingNav';
import { Mail, Phone, RefreshCw } from 'lucide-react-native';
import { colors } from '@/theme/colors';
import { otpService, type OtpChannel } from '@/services/otpService';

const OTP_LENGTH = 6;
const TIMER_SECONDS = 180;

export default function WorkerOTPScreen() {
  const { goNext, goBack, step, total, data } = useOnboardingNav();
  const { width } = useWindowDimensions();

  // Resolve initial channel + target from onboarding data
  const initialChannel: OtpChannel = (data.otpChannel as OtpChannel) || 'sms';
  const initialTarget: string = (data.otpTarget as string) || (data.phone as string) || '';

  // Local state allows mid-flow channel switch without mutating store
  const [activeChannel, setActiveChannel] = useState<OtpChannel>(initialChannel);
  const [activeTarget, setActiveTarget] = useState<string>(initialTarget);

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [timer, setTimer] = useState(TIMER_SECONDS);
  const [canResend, setCanResend] = useState(false);
  const [error, setError] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [switching, setSwitching] = useState(false);

  const inputRefs = useRef<Array<TextInput | null>>([]);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // ── Countdown ──────────────────────────────────────────────────────────────
  useEffect(() => {
    setTimer(TIMER_SECONDS);
    setCanResend(false);
  }, [activeTarget]);

  useEffect(() => {
    if (timer <= 0) { setCanResend(true); return; }
    const id = setInterval(() => setTimer((p) => p - 1), 1000);
    return () => clearInterval(id);
  }, [timer]);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  const triggerShake = useCallback(() => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  }, [shakeAnim]);

  // ── OTP box input ──────────────────────────────────────────────────────────
  const handleChange = useCallback(
    (text: string, index: number) => {
      setError(false);
      const digit = text.replace(/\D/g, '').slice(-1);
      const newOtp = [...otp];
      newOtp[index] = digit;
      setOtp(newOtp);
      if (digit && index < OTP_LENGTH - 1) inputRefs.current[index + 1]?.focus();
      if (digit && index === OTP_LENGTH - 1) {
        const code = newOtp.join('');
        if (code.length === OTP_LENGTH) verifyCode(code);
      }
    },
    [otp],
  );

  const handleKeyPress = useCallback(
    (key: string, index: number) => {
      if (key === 'Backspace' && !otp[index] && index > 0) {
        const newOtp = [...otp];
        newOtp[index - 1] = '';
        setOtp(newOtp);
        inputRefs.current[index - 1]?.focus();
      }
    },
    [otp],
  );

  // ── Verify ─────────────────────────────────────────────────────────────────
  const verifyCode = useCallback(
    async (code: string) => {
      if (!activeTarget) {
        Alert.alert('Error', 'Verification target not found. Please go back and re-enter your details.');
        return;
      }
      setVerifying(true);
      try {
        await otpService.verifyOtp(activeTarget, activeChannel, code);
        const patch: Record<string, any> = {
          otpVerified: true,
          otpChannel: activeChannel,
          otpTarget: activeTarget,
        };
        if (activeChannel === 'sms') patch.phoneVerified = true;
        if (activeChannel === 'email') patch.emailVerified = true;
        goNext(patch);
      } catch (err: any) {
        setError(true);
        triggerShake();
        if (err.message) Alert.alert('Verification failed', err.message);
      } finally {
        setVerifying(false);
      }
    },
    [goNext, triggerShake, activeTarget, activeChannel],
  );

  const handleContinue = useCallback(() => {
    const code = otp.join('');
    if (code.length === OTP_LENGTH) verifyCode(code);
  }, [otp, verifyCode]);

  // ── Resend ─────────────────────────────────────────────────────────────────
  const doResend = useCallback(async (channel: OtpChannel, target: string) => {
    try {
      await otpService.sendOtp(target, channel, 'phone_verify');
    } catch (err: any) {
      Alert.alert('Could not resend', err.message || 'Please try again later.');
      return false;
    }
    return true;
  }, []);

  const handleResend = useCallback(async () => {
    const ok = await doResend(activeChannel, activeTarget);
    if (!ok) return;
    setTimer(TIMER_SECONDS);
    setCanResend(false);
    setOtp(Array(OTP_LENGTH).fill(''));
    setError(false);
    inputRefs.current[0]?.focus();
  }, [activeChannel, activeTarget, doResend]);

  // ── Switch channel ─────────────────────────────────────────────────────────
  const emailTarget = (data.email as string | undefined)?.trim().toLowerCase();
  const phoneTarget = data.otpChannel === 'email'
    ? (data.phone as string | undefined)
    : undefined;

  const alternateChannel: OtpChannel = activeChannel === 'sms' ? 'email' : 'sms';
  const alternateTarget = activeChannel === 'sms' ? emailTarget : phoneTarget;
  const canSwitch = !!alternateTarget;

  const handleSwitchChannel = useCallback(async () => {
    if (!alternateTarget) return;
    setSwitching(true);
    const ok = await doResend(alternateChannel, alternateTarget);
    if (ok) {
      setActiveChannel(alternateChannel);
      setActiveTarget(alternateTarget);
      setOtp(Array(OTP_LENGTH).fill(''));
      setError(false);
      inputRefs.current[0]?.focus();
    }
    setSwitching(false);
  }, [alternateChannel, alternateTarget, doResend]);

  const isComplete = otp.every((d) => d !== '');
  const boxSize = Math.min(48, (width - 80) / OTP_LENGTH - 8);

  // ── Subtitle description ───────────────────────────────────────────────────
  const sentDescription = activeChannel === 'sms'
    ? `phone number ${activeTarget}`
    : `email address ${activeTarget}`;

  return (
    <OnboardingShell
      currentStep={step}
      totalSteps={total}
      title="Verify your account"
      subtitle={`Enter the 6-digit code sent to your ${activeChannel === 'email' ? 'email address' : 'phone number'}.`}
      onBack={goBack}
      footer={
        <OnboardingButton
          title={verifying ? 'Verifying...' : 'Verify'}
          onPress={handleContinue}
          disabled={!isComplete || verifying}
        />
      }
    >
      <View style={{ alignItems: 'center', marginTop: 24 }}>
        {/* Channel badge */}
        <View style={[
          styles.typeIndicator,
          activeChannel === 'email' && { backgroundColor: '#EFF6FF' },
        ]}>
          {activeChannel === 'email'
            ? <Mail size={18} color="#3B82F6" />
            : <Phone size={18} color={colors.ventureroot.green} />}
          <Text style={[
            styles.typeText,
            activeChannel === 'email' && { color: '#2563EB' },
          ]}>
            {activeChannel === 'email' ? `Email code → ${activeTarget}` : `SMS code → ${activeTarget}`}
          </Text>
        </View>

        {/* OTP boxes */}
        <Animated.View style={[styles.otpRow, { transform: [{ translateX: shakeAnim }] }]}>
          {Array.from({ length: OTP_LENGTH }).map((_, index) => (
            <TextInput
              key={index}
              ref={(ref) => { inputRefs.current[index] = ref; }}
              style={[
                styles.otpBox,
                { width: boxSize, height: boxSize + 8 },
                otp[index] !== '' && styles.otpBoxFilled,
                error && styles.otpBoxError,
              ]}
              value={otp[index]}
              onChangeText={(text) => handleChange(text, index)}
              onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
              keyboardType="number-pad"
              maxLength={1}
              textAlign="center"
              selectTextOnFocus
              accessibilityLabel={`Digit ${index + 1} of ${OTP_LENGTH}`}
            />
          ))}
        </Animated.View>

        {error && (
          <Text style={styles.errorText}>Invalid code. Please check and try again.</Text>
        )}

        {/* Timer / Resend */}
        <View style={styles.timerContainer}>
          {switching ? (
            <ActivityIndicator size="small" color={colors.ventureroot.green} />
          ) : canResend ? (
            <View style={{ alignItems: 'center', gap: 10 }}>
              <TouchableOpacity onPress={handleResend} style={styles.resendButton}>
                <RefreshCw size={14} color={colors.ventureroot.green} />
                <Text style={styles.resendText}>Resend OTP</Text>
              </TouchableOpacity>

              {/* Channel switch */}
              {canSwitch && (
                <TouchableOpacity
                  onPress={handleSwitchChannel}
                  style={[
                    styles.resendButton,
                    {
                      backgroundColor: activeChannel === 'sms' ? '#EFF6FF' : 'rgba(0,77,44,0.05)',
                      marginTop: 4,
                    },
                  ]}
                >
                  {activeChannel === 'sms'
                    ? <Mail size={14} color="#3B82F6" />
                    : <Phone size={14} color={colors.ventureroot.green} />}
                  <Text style={[
                    styles.resendText,
                    { color: activeChannel === 'sms' ? '#2563EB' : colors.ventureroot.green },
                  ]}>
                    {activeChannel === 'sms' ? 'No signal? Try email instead' : 'Try SMS instead'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <Text style={styles.timerText}>
              Resend code in <Text style={styles.timerBold}>{formatTime(timer)}</Text>
            </Text>
          )}
        </View>
      </View>

      <View style={{ marginTop: 'auto', paddingBottom: 12 }}>
        <Text style={styles.helperText}>
          Code sent to {sentDescription}. Check your spam folder if using email. Request a new one after the timer expires.
        </Text>
      </View>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  typeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 32,
    maxWidth: '90%',
  },
  typeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#004D2C',
    marginLeft: 8,
    flexShrink: 1,
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  otpBox: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
  },
  otpBoxFilled: {
    borderColor: '#004D2C',
    backgroundColor: '#F0FDF4',
  },
  otpBoxError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  errorText: {
    fontSize: 13,
    color: '#EF4444',
    fontWeight: '500',
    marginBottom: 16,
  },
  timerContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  timerText: {
    fontSize: 14,
    color: '#64748B',
  },
  timerBold: {
    fontWeight: '700',
    color: '#334155',
  },
  resendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#F0FDF4',
    borderRadius: 20,
    gap: 8,
  },
  resendText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#004D2C',
  },
  helperText: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 18,
    textAlign: 'center',
  },
});
