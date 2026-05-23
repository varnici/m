import React, { useState } from 'react';
import { View, StyleSheet, StatusBar, Vibration, Alert } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Grid, ShieldCheck, ShieldAlert } from 'lucide-react-native';
import { IndustrialPage, IndustrialText } from '@/components/ui/IndustrialComponents';
import { PatternGrid } from '@/components/security/PatternGrid';
import { colors } from '@/theme/colors';
import { useSecurityStore } from '@/store/securityStore';
import { userService } from '@/services/userService';
import type { RootStackScreenProps } from '@/navigation/types';
import { CommonActions } from '@react-navigation/native';

const PatternSetupScreen = ({ navigation }: RootStackScreenProps<'PatternSetup'>) => {
  const { setSecurityType, setIsLocked } = useSecurityStore();
  const [pattern, setPattern] = useState<number[]>([]);
  const [firstPattern, setFirstPattern] = useState<number[] | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(false);

  const persistPattern = async (nextPattern: number[]) => {
    try {
      setIsSaving(true);
      await userService.updateSecurity({
        new_pattern: nextPattern.join(','),
        security_type: 'pattern',
      });
      setSecurityType('pattern');
      setIsLocked(false);
      
      Vibration.vibrate([0, 100, 50, 100]);
      
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
      Alert.alert('Setup Failed', error.message || 'Could not save your pattern. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePatternComplete = (currentPattern: number[]) => {
    if (currentPattern.length < 4) {
      setError(true);
      Vibration.vibrate([0, 50, 100, 50]);
      setTimeout(() => setError(false), 1500);
      return;
    }

    if (!confirming) {
      setFirstPattern(currentPattern);
      setPattern([]);
      setConfirming(true);
      Vibration.vibrate(50);
    } else {
      if (currentPattern.join(',') === firstPattern?.join(',')) {
        void persistPattern(currentPattern);
      } else {
        setError(true);
        Vibration.vibrate([0, 50, 100, 50]);
        setPattern([]);
        setTimeout(() => setError(false), 1500);
      }
    }
  };

  return (
    <IndustrialPage>
      <StatusBar barStyle="light-content" />
      <View style={styles.container}>
        <Animated.View entering={FadeIn.duration(600)} style={styles.header}>
          <View style={[styles.iconBox, error && styles.iconBoxError]}>
            {error ? <ShieldAlert size={32} color="#FF4B4B" /> : <Grid size={32} color={colors.ventureroot.industrial.primary} />}
          </View>
          <IndustrialText variant="h1" style={styles.title}>
            {confirming ? 'CONFIRM PATTERN' : 'CREATE PATTERN'}
          </IndustrialText>
          <IndustrialText style={styles.subtitle}>
            {error 
              ? 'Invalid pattern or mismatch. Connect at least 4 dots.' 
              : confirming 
                ? 'Draw the pattern again to verify' 
                : 'Connect at least 4 dots to create your security pattern'}
          </IndustrialText>
        </Animated.View>

        <View style={styles.content}>
          <PatternGrid 
            key={confirming ? 'confirming' : 'initial'}
            onComplete={handlePatternComplete} 
            error={error}
          />
        </View>

        <View style={styles.footer}>
          <ShieldCheck size={14} color="rgba(255,255,255,0.3)" />
          <IndustrialText style={styles.footerText}>
            VENTUREROOT BIO-SECURITY LAYER ACTIVE
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

export default PatternSetupScreen;
