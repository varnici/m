import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  PanResponder,
  Dimensions,
  Vibration,
} from 'react-native';
import Svg, { Line } from 'react-native-svg';
import { useIndustrialTheme } from '../ui/IndustrialComponents';
import { colors } from '../../theme/colors';

const { width } = Dimensions.get('window');
const GRID_SIZE = 3;
const DOT_SIZE = 20;
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

export const PatternGrid: React.FC<PatternGridProps> = ({ onComplete, error }) => {
  const [pattern, setPattern] = useState<number[]>([]);
  const [activePoint, setActivePoint] = useState<{ x: number; y: number } | null>(null);
  const theme = useIndustrialTheme();
  const dotsRef = useRef<Point[]>([]);

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

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
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
        onComplete(pattern);
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
    <View style={styles.gridContainer} {...panResponder.panHandlers}>
      <Svg style={StyleSheet.absoluteFill}>
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
              stroke={getLineColor()}
              strokeWidth="4"
              strokeLinecap="round"
            />
          );
        })}
        {pattern.length > 0 && activePoint && (
          <Line
            x1={dotsRef.current[pattern[pattern.length - 1]].x}
            y1={dotsRef.current[pattern[pattern.length - 1]].y}
            x2={activePoint.x}
            y2={activePoint.y}
            stroke={getLineColor()}
            strokeWidth="4"
            strokeLinecap="round"
            opacity={0.5}
          />
        )}
      </Svg>

      <View style={styles.dotsLayer} pointerEvents="none">
        {dotsRef.current.map((dot) => {
          const isActive = pattern.includes(dot.id);
          return (
            <View
              key={dot.id}
              style={[
                styles.dot,
                {
                  left: dot.x - DOT_SIZE / 2,
                  top: dot.y - DOT_SIZE / 2,
                  backgroundColor: isActive 
                    ? getLineColor()
                    : (theme.outline + '40'),
                },
                isActive && styles.activeDot,
              ]}
            />
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  gridContainer: {
    width: CONTAINER_WIDTH,
    height: CONTAINER_WIDTH,
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
  },
});
