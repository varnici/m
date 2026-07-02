import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  Vibration,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Lock, Fingerprint, ShieldAlert, ShieldCheck, Timer } from 'lucide-react-native';
import { useSecurityStore } from '@/store/securityStore';
import { userService } from '@/services/userService';
import { colors } from '@/theme/colors';
import { IndustrialText, IndustrialPage } from '@/components/ui/IndustrialComponents';
import { NumericKeypad } from '@/components/security/NumericKeypad';
import { PatternGrid } from '@/components/security/PatternGrid';
import * as LocalAuthentication from 'expo-local-authentication';
import type { RootStackScreenProps } from '@/navigation/types';

const MAX_ATTEMPTS_BEFORE_WARN = 3;

function formatCountdown(seconds: number): string {
  if (seconds >= 60) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  }
  return `${seconds}s`;
}

const SecurityLockScreen = ({ navigation }: RootStackScreenProps<'SecurityLock'>) => {
  const {
    setIsLocked,
    securityType,
    biometricsEnabled,
    failedAttempts,
    lockoutUntil,
    recordFailedAttempt,
    resetFailedAttempts,
  } = useSecurityStore();

  const [input, setInput] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);

  const shakeOffset = useSharedValue(0);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0);

  // Countdown timer for lockout
  useEffect(() => {
    if (!lockoutUntil) {
      setSecondsLeft(0);
      return;
    }
    const tick = () => {
      const remaining = Math.ceil((lockoutUntil - Date.now()) / 1000);
      setSecondsLeft(Math.max(0, remaining));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [lockoutUntil]);

  const isLockedOut = secondsLeft > 0;

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 800 });
    if (biometricsEnabled && !isLockedOut) {
      handleBiometrics();
    }
  }, []);

  const triggerError = useCallback(() => {
    recordFailedAttempt();
    setError(true);
    Vibration.vibrate([0, 50, 100, 50]);
    shakeOffset.value = withSequence(
      withTiming(-12, { duration: 50 }),
      withTiming(12, { duration: 50 }),
      withTiming(-12, { duration: 50 }),
      withTiming(12, { duration: 50 }),
      withTiming(0, { duration: 50 })
    );
    scale.value = withSequence(
      withTiming(1.05, { duration: 100 }),
      withSpring(1)
    );
    setTimeout(() => {
      setError(false);
      setInput('');
    }, 1500);
  }, [recordFailedAttempt]);

  const handleSuccess = useCallback(() => {
    resetFailedAttempts();
    Vibration.vibrate(10);
    scale.value = withTiming(0.9, { duration: 200 });
    opacity.value = withTiming(0, { duration: 300 });
    setTimeout(() => setIsLocked(false), 300);
  }, [resetFailedAttempts, setIsLocked]);

  const handleBiometrics = async () => {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    if (hasHardware && isEnrolled) {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to unlock VentureRoot',
        fallbackLabel: 'Use PIN/Pattern',
      });
      if (result.success) handleSuccess();
    }
  };

  const verifyPin = async (pin: string) => {
    if (isLockedOut) return;
    try {
      setIsVerifying(true);
      const result = await userService.verifySecurity({ pin });
      if (result.valid) {
        handleSuccess();
      } else {
        triggerError();
      }
    } catch {
      triggerError();
    } finally {
      setIsVerifying(false);
    }
  };

  const handlePatternComplete = async (pattern: number[]) => {
    if (isLockedOut || pattern.length < 4) {
      triggerError();
      return;
    }
    try {
      setIsVerifying(true);
      const result = await userService.verifySecurity({ pattern: pattern.join(',') });
      if (result.valid) {
        handleSuccess();
      } else {
        triggerError();
      }
    } catch {
      triggerError();
    } finally {
      setIsVerifying(false);
    }
  };

  const containerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }, { translateX: shakeOffset.value }],
  }));

  const attemptsRemaining = Math.max(0, 5 - failedAttempts);
  const showAttemptsWarning = failedAttempts >= MAX_ATTEMPTS_BEFORE_WARN && !isLockedOut;

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={[styles.lockIcon, error && styles.lockIconError, isLockedOut && styles.lockIconLockout]}>
        {isLockedOut ? (
          <Timer size={32} color="#F59E0B" />
        ) : error ? (
          <ShieldAlert size={32} color="#FF4B4B" />
        ) : (
          <Lock size={32} color={colors.ventureroot.industrial.primary} />
        )}
      </View>
      <IndustrialText variant="h1" style={styles.title}>
        {isLockedOut ? 'ACCOUNT LOCKED' : error ? 'ACCESS DENIED' : 'SECURE ACCESS'}
      </IndustrialText>
      <IndustrialText style={isLockedOut ? { ...styles.subtitle, ...styles.subtitleLockout } : styles.subtitle}>
        {isLockedOut
          ? `Too many failed attempts. Try again in ${formatCountdown(secondsLeft)}`
          : showAttemptsWarning
            ? `${attemptsRemaining} attempt${attemptsRemaining === 1 ? '' : 's'} remaining before lockout`
            : securityType === 'pin'
              ? 'Enter your 6-digit PIN to proceed'
              : 'Draw your security pattern'}
      </IndustrialText>
    </View>
  );

  const renderPinDots = () => (
    <View style={styles.dotsContainer}>
      {[...Array(6)].map((_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            i < input.length && styles.dotFilled,
            error && styles.dotError,
          ]}
        />
      ))}
    </View>
  );

  return (
    <IndustrialPage>
      <StatusBar barStyle="light-content" />
      <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />

      <Animated.View style={[styles.container, containerStyle]}>
        {renderHeader()}

        <View style={styles.content}>
          {isLockedOut ? (
            <View style={styles.lockoutBox}>
              <Timer size={48} color="#F59E0B" />
              <IndustrialText style={styles.lockoutTimer}>
                {formatCountdown(secondsLeft)}
              </IndustrialText>
              <IndustrialText style={styles.lockoutHint}>
                For your security, further attempts{'\n'}are temporarily blocked.
              </IndustrialText>
            </View>
          ) : securityType === 'pin' ? (
            <>
              {renderPinDots()}
              <NumericKeypad
                onPress={(val) => {
                  if (input.length < 6 && !isVerifying && !isLockedOut) {
                    const next = input + val;
                    setInput(next);
                    if (next.length === 6) verifyPin(next);
                  }
                }}
                onDelete={() => !isVerifying && !isLockedOut && setInput(input.slice(0, -1))}
              />
            </>
          ) : (
            <PatternGrid
              onComplete={handlePatternComplete}
              error={error}
            />
          )}
        </View>

        {biometricsEnabled && !isLockedOut && (
          <TouchableOpacity style={styles.bioButton} onPress={handleBiometrics}>
            <Fingerprint size={32} color={colors.ventureroot.industrial.primary} />
            <IndustrialText style={styles.bioText}>Use Biometrics</IndustrialText>
          </TouchableOpacity>
        )}

        <View style={styles.footer}>
          <ShieldCheck size={16} color="rgba(255,255,255,0.3)" />
          <IndustrialText style={styles.footerText}>
            VENTUREROOT END-TO-END ENCRYPTED
          </IndustrialText>
        </View>
      </Animated.View>
    </IndustrialPage>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 60,
  },
  header: {
    alignItems: 'center',
    marginTop: 20,
  },
  lockIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  lockIconError: {
    borderColor: '#FF4B4B',
    backgroundColor: 'rgba(255, 75, 75, 0.1)',
  },
  lockIconLockout: {
    borderColor: '#F59E0B',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
  title: {
    fontSize: 24,
    letterSpacing: 4,
    marginBottom: 8,
  },
  subtitle: {
    opacity: 0.5,
    fontSize: 12,
    letterSpacing: 1,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  subtitleLockout: {
    opacity: 0.9,
    color: '#F59E0B',
  },
  content: {
    alignItems: 'center',
  },
  lockoutBox: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 16,
  },
  lockoutTimer: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#F59E0B',
    letterSpacing: 2,
  },
  lockoutHint: {
    opacity: 0.5,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 20,
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 40,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  dotFilled: {
    backgroundColor: colors.ventureroot.industrial.primary,
    borderColor: colors.ventureroot.industrial.primary,
    transform: [{ scale: 1.2 }],
  },
  dotError: {
    borderColor: '#FF4B4B',
    backgroundColor: '#FF4B4B',
  },
  bioButton: {
    alignItems: 'center',
    gap: 10,
    alignSelf: 'center',
  },
  bioText: {
    fontSize: 10,
    opacity: 0.6,
    letterSpacing: 2,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    opacity: 0.4,
  },
  footerText: {
    fontSize: 9,
    letterSpacing: 1.5,
  },
});

export default SecurityLockScreen;
