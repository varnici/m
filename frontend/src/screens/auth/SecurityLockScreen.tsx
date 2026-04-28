import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Vibration, TouchableOpacity } from 'react-native';
import { IndustrialPage, IndustrialText, useIndustrialTheme } from '../../components/ui/IndustrialComponents';
import { colors } from '../../theme/colors';
import { useSecurityStore } from '../../store/securityStore';
import { NumericKeypad } from '../../components/security/NumericKeypad';
import { PatternGrid } from '../../components/security/PatternGrid';
import * as LocalAuthentication from 'expo-local-authentication';
import { Shield, Fingerprint, Lock, Grid } from 'lucide-react-native';
import type { RootStackScreenProps } from '@/navigation/types';
import { userService } from '@/services/userService';

const SecurityLockScreen = ({ navigation }: RootStackScreenProps<'SecurityLock'>) => {
  const { 
    securityType, 
    biometricsEnabled, 
    setIsLocked 
  } = useSecurityStore();

  const [input, setInput] = useState('');
  const [error, setError] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const theme = useIndustrialTheme();

  const handleSuccess = useCallback(() => {
    Vibration.vibrate(50);
    setIsLocked(false);
    // Navigation usually handled by a wrapper, but if we are here as a screen:
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation, setIsLocked]);

  const handleBiometrics = async () => {
    if (biometricsEnabled) {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock VentureRoot',
        fallbackLabel: 'Use ' + (securityType === 'pin' ? 'PIN' : 'Pattern'),
      });
      if (result.success) {
        handleSuccess();
      }
    }
  };

  useEffect(() => {
    handleBiometrics();
  }, []);

  const handlePinPress = (val: string) => {
    if (isVerifying) {
      return;
    }
    if (input.length < 6) {
      const newInput = input + val;
      setInput(newInput);
      setError(false);
      
      if (newInput.length === 6) {
        void verifyPin(newInput);
      }
    }
  };

  const verifyPin = async (pin: string) => {
    try {
      setIsVerifying(true);
      const result = await userService.verifySecurity({ pin });
      if (result.valid) {
        handleSuccess();
      } else {
        setError(true);
        Vibration.vibrate(200);
        setTimeout(() => setInput(''), 500);
      }
    } catch {
      setError(true);
      Vibration.vibrate(200);
      setTimeout(() => setInput(''), 500);
    } finally {
      setIsVerifying(false);
    }
  };

  const handlePatternComplete = async (pattern: number[]) => {
    if (isVerifying) {
      return;
    }
    try {
      setIsVerifying(true);
      const result = await userService.verifySecurity({ pattern: pattern.join(',') });
      if (result.valid) {
        handleSuccess();
      } else {
        setError(true);
        Vibration.vibrate(200);
        setTimeout(() => setError(false), 1000);
      }
    } catch {
      setError(true);
      Vibration.vibrate(200);
      setTimeout(() => setError(false), 1000);
    } finally {
      setIsVerifying(false);
    }
  };

  const renderContent = () => {
    if (securityType === 'pin') {
      return (
        <View style={styles.content}>
          <IndustrialText variant="h2" style={styles.title}>ENTER PIN</IndustrialText>
          <View style={styles.pinIndicators}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <View 
                key={i} 
                style={[
                  styles.pinDot,
                  { 
                    backgroundColor: input.length >= i 
                      ? (error ? '#FF4B4B' : colors.ventureroot.industrial.primary) 
                      : (theme.outline + '40') 
                  }
                ]} 
              />
            ))}
          </View>
          <NumericKeypad 
            onPress={handlePinPress} 
            onDelete={() => !isVerifying && setInput(input.slice(0, -1))} 
          />
          {isVerifying && (
            <IndustrialText variant="label" style={{ marginTop: 16, opacity: 0.6, letterSpacing: 1 }}>
              VERIFYING...
            </IndustrialText>
          )}
        </View>
      );
    }

    if (securityType === 'pattern') {
      return (
        <View style={styles.content}>
          <IndustrialText variant="h2" style={styles.title}>DRAW PATTERN</IndustrialText>
          <PatternGrid onComplete={handlePatternComplete} error={error} />
          {error && (
            <IndustrialText variant="label" style={styles.errorText}>
              INCORRECT PATTERN
            </IndustrialText>
          )}
          {isVerifying && (
            <IndustrialText variant="label" style={{ marginTop: 16, opacity: 0.6, letterSpacing: 1 }}>
              VERIFYING...
            </IndustrialText>
          )}
        </View>
      );
    }

    return (
      <View style={styles.content}>
        <IndustrialText>No security set.</IndustrialText>
        <TouchableOpacity onPress={() => setIsLocked(false)}>
          <IndustrialText style={{ color: colors.ventureroot.industrial.primary, marginTop: 20 }}>
            BYPASS (DEV ONLY)
          </IndustrialText>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <IndustrialPage>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.shieldBox}>
            <Shield size={32} color={colors.ventureroot.industrial.primary} />
          </View>
          <IndustrialText variant="label" style={styles.brand}>VENTUREROOT SECURE</IndustrialText>
        </View>

        {renderContent()}

        {biometricsEnabled && (
          <TouchableOpacity style={styles.biometricBtn} onPress={handleBiometrics}>
            <Fingerprint size={32} color={colors.ventureroot.industrial.primary} />
            <IndustrialText variant="label" style={styles.biometricText}>TAP TO USE BIOMETRICS</IndustrialText>
          </TouchableOpacity>
        )}
      </View>
    </IndustrialPage>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 40,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  shieldBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(22, 163, 74, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  brand: {
    letterSpacing: 2,
    opacity: 0.6,
  },
  content: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
  },
  title: {
    marginBottom: 40,
    letterSpacing: 2,
  },
  pinIndicators: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 60,
  },
  pinDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  errorText: {
    color: '#FF4B4B',
    marginTop: 20,
    letterSpacing: 2,
  },
  biometricBtn: {
    padding: 20,
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  biometricText: {
    fontSize: 8,
    opacity: 0.5,
  },
});

export default SecurityLockScreen;
