import React, { useState, useRef, useCallback } from 'react';
import {
  Alert,
  View,
  StyleSheet,
  TouchableOpacity,
  PanResponder,
  Dimensions,
  Animated,
  Vibration,
} from 'react-native';
import { IndustrialPage, IndustrialText, useIndustrialTheme } from '../../components/ui/IndustrialComponents';
import { colors } from '../../theme/colors';
import { ShieldCheck, RefreshCcw, ArrowRight } from 'lucide-react-native';
import type { RootStackScreenProps } from '@/navigation/types';
import { useSecurityStore } from '@/store/securityStore';
import { PatternGrid } from '@/components/security/PatternGrid';
import { userService } from '@/services/userService';

const { width } = Dimensions.get('window');
const GRID_SIZE = 3;
const DOT_SIZE = 20;
const PADDING = 40;
const CELL_SIZE = (width - PADDING * 2) / GRID_SIZE;

interface Point {
  x: number;
  y: number;
  id: number;
}

import Svg, { Line, Circle } from 'react-native-svg';

const PatternSetupScreen = ({ navigation }: RootStackScreenProps<'PatternSetup'>) => {
  const { setSecurityType, setIsLocked } = useSecurityStore();
  const [pattern, setPattern] = useState<number[]>([]);
  const [confirming, setConfirming] = useState(false);
  const [firstPattern, setFirstPattern] = useState<number[]>([]);
  const [error, setError] = useState(false);
  const [activePoint, setActivePoint] = useState<{ x: number; y: number } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const theme = useIndustrialTheme();
  const dotsRef = useRef<Point[]>([]);

  // Initialize dot positions
  if (dotsRef.current.length === 0) {
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        dotsRef.current.push({
          x: PADDING + col * CELL_SIZE + CELL_SIZE / 2,
          y: row * CELL_SIZE + CELL_SIZE / 2,
          id: row * GRID_SIZE + col,
        });
      }
    }
  }

  const persistPattern = async (nextPattern: number[]) => {
    try {
      setIsSaving(true);
      await userService.updateSecurity({
        new_pattern: nextPattern.join(','),
        security_type: 'pattern',
      });
      setSecurityType('pattern');
      setIsLocked(false);
      setTimeout(() => navigation.goBack(), 500);
    } catch {
      setError(true);
      setPattern([]);
      setConfirming(false);
      setFirstPattern([]);
      Alert.alert('Security setup failed', 'Unable to save pattern right now. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePatternComplete = useCallback((currentPattern: number[]) => {
    if (isSaving) {
      return;
    }
    if (currentPattern.length < 4) {
      setError(true);
      Vibration.vibrate(100);
      setTimeout(() => {
        setPattern([]);
        setError(false);
      }, 1000);
      return;
    }

    if (!confirming) {
      setFirstPattern(currentPattern);
      setPattern([]);
      setConfirming(true);
    } else {
      if (currentPattern.join(',') === firstPattern.join(',')) {
        // Save hashed pattern on backend
        Vibration.vibrate([0, 50, 50, 50]);
        void persistPattern(currentPattern);
      } else {
        setError(true);
        Vibration.vibrate(200);
        setTimeout(() => {
          setPattern([]);
          setError(false);
        }, 1000);
      }
    }
  }, [confirming, firstPattern, isSaving, navigation]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        setPattern([]);
        setError(false);
        const { locationX, locationY } = evt.nativeEvent;
        checkDot(locationX, locationY);
      },
      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        setActivePoint({ x: locationX, y: locationY });
        checkDot(locationX, locationY);
      },
      onPanResponderRelease: () => {
        setActivePoint(null);
        handlePatternComplete(pattern);
      },
    })
  ).current;

  const checkDot = (x: number, y: number) => {
    dotsRef.current.forEach((dot) => {
      const dist = Math.sqrt(Math.pow(x - dot.x, 2) + Math.pow(y - dot.y, 2));
      if (dist < CELL_SIZE / 2 && !pattern.includes(dot.id)) {
        setPattern((prev) => [...prev, dot.id]);
        Vibration.vibrate(10);
      }
    });
  };

  const getLineColor = () => {
    if (error) return '#FF4B4B';
    return colors.ventureroot.industrial.primary;
  };

  return (
    <IndustrialPage>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <IndustrialText variant="label" style={styles.label}>
            SECURITY LAYER
          </IndustrialText>
          <IndustrialText variant="h1" style={styles.title}>
            {confirming ? 'CONFIRM\nPATTERN' : 'DRAW NEW\nPATTERN'}
          </IndustrialText>
          <View style={styles.accentBar} />
          
          <IndustrialText style={styles.subtitle}>
            Connect at least 4 dots to create your unique security pattern for industrial-grade access control.
          </IndustrialText>
        </View>

        {/* Pattern Grid */}
        <PatternGrid onComplete={handlePatternComplete} error={error} />

        {/* Status / Actions */}
        <View style={styles.footer}>
          {error && (
            <View style={styles.errorBox}>
              <IndustrialText variant="label" style={styles.errorText}>
                {pattern.length < 4 ? 'CONNECT AT LEAST 4 DOTS' : 'PATTERNS DO NOT MATCH'}
              </IndustrialText>
            </View>
          )}
          
          {!error && confirming && (
            <View style={styles.infoBox}>
              <IndustrialText variant="label" style={styles.infoText}>
                RE-DRAW TO CONFIRM
              </IndustrialText>
            </View>
          )}

          {isSaving && (
            <View style={styles.infoBox}>
              <IndustrialText variant="label" style={styles.infoText}>
                SAVING SECURITY SETTINGS...
              </IndustrialText>
            </View>
          )}

          <TouchableOpacity 
            style={styles.resetBtn} 
            onPress={() => {
              setPattern([]);
              setConfirming(false);
              setFirstPattern([]);
              setError(false);
            }}
          >
            <RefreshCcw size={16} color={colors.ventureroot.industrial.primary} />
            <IndustrialText variant="label" style={styles.resetText}>RESET SETUP</IndustrialText>
          </TouchableOpacity>

          <View style={styles.brandBadge}>
            <ShieldCheck size={12} color={colors.ventureroot.industrial.primary} />
            <IndustrialText variant="label" style={styles.brandText}>
              SECURED BY VENTUREROOT
            </IndustrialText>
          </View>
        </View>
      </View>
    </IndustrialPage>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 60,
  },
  header: {
    alignItems: 'flex-start',
    marginBottom: 40,
  },
  label: {
    color: colors.ventureroot.industrial.primary,
    letterSpacing: 4,
    marginBottom: 8,
  },
  title: {
    fontSize: 42,
    lineHeight: 48,
  },
  accentBar: {
    width: 40,
    height: 4,
    backgroundColor: colors.ventureroot.industrial.primary,
    marginTop: 24,
  },
  subtitle: {
    marginTop: 20,
    opacity: 0.4,
    fontSize: 13,
    lineHeight: 20,
  },
  gridContainer: {
    width: width - PADDING * 2,
    height: width - PADDING * 2,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderRadius: 24,
    overflow: 'hidden',
  },
  dotsLayer: {
    flex: 1,
  },
  dot: {
    position: 'absolute',
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
  },
  activeDot: {
    transform: [{ scale: 1.5 }],
    shadowColor: colors.ventureroot.industrial.primary,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  footer: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 40,
  },
  errorBox: {
    backgroundColor: 'rgba(255, 75, 75, 0.1)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  errorText: {
    color: '#FF4B4B',
    fontSize: 9,
    letterSpacing: 2,
  },
  infoBox: {
    backgroundColor: 'rgba(39, 174, 96, 0.1)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  infoText: {
    color: colors.ventureroot.industrial.primary,
    fontSize: 9,
    letterSpacing: 2,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    marginBottom: 32,
  },
  resetText: {
    fontSize: 10,
    color: colors.ventureroot.industrial.primary,
  },
  brandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    opacity: 0.3,
  },
  brandText: {
    fontSize: 8,
    marginLeft: 8,
    letterSpacing: 1,
  },
});

export default PatternSetupScreen;
