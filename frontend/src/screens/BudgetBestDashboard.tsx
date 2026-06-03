import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import SavingsBucket from '../components/SavingsBucket';
import { getDashboard } from '../services/budgetBestApi';
import { SavingsDashboard, SavingsProgress } from '../types/budget-best';
import { colors } from '../theme/colors';

type BucketView = {
  name: string;
  current: number;
  target: number;
  progress: number;
  color: string;
};

export default function BudgetBestDashboardScreen() {
  const [dashboard, setDashboard] = useState<SavingsDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const data = await getDashboard();
      setDashboard(data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const buckets = useMemo<BucketView[]>(() => {
    if (!dashboard) return [];
    return (dashboard.goals_progress || []).map((goal: SavingsProgress) => ({
      name: goal.goal_name,
      current: goal.current_savings,
      target: goal.target_amount,
      progress: goal.progress_percentage,
      color: colors.ventureroot.green,
    }));
  }, [dashboard]);

  if (loading && !dashboard) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={colors.ventureroot.green} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} />
        }
      >
        <Text style={styles.title}>Budget_Best</Text>
        <Text style={styles.subtitle}>Secure, automated, and streak-driven savings.</Text>

        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>Total Savings</Text>
          <Text style={styles.heroValue}>N{(dashboard?.total_savings ?? 0).toLocaleString()}</Text>
          <Text style={styles.heroHint}>
            Auto-Sweep active at 08:00 where enabled. Zero-loss principal protection.
          </Text>
        </View>

        <View style={styles.streakCard}>
          <Text style={styles.streakTitle}>Consistency Tier</Text>
          <Text style={styles.streakValue}>
            {dashboard?.current_streak ?? 0} days - {(dashboard?.tier_level ?? 'starter').toUpperCase()}
          </Text>
          {(dashboard?.current_streak ?? 0) >= 7 ? (
            <Text style={styles.tierSignal}>Tier 1 Saver unlocked</Text>
          ) : (
            <Text style={styles.tierSignal}>Deposit daily to unlock Tier 1 Saver</Text>
          )}
        </View>

        <Text style={styles.sectionTitle}>Savings Buckets</Text>
        {buckets.map((bucket) => (
          <SavingsBucket
            key={bucket.name}
            name={bucket.name}
            currentAmount={bucket.current}
            targetAmount={bucket.target}
            progressPercentage={bucket.progress}
            color={bucket.color}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.page },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background.page },
  content: { padding: 16, paddingBottom: 28 },
  title: { color: colors.text.primary, fontSize: 28, fontWeight: '800' },
  subtitle: { color: colors.text.secondary, marginTop: 4, marginBottom: 14, fontSize: 13 },
  heroCard: {
    backgroundColor: colors.ventureroot.green,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  heroLabel: { color: '#D1FAE5', fontWeight: '600', fontSize: 12 },
  heroValue: { color: colors.ventureroot.white, fontWeight: '800', fontSize: 30, marginTop: 8 },
  heroHint: { color: '#E5E7EB', marginTop: 8, fontSize: 12 },
  streakCard: {
    backgroundColor: colors.background.card,
    borderRadius: 14,
    padding: 14,
    borderColor: colors.border.light,
    borderWidth: 1,
    marginBottom: 14,
  },
  streakTitle: { color: colors.text.secondary, fontSize: 12, fontWeight: '700' },
  streakValue: { color: colors.text.primary, fontSize: 18, fontWeight: '700', marginTop: 6 },
  tierSignal: { color: colors.ventureroot.green, marginTop: 8, fontWeight: '600', fontSize: 12 },
  sectionTitle: { color: colors.text.primary, fontSize: 17, fontWeight: '700', marginBottom: 8 },
});
