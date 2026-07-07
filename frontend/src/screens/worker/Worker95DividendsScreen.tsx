// @ts-nocheck
import React, { useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
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
import { useQuery } from '@tanstack/react-query';
import { workerService } from '@/services/workerService';
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
// Map real backend dividend records onto the row shape this screen renders.
// dividend_records.status is 'accrued' | 'available' | 'collected' — both
// 'accrued' and 'available' mean "not yet collected" from the worker's view.
// ---------------------------------------------------------------------------
interface DividendEvent {
  id: string;
  businessName: string;
  principal: number | null;
  dividendAmount: number;
  yieldPct: number | null;
  paymentDate: string;
  status: 'Paid' | 'Pending';
}

function mapDividendHistory(
  records: Array<{
    id: string;
    investment_id: string;
    business_name: string;
    period_date: string;
    amount: number;
    status: 'accrued' | 'available' | 'collected';
  }>,
  investments: ReturnType<typeof selectActiveInvestments>
): DividendEvent[] {
  const byId = new Map(investments.map((inv) => [inv.id, inv]));

  return records
    .map((r) => {
      const inv = byId.get(r.investment_id);
      return {
        id: r.id,
        businessName: r.business_name,
        principal: inv?.principal_amount ?? null,
        dividendAmount: r.amount,
        yieldPct: inv?.current_yield_pct ?? null,
        paymentDate: r.period_date,
        status: r.status === 'collected' ? ('Paid' as const) : ('Pending' as const),
      };
    })
    .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());
}

const STATUS_CFG = {
  Paid:    { bg: '#D1FAE5', text: '#065F46', dot: '#059669' },
  Pending: { bg: '#FEF3C7', text: '#92400E', dot: '#FBBF24' },
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
          {item.yieldPct !== null && item.principal !== null && (
            <View style={styles.rowMeta}>
              <TrendingUp size={11} color="#9CA3AF" />
              <Text style={styles.dateText}>{item.yieldPct.toFixed(2)}% on {fmt(item.principal)}</Text>
            </View>
          )}
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

  const { data: records = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['worker-dividend-history'],
    queryFn: () => workerService.getDividendHistory(),
    staleTime: 1000 * 60 * 3,
  });

  const timeline = useMemo(() => mapDividendHistory(records, investments), [records, investments]);

  const totalEarned = summary?.total_dividends_earned ?? 0;
  const cumMonthly = summary?.cumulative_monthly_dividends ?? 0;

  const nextPending = useMemo(
    () => timeline.find((e) => e.status === 'Pending') ?? null,
    [timeline]
  );
  const nextPayment = nextPending?.paymentDate ?? null;

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
            <Text style={styles.heroStatLabel}>Oldest Uncollected</Text>
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

      {/* Uncollected dividend alert */}
      {nextPending && (
        <View style={styles.nextPayoutCard}>
          <Zap size={16} color="#FBBF24" />
          <Text style={styles.nextPayoutText}>
            You have <Text style={styles.nextPayoutBold}>{fmt(nextPending.dividendAmount)}</Text>{' '}
            available to collect from {fmtDate(nextPending.paymentDate)} — visit the investment's
            portfolio detail to collect it.
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
        onPress={() => navigation.navigate('Main', { screen: 'WorkerMarketplace' } as any)}
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

      {isLoading ? (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color="#059669" />
        </View>
      ) : isError ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyDesc}>Couldn't load dividend history.</Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={() => refetch()}>
            <Text style={styles.emptyBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
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
      )}
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
