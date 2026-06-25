// @ts-nocheck
import React, { useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Clipboard,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Wallet,
  TrendingUp,
  Copy,
  Building2,
  Target,
  ChevronRight,
  AlertCircle,
  Zap,
  RefreshCw,
  Briefcase,
} from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { workerService } from '@/services/workerService';
import { useWorkerStore, selectActivePlans, selectActiveInvestments } from '@/store/workerStore';
import VelocityScoreCard from '@/components/ui/VelocityScoreCard';
import type { RootStackScreenProps } from '@/navigation/types';
import AppHeader from '@/components/ui/AppHeader';

const fmt = (n: number) =>
  `₦${n.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const pct = (current: number, target: number) =>
  target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;

export default function WorkerDashboardScreen({
  navigation,
}: RootStackScreenProps<'Worker95Dashboard'>) {
  const { user } = useAuth();
  const setSummary = useWorkerStore((s) => s.setSummary);
  const setLedgerEntries = useWorkerStore((s) => s.setLedgerEntries);
  const summary = useWorkerStore((s) => s.summary);
  const plans = useWorkerStore(selectActivePlans);
  const investments = useWorkerStore(selectActiveInvestments);

  const { isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['worker-dashboard', user?.id],
    queryFn: async () => {
      const data = await workerService.getDashboardSummary(user!.id);
      setSummary(data);
      setLedgerEntries(workerService.buildLedgerFromDashboard(data));
      return data;
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 3,
  });

  const copyAccount = useCallback(() => {
    if (summary?.virtual_account_number) {
      Clipboard.setString(summary.virtual_account_number);
      Alert.alert('Copied', 'Account number copied to clipboard.');
    }
  }, [summary]);

  if (isLoading && !summary) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#059669" />
        <Text style={styles.loadingText}>Loading your portfolio…</Text>
      </SafeAreaView>
    );
  }

  if (isError && !summary) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <AlertCircle size={40} color="#EF4444" />
        <Text style={styles.errorText}>Failed to load data. Check your connection.</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
          <RefreshCw size={16} color="#fff" />
          <Text style={styles.retryBtnText}>Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['bottom', 'left', 'right']}>
      <AppHeader title="Dashboard" showBack={false} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor="#059669"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good day,</Text>
            <Text style={styles.name}>{summary?.full_name ?? 'Worker'}</Text>
          </View>
          <TouchableOpacity
            style={styles.briefcaseIcon}
            onPress={() => navigation.navigate('Worker95Profile')}
          >
            <Briefcase size={22} color="#059669" />
          </TouchableOpacity>
        </View>

        {/* ── Net Portfolio Card ── */}
        <LinearGradient colors={['#064E3B', '#059669']} style={styles.portfolioCard}>
          <Text style={styles.portfolioLabel}>Net Portfolio Value</Text>
          <Text style={styles.portfolioValue}>{fmt(summary?.net_portfolio_value ?? 0)}</Text>
          <View style={styles.portfolioRow}>
            <View style={styles.portfolioStat}>
              <Text style={styles.portfolioStatLabel}>Monthly Dividends</Text>
              <Text style={styles.portfolioStatValue}>
                {fmt(summary?.cumulative_monthly_dividends ?? 0)}
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.portfolioStat}>
              <Text style={styles.portfolioStatLabel}>Savings Balance</Text>
              <Text style={styles.portfolioStatValue}>
                {fmt(summary?.total_savings_balance ?? 0)}
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* ── Sales Velocity Score ── */}
        <View style={styles.section}>
          <VelocityScoreCard onPress={() => navigation.navigate('SalesVelocity')} />
        </View>

        {/* ── Virtual Account Funding Block ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Fund Your Portfolio</Text>
          <View style={styles.accountCard}>
            <View style={styles.accountTop}>
              <Building2 size={18} color="#059669" />
              <Text style={styles.accountBank}>
                {summary?.virtual_account_bank ?? 'VentureRoot MFB'}
              </Text>
            </View>
            <Text style={styles.accountLabel}>Virtual Account Number</Text>
            <View style={styles.accountNumberRow}>
              <Text style={styles.accountNumber}>
                {summary?.virtual_account_number ?? '——— ——— ———'}
              </Text>
              <TouchableOpacity onPress={copyAccount} style={styles.copyBtn}>
                <Copy size={16} color="#059669" />
              </TouchableOpacity>
            </View>
            <Text style={styles.accountHint}>
              Transfer to this account to instantly top up your portfolio.
            </Text>
          </View>
        </View>

        {/* ── Active Investments Horizontal List ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Active Investments</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Worker95Portfolio')}>
              <Text style={styles.seeAll}>View All →</Text>
            </TouchableOpacity>
          </View>

          {investments.length === 0 ? (
            <View style={styles.emptyCard}>
              <TrendingUp size={28} color="#9CA3AF" />
              <Text style={styles.emptyText}>No active investments yet.</Text>
              <TouchableOpacity
                style={styles.emptyAction}
                onPress={() => navigation.navigate('Worker95Marketplace')}
              >
                <Text style={styles.emptyActionText}>Browse Marketplace</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {investments.map((inv) => (
                <TouchableOpacity
                  key={inv.id}
                  style={styles.investCard}
                  onPress={() => navigation.navigate('Worker95InvestmentDetail', { investmentId: inv.id })}
                  activeOpacity={0.7}
                >
                  <Text style={styles.investName} numberOfLines={2}>
                    {inv.business_name}
                  </Text>
                  <View style={styles.investRow}>
                    <Text style={styles.investLabel}>Principal</Text>
                    <Text style={styles.investValue}>{fmt(inv.principal_amount)}</Text>
                  </View>
                  <View style={styles.investRow}>
                    <Text style={styles.investLabel}>Dividends</Text>
                    <Text style={[styles.investValue, { color: '#10B981' }]}>
                      +{fmt(inv.dividends_earned)}
                    </Text>
                  </View>
                  <View style={styles.yieldBadge}>
                    <Zap size={12} color="#FBBF24" />
                    <Text style={styles.yieldText}>1.00% / mo</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* ── Savings Targets ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Business Savings Targets</Text>
            <TouchableOpacity onPress={() => navigation.navigate('WorkerSavings' as any)}>
              <Text style={styles.seeAll}>Manage</Text>
            </TouchableOpacity>
          </View>

          {plans.length === 0 ? (
            <View style={styles.emptyCard}>
              <Target size={28} color="#9CA3AF" />
              <Text style={styles.emptyText}>No savings targets set yet.</Text>
              <TouchableOpacity
                style={styles.emptyAction}
                onPress={() => navigation.navigate('WorkerSavings' as any)}
              >
                <Text style={styles.emptyActionText}>Create a Target</Text>
              </TouchableOpacity>
            </View>
          ) : (
            plans.map((plan) => {
              const progress = pct(plan.current_balance, plan.target_amount);
              return (
                <View key={plan.id} style={styles.planCard}>
                  <View style={styles.planHeader}>
                    <Text style={styles.planName}>{plan.target_name}</Text>
                    {plan.is_achieved && (
                      <View style={styles.achievedBadge}>
                        <Text style={styles.achievedText}>Achieved</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.planAmounts}>
                    <Text style={styles.planCurrent}>{fmt(plan.current_balance)}</Text>
                    <Text style={styles.planTarget}>of {fmt(plan.target_amount)}</Text>
                  </View>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${progress}%` }]} />
                  </View>
                  <View style={styles.planFooter}>
                    <Text style={styles.planPct}>{progress}% funded</Text>
                    {plan.automated_rule !== 'manual' && (
                      <Text style={styles.planRule}>
                        Auto:{' '}
                        {plan.automated_rule === 'salary_direct' ? 'Salary Sweep' : 'Round-Up'}
                      </Text>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* ── Quick Nav Buttons ── */}
        <TouchableOpacity
          style={styles.ledgerNavBtn}
          onPress={() => navigation.navigate('Worker95Portfolio')}
        >
          <Text style={styles.ledgerNavText}>My Investment Portfolio</Text>
          <ChevronRight size={18} color="#059669" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.ledgerNavBtn, { marginTop: 10 }]}
          onPress={() => navigation.navigate('Worker95Dividends')}
        >
          <Text style={styles.ledgerNavText}>View Dividend History</Text>
          <ChevronRight size={18} color="#059669" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.ledgerNavBtn, { marginTop: 10 }]}
          onPress={() => navigation.navigate('Worker95Ledger')}
        >
          <Text style={styles.ledgerNavText}>View Full Financial Ledger</Text>
          <ChevronRight size={18} color="#059669" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.ledgerNavBtn, { marginTop: 10 }]}
          onPress={() => navigation.navigate('Worker95SalaryConfig')}
        >
          <Text style={styles.ledgerNavText}>Manage Salary Automation</Text>
          <ChevronRight size={18} color="#059669" />
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F9FAFB' },
  scroll: { paddingHorizontal: 16, paddingTop: 8 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, backgroundColor: '#F9FAFB' },
  loadingText: { color: '#6B7280', fontSize: 14 },
  errorText: { color: '#EF4444', fontSize: 14, textAlign: 'center', marginHorizontal: 32, marginTop: 8 },
  retryBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#059669', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, marginTop: 12 },
  retryBtnText: { color: '#fff', fontWeight: '600' },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16 },
  greeting: { fontSize: 13, color: '#6B7280' },
  name: { fontSize: 20, fontWeight: '700', color: '#111827' },
  briefcaseIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#D1FAE5', alignItems: 'center', justifyContent: 'center' },

  portfolioCard: { borderRadius: 20, padding: 22, marginBottom: 20 },
  portfolioLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 13, marginBottom: 4 },
  portfolioValue: { color: '#fff', fontSize: 32, fontWeight: '800', letterSpacing: -0.5, marginBottom: 18 },
  portfolioRow: { flexDirection: 'row', alignItems: 'center' },
  portfolioStat: { flex: 1 },
  portfolioStatLabel: { color: 'rgba(255,255,255,0.65)', fontSize: 11, marginBottom: 2 },
  portfolioStatValue: { color: '#fff', fontSize: 16, fontWeight: '700' },
  divider: { width: 1, height: 36, backgroundColor: 'rgba(255,255,255,0.3)', marginHorizontal: 16 },

  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  seeAll: { fontSize: 13, color: '#059669', fontWeight: '600' },

  accountCard: { backgroundColor: '#fff', borderRadius: 16, padding: 18, borderWidth: 1, borderColor: '#E5E7EB' },
  accountTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  accountBank: { fontSize: 14, fontWeight: '600', color: '#374151' },
  accountLabel: { fontSize: 11, color: '#9CA3AF', marginBottom: 4 },
  accountNumberRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  accountNumber: { fontSize: 24, fontWeight: '800', color: '#111827', letterSpacing: 2 },
  copyBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#D1FAE5', alignItems: 'center', justifyContent: 'center' },
  accountHint: { fontSize: 11, color: '#9CA3AF', marginTop: 10 },

  emptyCard: { backgroundColor: '#fff', borderRadius: 16, padding: 28, alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  emptyText: { color: '#6B7280', fontSize: 14 },
  emptyAction: { backgroundColor: '#D1FAE5', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, marginTop: 4 },
  emptyActionText: { color: '#059669', fontWeight: '600', fontSize: 13 },

  investCard: { width: 180, backgroundColor: '#fff', borderRadius: 16, padding: 16, marginRight: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  investName: { fontSize: 13, fontWeight: '700', color: '#111827', marginBottom: 12, lineHeight: 18 },
  investRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  investLabel: { fontSize: 11, color: '#9CA3AF' },
  investValue: { fontSize: 12, fontWeight: '600', color: '#111827' },
  yieldBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start', marginTop: 8 },
  yieldText: { fontSize: 11, color: '#92400E', fontWeight: '600' },

  planCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  planHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  planName: { fontSize: 14, fontWeight: '700', color: '#111827' },
  achievedBadge: { backgroundColor: '#D1FAE5', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  achievedText: { fontSize: 11, color: '#059669', fontWeight: '600' },
  planAmounts: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: 10 },
  planCurrent: { fontSize: 18, fontWeight: '800', color: '#111827' },
  planTarget: { fontSize: 12, color: '#9CA3AF' },
  progressTrack: { height: 6, backgroundColor: '#E5E7EB', borderRadius: 3, overflow: 'hidden', marginBottom: 8 },
  progressFill: { height: 6, backgroundColor: '#059669', borderRadius: 3 },
  planFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  planPct: { fontSize: 12, color: '#059669', fontWeight: '600' },
  planRule: { fontSize: 11, color: '#6B7280' },

  ledgerNavBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', borderRadius: 14, paddingVertical: 16, paddingHorizontal: 20, borderWidth: 1, borderColor: '#E5E7EB' },
  ledgerNavText: { fontSize: 14, fontWeight: '600', color: '#111827' },
});
