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
} from 'react-native';
import OnboardingShell, { OnboardingButton } from '@/components/onboarding/OnboardingShell';
import { useOnboardingNav } from '@/hooks/useOnboardingNav';
import { Mail, Phone, RefreshCw } from 'lucide-react-native';
import { colors } from '@/theme/colors';
import { supabase } from '@/lib/supabase';

const OTP_LENGTH = 6;
const TIMER_SECONDS = 180; // 3 minutes

export default function WorkerOTPScreen() {
  const { goNext, goBack, step, total, data } = useOnboardingNav();
  const { width } = useWindowDimensions();
  const verifyType = data.phone ? 'phone' : 'email';

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [timer, setTimer] = useState(TIMER_SECONDS);
  const [canResend, setCanResend] = useState(false);
  const [error, setError] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const inputRefs = useRef<Array<TextInput | null>>([]);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // Countdown timer
  useEffect(() => {
    if (timer <= 0) {
      setCanResend(true);
      return;
    }
    const interval = setInterval(() => {
      setTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timer]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const triggerShake = useCallback(() => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  }, [shakeAnim]);

  const handleChange = useCallback(
    (text: string, index: number) => {
      setError(false);
      const digit = text.replace(/\D/g, '').slice(-1);
      const newOtp = [...otp];
      newOtp[index] = digit;
      setOtp(newOtp);

      if (digit && index < OTP_LENGTH - 1) {
        inputRefs.current[index + 1]?.focus();
      }

      // Auto-verify when all digits entered
      if (digit && index === OTP_LENGTH - 1) {
        const code = newOtp.join('');
        if (code.length === OTP_LENGTH) {
          verifyCode(code);
        }
      }
    },
    [otp]
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
    [otp]
  );

  const verifyCode = useCallback(
    async (code: string) => {
      setVerifying(true);
      const phone = data.phone as string | undefined;
      if (!phone) {
        setVerifying(false);
        Alert.alert('Error', 'Phone number not found. Please go back and re-enter it.');
        return;
      }
      const { error: verifyError } = await supabase.auth.verifyOtp({
        phone,
        token: code,
        type: 'phone_change',
      });
      setVerifying(false);
      if (verifyError) {
        setError(true);
        triggerShake();
      } else {
        goNext({ otpVerified: true, phoneVerified: true });
      }
    },
    [goNext, triggerShake, data.phone]
  );

  const handleResend = useCallback(async () => {
    const phone = data.phone as string | undefined;
    if (phone) {
      const { error: resendError } = await supabase.auth.updateUser({ phone });
      if (resendError) {
        Alert.alert('Could not resend', resendError.message);
        return;
      }
    }
    setTimer(TIMER_SECONDS);
    setCanResend(false);
    setOtp(Array(OTP_LENGTH).fill(''));
    setError(false);
    inputRefs.current[0]?.focus();
  }, [data.phone]);

  const handleContinue = useCallback(() => {
    const code = otp.join('');
    if (code.length === OTP_LENGTH) {
      verifyCode(code);
    }
  }, [otp, verifyCode]);

  const isComplete = otp.every((d) => d !== '');
  const boxSize = Math.min(48, (width - 80) / OTP_LENGTH - 8);

  return (
    <OnboardingShell
      currentStep={step}
      totalSteps={total}
      title="Verify your account"
      subtitle={`Enter the 6-digit code sent to your ${verifyType === 'email' ? 'email address' : 'phone number'}.`}
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
        {/* Verification type indicator */}
        <View style={styles.typeIndicator}>
          {verifyType === 'email' ? (
            <Mail size={18} color={colors.ventureroot.green} />
          ) : (
            <Phone size={18} color={colors.ventureroot.green} />
          )}
          <Text style={styles.typeText}>
            {verifyType === 'email' ? 'Email verification' : 'SMS verification'}
          </Text>
        </View>

        {/* OTP Boxes */}
        <Animated.View
          style={[
            styles.otpRow,
            { transform: [{ translateX: shakeAnim }] },
          ]}
        >
          {Array.from({ length: OTP_LENGTH }).map((_, index) => (
            <TextInput
              key={index}
              ref={(ref) => { inputRefs.current[index] = ref; }}
              style={[
                styles.otpBox,
                {
                  width: boxSize,
                  height: boxSize + 8,
                },
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

        {/* Error message */}
        {error && (
          <Text style={styles.errorText}>
            Invalid code. Please check and try again.
          </Text>
        )}

        {/* Timer / Resend */}
        <View style={styles.timerContainer}>
          {canResend ? (
            <TouchableOpacity
              onPress={handleResend}
              style={styles.resendButton}
              accessibilityRole="button"
            >
              <RefreshCw size={14} color={colors.ventureroot.green} />
              <Text style={styles.resendText}>Resend OTP</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.timerText}>
              Resend code in{' '}
              <Text style={styles.timerBold}>{formatTime(timer)}</Text>
            </Text>
          )}
        </View>
      </View>

      <View style={{ marginTop: 'auto', paddingBottom: 12 }}>
        <Text style={styles.helperText}>
          Didn't receive the code? Check your spam folder or request a new one
          after the timer expires.
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
  },
  typeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#004D2C',
    marginLeft: 8,
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
  },
  resendText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#004D2C',
    marginLeft: 8,
  },
  helperText: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 18,
    textAlign: 'center',
  },
});
