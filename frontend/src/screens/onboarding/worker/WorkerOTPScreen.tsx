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
import { otpService } from '@/services/otpService';

const OTP_LENGTH = 6;
const TIMER_SECONDS = 180;

export default function WorkerOTPScreen() {
  const { goNext, goBack, step, total, data } = useOnboardingNav();
  const { width } = useWindowDimensions();

  // Both were collected earlier (WorkerEmailScreen, WorkerPhoneScreen) and
  // the code was sent to both there — this screen just verifies the code
  // against whichever channel actually delivered it.
  const phone: string = (data.phone as string) || (data.otpTarget as string) || '';
  const email: string = ((data.email as string) || '').trim().toLowerCase();

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [timer, setTimer] = useState(TIMER_SECONDS);
  const [canResend, setCanResend] = useState(false);
  const [error, setError] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);

  const inputRefs = useRef<Array<TextInput | null>>([]);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // ── Countdown ──────────────────────────────────────────────────────────────
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
      if (!phone || !email) {
        Alert.alert('Error', 'Verification details not found. Please go back and re-enter your details.');
        return;
      }
      setVerifying(true);
      try {
        await otpService.verifyOtp(phone, email, code);
        goNext({ otpVerified: true, phoneVerified: true, emailVerified: true });
      } catch (err: any) {
        setError(true);
        triggerShake();
        if (err.message) Alert.alert('Verification failed', err.message);
      } finally {
        setVerifying(false);
      }
    },
    [goNext, triggerShake, phone, email],
  );

  const handleContinue = useCallback(() => {
    const code = otp.join('');
    if (code.length === OTP_LENGTH) verifyCode(code);
  }, [otp, verifyCode]);

  // ── Resend ─────────────────────────────────────────────────────────────────
  const handleResend = useCallback(async () => {
    setResending(true);
    try {
      await otpService.sendOtp(phone, email, 'phone_verify');
      setTimer(TIMER_SECONDS);
      setCanResend(false);
      setOtp(Array(OTP_LENGTH).fill(''));
      setError(false);
      inputRefs.current[0]?.focus();
    } catch (err: any) {
      Alert.alert('Could not resend', err.message || 'Please try again later.');
    } finally {
      setResending(false);
    }
  }, [phone, email]);

  const isComplete = otp.every((d) => d !== '');
  const boxSize = Math.min(48, (width - 80) / OTP_LENGTH - 8);

  return (
    <OnboardingShell
      currentStep={step}
      totalSteps={total}
      title="Verify your account"
      subtitle="Enter the 6-digit code sent to your phone and email."
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
        {/* Channel badges */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 24 }}>
          <View style={styles.typeIndicator}>
            <Phone size={16} color={colors.ventureroot.green} />
            <Text style={styles.typeText} numberOfLines={1}>{phone}</Text>
          </View>
          <View style={[styles.typeIndicator, { backgroundColor: '#EFF6FF' }]}>
            <Mail size={16} color="#3B82F6" />
            <Text style={[styles.typeText, { color: '#2563EB' }]} numberOfLines={1}>{email}</Text>
          </View>
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
          {resending ? (
            <ActivityIndicator size="small" color={colors.ventureroot.green} />
          ) : canResend ? (
            <TouchableOpacity onPress={handleResend} style={styles.resendButton}>
              <RefreshCw size={14} color={colors.ventureroot.green} />
              <Text style={styles.resendText}>Resend OTP</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.timerText}>
              Resend code in <Text style={styles.timerBold}>{formatTime(timer)}</Text>
            </Text>
          )}
        </View>
      </View>

      <View style={{ marginTop: 'auto', paddingBottom: 12 }}>
        <Text style={styles.helperText}>
          Either code works. Check your spam folder if using email. Request a new one after the timer expires.
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
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    maxWidth: '48%',
  },
  typeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#004D2C',
    marginLeft: 6,
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
