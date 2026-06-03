import React, { useState, useEffect } from 'react';
import { View, StyleSheet, StatusBar, Vibration, Alert } from 'react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { ShieldCheck, ShieldAlert, Lock } from 'lucide-react-native';
import { IndustrialPage, IndustrialText, IndustrialButton } from '@/components/ui/IndustrialComponents';
import { NumericKeypad } from '@/components/security/NumericKeypad';
import { colors } from '@/theme/colors';
import { useSecurityStore } from '@/store/securityStore';
import { userService } from '@/services/userService';
import type { RootStackScreenProps } from '@/navigation/types';
import { CommonActions } from '@react-navigation/native';

const PINSetupScreen = ({ navigation }: RootStackScreenProps<'PINSetup'>) => {
  const { setSecurityType, setIsLocked } = useSecurityStore();
  const [pin, setPin] = useState('');
  const [firstPin, setFirstPin] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(false);

  const persistPin = async (nextPin: string) => {
    try {
      setIsSaving(true);
      await userService.updateSecurity({
        new_pin: nextPin,
        security_type: 'pin',
      });
      setSecurityType('pin');
      setIsLocked(false);
      
      Vibration.vibrate([0, 100, 50, 100]);
      
      // Determine next navigation based on context
      // If we are in the root stack and not logged in or onboarding not finished
      // For now, let's assume we proceed to onboarding if it's the first setup
      setTimeout(() => {
        if (navigation.canGoBack()) {
          navigation.goBack();
        } else {
           navigation.dispatch(
             CommonActions.reset({
               index: 0,
               routes: [{ name: 'Onboarding', params: { screen: 'OnboardingTerms' } }],
             })
           );
        }
      }, 800);
    } catch (error: any) {
      Alert.alert('Setup Failed', error.message || 'Could not save your PIN. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePress = (val: string) => {
    if (pin.length < 6) {
      const next = pin + val;
      setPin(next);
      setError(false);

      if (next.length === 6) {
        if (!confirming) {
          setFirstPin(next);
          // Small delay so user sees the 6th dot fill up
          setTimeout(() => {
            setPin('');
            setConfirming(true);
            Vibration.vibrate(50);
          }, 300);
        } else {
          if (next === firstPin) {
            void persistPin(next);
          } else {
            setError(true);
            Vibration.vibrate([0, 50, 100, 50]);
            setPin('');
            setTimeout(() => setError(false), 1500);
          }
        }
      }
    }
  };

  return (
    <IndustrialPage>
      <StatusBar barStyle="light-content" />
      <View style={styles.container}>
        <Animated.View entering={FadeIn.duration(600)} style={styles.header}>
          <View style={[styles.iconBox, error && styles.iconBoxError]}>
            {error ? <ShieldAlert size={32} color="#FF4B4B" /> : <Lock size={32} color={colors.ventureroot.industrial.primary} />}
          </View>
          <IndustrialText variant="h1" style={styles.title}>
            {confirming ? 'CONFIRM PIN' : 'CREATE PIN'}
          </IndustrialText>
          <IndustrialText style={styles.subtitle}>
            {error 
              ? 'PINs do not match. Try again.' 
              : confirming 
                ? 'Re-enter your 6-digit PIN to verify' 
                : 'Set a secure 6-digit PIN for your account'}
          </IndustrialText>
        </Animated.View>

        <View style={styles.content}>
          <View style={styles.dotsContainer}>
            {[...Array(6)].map((_, i) => (
              <View 
                key={i} 
                style={[
                  styles.dot, 
                  i < pin.length && styles.dotFilled,
                  error && styles.dotError
                ]} 
              />
            ))}
          </View>

          <NumericKeypad 
            onPress={handlePress} 
            onDelete={() => setPin(pin.slice(0, -1))}
          />
        </View>

        <View style={styles.footer}>
          <ShieldCheck size={14} color="rgba(255,255,255,0.3)" />
          <IndustrialText style={styles.footerText}>
            MILITARY-GRADE ENCRYPTION ACTIVE
          </IndustrialText>
        </View>
      </View>
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
    paddingHorizontal: 40,
  },
  iconBox: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  iconBoxError: {
    borderColor: '#FF4B4B',
    backgroundColor: 'rgba(255, 75, 75, 0.1)',
  },
  title: {
    fontSize: 22,
    letterSpacing: 4,
    marginBottom: 8,
  },
  subtitle: {
    textAlign: 'center',
    opacity: 0.5,
    fontSize: 13,
    lineHeight: 20,
  },
  content: {
    alignItems: 'center',
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 50,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
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
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    opacity: 0.3,
  },
  footerText: {
    fontSize: 8,
    letterSpacing: 2,
  },
});

export default PINSetupScreen;
