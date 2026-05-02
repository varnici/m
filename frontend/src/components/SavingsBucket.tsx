import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

type SavingsBucketProps = {
  name: string;
  currentAmount: number;
  targetAmount: number;
  progressPercentage: number;
  color?: string;
  trustLabel?: string;
};

export default function SavingsBucket({
  name,
  currentAmount,
  targetAmount,
  progressPercentage,
  color = colors.ventureroot.green,
  trustLabel = 'Principal Protected',
}: SavingsBucketProps) {
  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.badge}>{trustLabel}</Text>
      </View>
      <View style={styles.amountRow}>
        <Text style={styles.amount}>N{currentAmount.toLocaleString()}</Text>
        <Text style={styles.target}>/ N{targetAmount.toLocaleString()}</Text>
      </View>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${Math.min(progressPercentage, 100)}%`, backgroundColor: color }]} />
      </View>
      <Text style={styles.progress}>{progressPercentage.toFixed(1)}% funded</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.light,
    padding: 14,
    marginBottom: 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  name: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: '700',
  },
  badge: {
    color: colors.ventureroot.green,
    borderColor: colors.ventureroot.green,
    borderWidth: 1,
    borderRadius: 999,
    fontSize: 11,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 10,
  },
  amount: {
    fontSize: 18,
    color: colors.text.primary,
    fontWeight: '700',
  },
  target: {
    marginLeft: 6,
    color: colors.text.secondary,
    fontSize: 13,
  },
  barTrack: {
    marginTop: 10,
    height: 10,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
  },
  barFill: {
    height: '100%',
    borderRadius: 999,
  },
  progress: {
    marginTop: 8,
    color: colors.text.secondary,
    fontSize: 12,
    fontWeight: '600',
  },
});
