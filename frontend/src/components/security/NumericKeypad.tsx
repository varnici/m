import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Vibration,
} from 'react-native';
import { IndustrialText } from '../ui/IndustrialComponents';
import { colors } from '../../theme/colors';
import { Delete, Shield } from 'lucide-react-native';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withSpring, 
  withSequence,
  withTiming
} from 'react-native-reanimated';

const { width } = Dimensions.get('window');
const BUTTON_SIZE = width * 0.22;

interface NumericKeypadProps {
  onPress: (val: string) => void;
  onDelete: () => void;
  theme?: 'industrial' | 'rich';
}

const KeypadButton = ({ val, onPress, isSpecial }: { val: string, onPress: () => void, isSpecial?: boolean }) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.9);
    opacity.value = withTiming(0.7, { duration: 100 });
    Vibration.vibrate(10);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
    opacity.value = withTiming(1, { duration: 100 });
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
    >
      <Animated.View style={[styles.button, isSpecial && styles.specialButton, animatedStyle]}>
        {val === 'DELETE' ? (
          <Delete color={colors.ventureroot.industrial.primary} size={28} />
        ) : val === 'EMPTY' ? (
          <Shield color={colors.ventureroot.industrial.primary + '40'} size={24} />
        ) : (
          <IndustrialText style={styles.buttonText}>{val}</IndustrialText>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
};

export const NumericKeypad: React.FC<NumericKeypadProps> = ({ onPress, onDelete }) => {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'EMPTY', '0', 'DELETE'];

  return (
    <View style={styles.container}>
      <View style={styles.grid}>
        {keys.map((key) => (
          <View key={`key-${key}`} style={styles.buttonWrapper}>
            <KeypadButton 
              val={key} 
              onPress={() => {
                if (key === 'DELETE') onDelete();
                else if (key !== 'EMPTY') onPress(key);
              }} 
              isSpecial={key === 'DELETE' || key === 'EMPTY'}
            />
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    width: '100%',
  },
  buttonWrapper: {
    width: '33%',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  button: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  specialButton: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    borderWidth: 0,
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.ventureroot.industrial.primary,
  },
});
