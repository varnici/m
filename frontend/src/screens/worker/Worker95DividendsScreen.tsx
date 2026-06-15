// @ts-nocheck
import React, { useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ChevronLeft,
  TrendingUp,
  Calendar,
  Award,
  Zap,
} from 'lucide-react-native';
import { useWorkerStore, selectActiveInvestments } from '@/store/workerStore';
import type { RootStackScreenProps } from '@/navigation/types';

const { width: SW } = Dimensions.get('window');

const fmt = (n: number) =>
  `₦${n.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-NG', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch { return '—'; }
}

// ---------------------------------------------------------------------------
// Build a flat dividend event list from active investments
// ---------------------------------------------------------------------------
interface DividendEvent {
  id: string;
  businessName: string;
  category: string;
  principal: number;
  dividendAmount: number;
  yieldPct: number;
  paymentDate: string;
  status: 'Paid' | 'Pending' | 'Projected';
}

function buildDividendTimeline(investments: ReturnType<typeof selectActiveInvestments>): DividendEvent[] {
  const events: DividendEvent[] = [];

  investments.forEach((inv) => {
    // Paid (historical) — simulate 3 past payments
    for (let i = 3; i >= 1; i--) {
      const d = new Date(inv.created_at);
      d.setMonth(d.getMonth() + i);
      events.push({
        id: `${inv.id}-past-${i}`,
        businessName: inv.business_name,
        category: '',
        principal: inv.principal_amount,
        dividendAmount: inv.principal_amount * inv.current_yield_pct / 100,
        yieldPct: inv.current_yield_pct,
        paymentDate: d.toISOString(),
        status: 'Paid',
      });
    }
    // Current month — pending
    const nextPayment = new Date();
    nextPayment.setDate(1);
    nextPayment.setMonth(nextPayment.getMonth() + 1);
    events.push({
      id: `${inv.id}-pending`,
      businessName: inv.business_name,
      category: '',
      principal: inv.principal_amount,
      dividendAmount: inv.principal_amount * inv.current_yield_pct / 100,
      yieldPct: inv.current_yield_pct,
      paymentDate: nextPayment.toISOString(),
      status: 'Pending',
    });
    // +2 months projected
    const proj = new Date(nextPayment);
    proj.setMonth(proj.getMonth() + 1);
    events.push({
      id: `${inv.id}-projected`,
      businessName: inv.business_name,
      category: '',
      principal: inv.principal_amount,
      dividendAmount: inv.principal_amount * inv.current_yield_pct / 100,
      yieldPct: inv.current_yield_pct,
      paymentDate: proj.toISOString(),
      status: 'Projected',
    });
  });

  return events.sort(
    (a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()
  );
}

const STATUS_CFG = {
  Paid:      { bg: '#D1FAE5', text: '#065F46', dot: '#059669' },
  Pending:   { bg: '#FEF3C7', text: '#92400E', dot: '#FBBF24' },
  Projected: { bg: '#EDE9FE', text: '#5B21B6', dot: '#7C3AED' },
};

// ---------------------------------------------------------------------------
// Dividend row
// ---------------------------------------------------------------------------
const DividendRow = React.memo(({ item }: { item: DividendEvent }) => {
  const cfg = STATUS_CFG[item.status];
  return (
    <View style={styles.row}>
      <View style={[styles.statusDot, { backgroundColor: cfg.dot }]} />
      <View style={styles.rowBody}>
        <View style={styles.rowTop}>
          <Text style={styles.businessName} numberOfLines={1}>{item.businessName}</Text>
          <Text style={[styles.amount, { color: item.status === 'Paid' ? '#059669' : '#374151' }]}>
            +{fmt(item.dividendAmount)}
          </Text>
        </View>
        <View style={styles.rowBottom}>
          <View style={styles.rowMeta}>
            <Calendar size={11} color="#9CA3AF" />
            <Text style={styles.dateText}>{fmtDate(item.paymentDate)}</Text>
          </View>
          <View style={styles.rowMeta}>
            <TrendingUp size={11} color="#9CA3AF" />
            <Text style={styles.dateText}>{item.yieldPct.toFixed(2)}% on {fmt(item.principal)}</Text>
          </View>
        </View>
      </View>
      <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
        <Text style={[styles.statusText, { color: cfg.text }]}>{item.status}</Text>
      </View>
    </View>
  );
});

// ---------------------------------------------------------------------------
// Mini bar chart: earnings per investment
// ---------------------------------------------------------------------------
function EarningsChart({ investments }: { investments: ReturnType<typeof selectActiveInvestments> }) {
  if (investments.length === 0) return null;
  const max = Math.max(...investments.map((i) => i.dividends_earned), 1);
  const barW = (SW - 64) / investments.length - 8;

  return (
    <View style={styles.chartWrap}>
      <Text style={styles.chartTitle}>Dividends Earned per Investment</Text>
      <View style={styles.chartBars}>
        {investments.map((inv) => {
          const h = Math.max(6, (inv.dividends_earned / max) * 72);
          return (
            <View key={inv.id} style={[styles.chartBarWrap, { width: barW }]}>
              <Text style={styles.chartBarVal}>
                {inv.dividends_earned > 0 ? `₦${(inv.dividends_earned / 1000).toFixed(0)}k` : '—'}
              </Text>
              <View style={[styles.chartBar, { height: h }]} />
              <Text style={styles.chartBarLabel} numberOfLines={2}>
                {inv.business_name.split(' ')[0]}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------
export default function Worker95DividendsScreen({
  navigation,
}: RootStackScreenProps<'Worker95Dividends'>) {
  const investments = useWorkerStore(selectActiveInvestments);
  const summary = useWorkerStore((s) => s.summary);

  const timeline = useMemo(() => buildDividendTimeline(investments), [investments]);

  const totalEarned = summary?.total_dividends_earned ?? 0;
  const cumMonthly = summary?.cumulative_monthly_dividends ?? 0;

  const nextPayment = useMemo(() => {
    const pending = timeline.find((e) => e.status === 'Pending');
    return pending ? pending.paymentDate : null;
  }, [timeline]);

  const keyExtractor = useCallback((item: DividendEvent) => item.id, []);
  const renderItem = useCallback(({ item }: { item: DividendEvent }) => (
    <DividendRow item={item} />
  ), []);

  const ListHeader = (
    <>
      {/* ── Hero card ── */}
      <LinearGradient colors={['#064E3B', '#059669']} style={styles.hero}>
        <View style={styles.heroTop}>
          <Award size={28} color="#FCD34D" />
          <Text style={styles.heroLabel}>Total Dividends Earned</Text>
        </View>
        <Text style={styles.heroAmount}>{fmt(totalEarned)}</Text>
        <View style={styles.heroStats}>
          <View style={styles.heroStat}>
            <Text style={styles.heroStatVal}>{fmt(cumMonthly)}</Text>
            <Text style={styles.heroStatLabel}>Expected This Month</Text>
          </View>
          <View style={styles.heroStatDivider} />
          <View style={styles.heroStat}>
            <Text style={styles.heroStatVal}>{investments.length}</Text>
            <Text style={styles.heroStatLabel}>Active Investments</Text>
          </View>
          <View style={styles.heroStatDivider} />
          <View style={styles.heroStat}>
            <Text style={styles.heroStatVal}>{nextPayment ? fmtDate(nextPayment) : '—'}</Text>
            <Text style={styles.heroStatLabel}>Next Payout</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Status legend */}
      <View style={styles.legend}>
        {Object.entries(STATUS_CFG).map(([key, cfg]) => (
          <View key={key} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: cfg.dot }]} />
            <Text style={styles.legendLabel}>{key}</Text>
          </View>
        ))}
      </View>

      <EarningsChart investments={investments} />

      {/* Next payout alert */}
      {nextPayment && (
        <View style={styles.nextPayoutCard}>
          <Zap size={16} color="#FBBF24" />
          <Text style={styles.nextPayoutText}>
            Next dividend of approx.{' '}
            <Text style={styles.nextPayoutBold}>{fmt(cumMonthly)}</Text>{' '}
            expected on {fmtDate(nextPayment)}.
          </Text>
        </View>
      )}

      <Text style={styles.timelineTitle}>Payment Timeline</Text>
    </>
  );

  const ListEmpty = (
    <View style={styles.emptyContainer}>
      <Award size={48} color="#D1D5DB" />
      <Text style={styles.emptyTitle}>No Dividends Yet</Text>
      <Text style={styles.emptyDesc}>
        Start investing to see your dividend payment timeline here.
      </Text>
      <TouchableOpacity
        style={styles.emptyBtn}
        onPress={() => navigation.navigate('Worker95Marketplace')}
      >
        <Text style={styles.emptyBtnText}>Browse Investments</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={22} color="#111827" />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Dividend History</Text>
          <Text style={styles.headerSub}>{timeline.length} events across {investments.length} investments</Text>
        </View>
      </View>

      <FlashList
        data={timeline}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        estimatedItemSize={80}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={ListEmpty}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F9FAFB' },
  listContent: { paddingBottom: 60 },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
  },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  headerSub: { fontSize: 12, color: '#9CA3AF', marginTop: 1 },

  hero: { padding: 24 },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  heroLabel: { fontSize: 13, color: 'rgba(255,255,255,0.75)' },
  heroAmount: { fontSize: 36, fontWeight: '900', color: '#fff', letterSpacing: -1, marginBottom: 20 },
  heroStats: { flexDirection: 'row', alignItems: 'center' },
  heroStat: { flex: 1, alignItems: 'center' },
  heroStatVal: { fontSize: 14, fontWeight: '800', color: '#fff', marginBottom: 2, textAlign: 'center' },
  heroStatLabel: { fontSize: 10, color: 'rgba(255,255,255,0.65)', textAlign: 'center' },
  heroStatDivider: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.25)' },

  legend: { flexDirection: 'row', gap: 16, paddingHorizontal: 16, paddingVertical: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontSize: 12, color: '#6B7280', fontWeight: '500' },

  chartWrap: { marginHorizontal: 16, backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  chartTitle: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 14 },
  chartBars: { flexDirection: 'row', alignItems: 'flex-end', height: 88, gap: 6 },
  chartBarWrap: { alignItems: 'center', gap: 4 },
  chartBarVal: { fontSize: 9, color: '#9CA3AF', textAlign: 'center' },
  chartBar: { width: '100%', backgroundColor: '#A7F3D0', borderRadius: 4 },
  chartBarLabel: { fontSize: 9, color: '#6B7280', textAlign: 'center', lineHeight: 12 },

  nextPayoutCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    marginHorizontal: 16, backgroundColor: '#FEF3C7', borderRadius: 12,
    padding: 14, marginBottom: 16, borderWidth: 1, borderColor: '#FDE68A',
  },
  nextPayoutText: { flex: 1, fontSize: 13, color: '#92400E', lineHeight: 19 },
  nextPayoutBold: { fontWeight: '700' },

  timelineTitle: { fontSize: 14, fontWeight: '700', color: '#111827', paddingHorizontal: 16, marginBottom: 10 },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  rowBody: { flex: 1 },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  businessName: { fontSize: 13, fontWeight: '600', color: '#111827', flex: 1, marginRight: 8 },
  amount: { fontSize: 14, fontWeight: '800' },
  rowBottom: { flexDirection: 'row', gap: 12 },
  rowMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dateText: { fontSize: 11, color: '#9CA3AF' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },

  emptyContainer: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 32, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#374151' },
  emptyDesc: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', lineHeight: 21 },
  emptyBtn: { backgroundColor: '#D1FAE5', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 4 },
  emptyBtnText: { color: '#059669', fontWeight: '700', fontSize: 14 },
});
