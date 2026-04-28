import React from 'react';
import { View, TouchableOpacity, useColorScheme, StyleSheet } from 'react-native';
import { IndustrialText } from '../ui/IndustrialComponents';
import { Delete } from 'lucide-react-native';

interface NumericKeypadProps {
  onPress: (val: string) => void;
  onDelete: () => void;
}

export const NumericKeypad: React.FC<NumericKeypadProps> = ({ onPress, onDelete }) => {
  const isDark = useColorScheme() === 'dark';

  return (
    <View style={styles.container}>
      <View style={styles.grid}>
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'EMPTY', '0'].map((v, i) => (
          v === 'EMPTY' ? (
            <View key={i} style={styles.keyPlaceholder} />
          ) : (
            <TouchableOpacity
              key={v}
              activeOpacity={0.7}
              style={[
                styles.key,
                { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)' }
              ]}
              onPress={() => onPress(v)}
            >
              <IndustrialText style={styles.keyText}>{v}</IndustrialText>
            </TouchableOpacity>
          )
        ))}
        <TouchableOpacity
          activeOpacity={0.7}
          style={[
            styles.key,
            { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }
          ]}
          onPress={onDelete}
        >
          <Delete size={28} color={isDark ? "#FFFFFF" : "#111827"} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  key: {
    width: '30%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderRadius: 12,
  },
  keyPlaceholder: {
    width: '30%',
    aspectRatio: 1,
  },
  keyText: {
    fontSize: 28,
    fontWeight: '700',
  },
});
