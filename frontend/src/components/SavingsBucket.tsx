import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export type SavingsBucketProps = {
  // Stashed Props
  title?: string;
  category?: string;
  progress?: number;
  currency?: string;

  // Upstream Props
  name?: string;
  progressPercentage?: number;
  color?: string;
  trustLabel?: string;

  // Common Props
  currentAmount: number;
  targetAmount: number;
};

const SavingsBucket: React.FC<SavingsBucketProps> = ({
  title,
  category,
  currentAmount,
  targetAmount,
  currency = '₦',
  progress,
  name,
  progressPercentage,
  color,
  trustLabel,
}) => {
  const displayTitle = name || title || 'Savings';
  const displayCategory = category || trustLabel || 'Principal Protected';
  const displayProgress = progressPercentage !== undefined ? progressPercentage : (progress !== undefined ? progress : 0);
  
  // Format numbers to currency
  const formatCurrency = (amount: number) => {
    // Detect if amount is in kobo or normal Naira.
    const isKobo = title !== undefined || progress !== undefined;
    const finalAmount = isKobo ? amount / 100 : amount;
    return `${currency}${finalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const barColors = (color ? [color, color] : ['#004D2C', '#009D5C']) as [string, string, ...string[]];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{displayTitle}</Text>
          <Text style={styles.category}>{displayCategory}</Text>
        </View>
        <View style={styles.amountContainer}>
          <Text style={styles.currentAmount}>{formatCurrency(currentAmount)}</Text>
          <Text style={styles.targetAmount}>of {formatCurrency(targetAmount)}</Text>
        </View>
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressBarBackground}>
          <LinearGradient
            colors={barColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.progressBarFill, { width: `${Math.min(100, displayProgress)}%` }]}
          />
        </View>
        <Text style={styles.progressText}>{displayProgress.toFixed(1)}%</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  category: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  currentAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#004D2C',
  },
  targetAmount: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBarBackground: {
    flex: 1,
    height: 10,
    backgroundColor: '#F1F5F9',
    borderRadius: 5,
    overflow: 'hidden',
    marginRight: 12,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 5,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    width: 45,
    textAlign: 'right',
  },
});

export default SavingsBucket;
