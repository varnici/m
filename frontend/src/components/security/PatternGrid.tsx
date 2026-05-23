import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  PanResponder,
  Dimensions,
  Vibration,
} from 'react-native';
import Svg, { Line, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withSpring, 
  withSequence,
  withTiming 
} from 'react-native-reanimated';
import { useIndustrialTheme } from '../ui/IndustrialComponents';
import { colors } from '../../theme/colors';

const { width } = Dimensions.get('window');
const GRID_SIZE = 3;
const DOT_SIZE = 24;
const PADDING = 40;
const CONTAINER_WIDTH = width - PADDING * 2;
const CELL_SIZE = CONTAINER_WIDTH / GRID_SIZE;

interface Point {
  x: number;
  y: number;
  id: number;
}

interface PatternGridProps {
  onComplete: (pattern: number[]) => void;
  error?: boolean;
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export const PatternGrid: React.FC<PatternGridProps> = ({ onComplete, error }) => {
  const [pattern, setPattern] = useState<number[]>([]);
  const [activePoint, setActivePoint] = useState<{ x: number; y: number } | null>(null);
  const theme = useIndustrialTheme();
  const dotsRef = useRef<Point[]>([]);
  const patternRef = useRef<number[]>([]);
  
  // Animations for dots
  const dotScales = useRef<Animated.SharedValue<number>[]>(
    Array(GRID_SIZE * GRID_SIZE).fill(0).map(() => useSharedValue(1))
  ).current;

  if (dotsRef.current.length === 0) {
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        dotsRef.current.push({
          x: col * CELL_SIZE + CELL_SIZE / 2,
          y: row * CELL_SIZE + CELL_SIZE / 2,
          id: row * GRID_SIZE + col,
        });
      }
    }
  }

  const checkDot = useCallback((x: number, y: number) => {
    dotsRef.current.forEach((dot) => {
      const dist = Math.sqrt(Math.pow(x - dot.x, 2) + Math.pow(y - dot.y, 2));
      if (dist < CELL_SIZE / 2.5) {
        if (!patternRef.current.includes(dot.id)) {
          patternRef.current.push(dot.id);
          setPattern([...patternRef.current]);
          
          // Trigger dot animation
          dotScales[dot.id].value = withSequence(
            withSpring(1.5),
            withSpring(1.2)
          );
          
          Vibration.vibrate(15);
        }
      }
    });
  }, [dotScales]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        patternRef.current = [];
        setPattern([]);
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
        onComplete(patternRef.current);
      },
    })
  ).current;

  const getLineColor = () => {
    if (error) return '#FF4B4B';
    return colors.ventureroot.industrial.primary;
  };

  return (
    <View style={styles.gridContainer} {...panResponder.panHandlers}>
      <Svg style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={getLineColor()} stopOpacity="0.8" />
            <Stop offset="1" stopColor={getLineColor()} stopOpacity="1" />
          </LinearGradient>
        </Defs>

        {/* Static Dots Background */}
        {dotsRef.current.map((dot) => (
          <Circle
            key={`bg-dot-${dot.id}`}
            cx={dot.x}
            cy={dot.y}
            r={DOT_SIZE / 3}
            fill={theme.outline + '40'}
          />
        ))}

        {/* Lines */}
        {pattern.map((dotId, index) => {
          if (index === 0) return null;
          const startDot = dotsRef.current[pattern[index - 1]];
          const endDot = dotsRef.current[dotId];
          return (
            <Line
              key={`line-${index}`}
              x1={startDot.x}
              y1={startDot.y}
              x2={endDot.x}
              y2={endDot.y}
              stroke="url(#lineGradient)"
              strokeWidth="6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          );
        })}

        {/* Active Line */}
        {pattern.length > 0 && activePoint && (
          <Line
            x1={dotsRef.current[pattern[pattern.length - 1]].x}
            y1={dotsRef.current[pattern[pattern.length - 1]].y}
            x2={activePoint.x}
            y2={activePoint.y}
            stroke={getLineColor()}
            strokeWidth="4"
            strokeLinecap="round"
            opacity={0.6}
            strokeDasharray="4, 4"
          />
        )}

        {/* Active Dots with Animation */}
        {pattern.map((dotId) => {
          const dot = dotsRef.current[dotId];
          return (
            <Circle
              key={`active-dot-${dotId}`}
              cx={dot.x}
              cy={dot.y}
              r={DOT_SIZE / 2}
              fill={getLineColor()}
              opacity={0.8}
            />
          );
        })}
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  gridContainer: {
    width: CONTAINER_WIDTH,
    height: CONTAINER_WIDTH,
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 32,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
});
