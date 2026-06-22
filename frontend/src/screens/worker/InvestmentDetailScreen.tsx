// @ts-nocheck
import React, { useCallback, useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ChevronLeft,
  TrendingUp,
  Calendar,
  Clock,
  CheckCircle2,
  Wallet,
  AlertTriangle,
  ArrowDownToLine,
  Shield,
  CircleDollarSign,
  X,
} from 'lucide-react-native';
import {
  workerService,
  InvestmentDetail,
  DividendRecord,
} from '@/services/workerService';

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
// Progress ring (simplified bar)
// ---------------------------------------------------------------------------
function TermProgressBar({ investment }: { investment: InvestmentDetail }) {
  const start = new Date(investment.start_date).getTime();
  const end = new Date(investment.maturity_date).getTime();
  const now = Date.now();
  const total = Math.max(1, end - start);
  const elapsed = Math.min(total, now - start);
  const pct = Math.min(100, (elapsed / total) * 100);

  return (
    <View style={styles.termBar}>
      <View style={styles.termBarLabels}>
        <Text style={styles.termBarDate}>{fmtDate(investment.start_date)}</Text>
        <Text style={styles.termBarPct}>{pct.toFixed(0)}%</Text>
        <Text style={styles.termBarDate}>{fmtDate(investment.maturity_date)}</Text>
      </View>
      <View style={styles.termBarTrack}>
        <LinearGradient
          colors={investment.is_matured ? ['#059669', '#34D399'] : ['#064E3B', '#059669']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.termBarFill, { width: `${pct}%` }]}
        />
      </View>
      <View style={styles.termBarLabels}>
        <Text style={styles.termBarSub}>Start</Text>
        <Text style={[styles.termBarSub, { fontWeight: '700', color: investment.is_matured ? '#059669' : '#7C3AED' }]}>
          {investment.is_matured ? 'Matured!' : `${investment.days_remaining} days left`}
        </Text>
        <Text style={styles.termBarSub}>Maturity</Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Dividend row
// ---------------------------------------------------------------------------
const STATUS_CFG = {
  accrued:   { bg: '#EDE9FE', text: '#5B21B6', dot: '#7C3AED', label: 'Accrued' },
  available: { bg: '#FEF3C7', text: '#92400E', dot: '#FBBF24', label: 'Available' },
  collected: { bg: '#D1FAE5', text: '#065F46', dot: '#059669', label: 'Collected' },
};

const DividendRow = React.memo(({ item }: { item: DividendRecord }) => {
  const cfg = STATUS_CFG[item.status] || STATUS_CFG.accrued;
  return (
    <View style={styles.divRow}>
      <View style={[styles.divDot, { backgroundColor: cfg.dot }]} />
      <View style={{ flex: 1 }}>
        <Text style={styles.divPeriod}>{fmtDate(item.period_date)}</Text>
        {item.collected_at && (
          <Text style={styles.divCollected}>Collected {fmtDate(item.collected_at)}</Text>
        )}
      </View>
      <Text style={[styles.divAmount, { color: item.status === 'collected' ? '#059669' : '#111827' }]}>
        +{fmt(item.amount)}
      </Text>
      <View style={[styles.divBadge, { backgroundColor: cfg.bg }]}>
        <Text style={[styles.divBadgeText, { color: cfg.text }]}>{cfg.label}</Text>
      </View>
    </View>
  );
});

// ---------------------------------------------------------------------------
// Withdrawal confirmation modal
// ---------------------------------------------------------------------------
function WithdrawModal({
  visible,
  investment,
  onCancel,
  onConfirm,
  loading,
}: {
  visible: boolean;
  investment: InvestmentDetail;
  onCancel: () => void;
  onConfirm: () => void;
  loading: boolean;
}) {
  const principal = investment.principal_amount;
  const available = investment.available_dividends;
  const gross = principal + available;
  const isEarly = !investment.is_matured;
  const penaltyPct = isEarly ? investment.penalty_rate_pct : 0;
  const penalty = isEarly ? Math.round(gross * penaltyPct / 100 * 100) / 100 : 0;
  const net = gross - penalty;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {isEarly ? 'Early Withdrawal' : 'Withdraw Investment'}
            </Text>
            <TouchableOpacity onPress={onCancel} style={styles.modalClose}>
              <X size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {isEarly && (
            <View style={styles.penaltyWarn}>
              <AlertTriangle size={16} color="#DC2626" />
              <Text style={styles.penaltyWarnText}>
                Your investment hasn't matured yet. A{' '}
                <Text style={{ fontWeight: '800' }}>{penaltyPct}% penalty</Text>{' '}
                will be applied on the total amount.
              </Text>
            </View>
          )}

          <View style={styles.modalBreakdown}>
            <View style={styles.modalRow}>
              <Text style={styles.modalRowLabel}>Principal</Text>
              <Text style={styles.modalRowValue}>{fmt(principal)}</Text>
            </View>
            <View style={styles.modalRow}>
              <Text style={styles.modalRowLabel}>Uncollected Dividends</Text>
              <Text style={[styles.modalRowValue, { color: '#059669' }]}>{fmt(available)}</Text>
            </View>
            <View style={styles.modalRow}>
              <Text style={styles.modalRowLabel}>Gross Total</Text>
              <Text style={styles.modalRowValue}>{fmt(gross)}</Text>
            </View>
            {isEarly && (
              <View style={styles.modalRow}>
                <Text style={[styles.modalRowLabel, { color: '#DC2626' }]}>
                  Penalty ({penaltyPct}%)
                </Text>
                <Text style={[styles.modalRowValue, { color: '#DC2626' }]}>
                  -{fmt(penalty)}
                </Text>
              </View>
            )}
            <View style={styles.modalDivider} />
            <View style={styles.modalRow}>
              <Text style={[styles.modalRowLabel, { fontWeight: '800', fontSize: 15 }]}>
                You Receive
              </Text>
              <Text style={[styles.modalRowValue, { fontWeight: '900', fontSize: 18, color: '#064E3B' }]}>
                {fmt(net)}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.modalConfirmBtn, isEarly && { backgroundColor: '#DC2626' }]}
            onPress={onConfirm}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.modalConfirmText}>
                {isEarly ? 'Confirm Early Withdrawal' : 'Withdraw & Close Investment'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.modalCancelBtn} onPress={onCancel}>
            <Text style={styles.modalCancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------
export default function InvestmentDetailScreen({ navigation, route }: any) {
  const investmentId = route.params?.investmentId;
  const [detail, setDetail] = useState<InvestmentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [collecting, setCollecting] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);

  const load = useCallback(async () => {
    if (!investmentId) return;
    try {
      const data = await workerService.getInvestmentDetails(investmentId);
      setDetail(data);
    } catch (e) {
      // silent
    } finally {
      setLoading(false);
    }
  }, [investmentId]);

  useEffect(() => { load(); }, [load]);

  const handleCollect = useCallback(async () => {
    if (!detail) return;
    setCollecting(true);
    try {
      const res = await workerService.collectDividends(detail.id);
      Alert.alert('Dividends Collected', res.message);
      load();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to collect dividends');
    } finally {
      setCollecting(false);
    }
  }, [detail, load]);

  const handleWithdraw = useCallback(async () => {
    if (!detail) return;
    setWithdrawing(true);
    try {
      const res = await workerService.withdrawInvestment(detail.id);
      setShowWithdraw(false);
      Alert.alert(
        res.is_early ? 'Early Withdrawal Complete' : 'Withdrawal Complete',
        res.message,
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to withdraw');
    } finally {
      setWithdrawing(false);
    }
  }, [detail, navigation, load]);

  const monthlyDividend = detail ? detail.principal_amount * detail.monthly_rate_pct / 100 : 0;
  const totalProjected = detail ? detail.principal_amount * detail.monthly_rate_pct / 100 * detail.term_months : 0;

  if (loading) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#059669" />
        </View>
      </SafeAreaView>
    );
  }

  if (!detail) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.loadingWrap}>
          <Text style={{ color: '#EF4444' }}>Investment not found</Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={{ color: '#059669', marginTop: 8 }}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={22} color="#111827" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>{detail.business_name}</Text>
          <Text style={styles.headerSub}>
            {detail.term_months}-month · {detail.monthly_rate_pct}%/mo
          </Text>
        </View>
        <View style={[
          styles.headerStatus,
          { backgroundColor: detail.is_matured ? '#D1FAE5' : '#EDE9FE' },
        ]}>
          <Text style={[
            styles.headerStatusText,
            { color: detail.is_matured ? '#065F46' : '#5B21B6' },
          ]}>
            {detail.is_matured ? 'Matured' : 'Active'}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Term progress */}
        <View style={styles.section}>
          <TermProgressBar investment={detail} />
        </View>

        {/* Key metrics */}
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <CircleDollarSign size={18} color="#064E3B" />
            <Text style={styles.metricLabel}>Principal</Text>
            <Text style={styles.metricValue}>{fmt(detail.principal_amount)}</Text>
          </View>
          <View style={styles.metricCard}>
            <TrendingUp size={18} color="#059669" />
            <Text style={styles.metricLabel}>Monthly Dividend</Text>
            <Text style={[styles.metricValue, { color: '#059669' }]}>
              +{fmt(monthlyDividend)}
            </Text>
          </View>
          <View style={styles.metricCard}>
            <CheckCircle2 size={18} color="#059669" />
            <Text style={styles.metricLabel}>Total Earned</Text>
            <Text style={[styles.metricValue, { color: '#059669' }]}>
              {fmt(detail.dividends_earned)}
            </Text>
          </View>
          <View style={styles.metricCard}>
            <Wallet size={18} color="#7C3AED" />
            <Text style={styles.metricLabel}>Collected</Text>
            <Text style={styles.metricValue}>{fmt(detail.total_collected)}</Text>
          </View>
        </View>

        {/* Projection summary */}
        <LinearGradient colors={['#F0FDF4', '#DCFCE7']} style={styles.projCard}>
          <Text style={styles.projCardTitle}>Investment Summary</Text>
          <View style={styles.projRow}>
            <View style={styles.projItem}>
              <Text style={styles.projLabel}>Rate</Text>
              <Text style={styles.projValue}>{detail.monthly_rate_pct}%/mo</Text>
            </View>
            <View style={styles.projItem}>
              <Text style={styles.projLabel}>Term</Text>
              <Text style={styles.projValue}>{detail.term_months} months</Text>
            </View>
            <View style={styles.projItem}>
              <Text style={styles.projLabel}>Total Projected</Text>
              <Text style={[styles.projValue, { color: '#059669' }]}>
                +{fmt(totalProjected)}
              </Text>
            </View>
          </View>
          {!detail.is_matured && (
            <View style={styles.projPenaltyNote}>
              <Shield size={12} color="#92400E" />
              <Text style={styles.projPenaltyText}>
                Early withdrawal incurs a {detail.penalty_rate_pct}% penalty
              </Text>
            </View>
          )}
        </LinearGradient>

        {/* Collect dividends CTA */}
        {detail.available_dividends > 0 && (
          <TouchableOpacity
            style={styles.collectCard}
            onPress={handleCollect}
            disabled={collecting}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#064E3B', '#059669']}
              style={styles.collectCardInner}
            >
              {collecting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Wallet size={20} color="#FCD34D" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.collectCardTitle}>
                      Collect {fmt(detail.available_dividends)}
                    </Text>
                    <Text style={styles.collectCardSub}>
                      {detail.dividend_records.filter(d => d.status === 'available').length} month(s)
                      of dividends ready
                    </Text>
                  </View>
                  <ArrowDownToLine size={20} color="#fff" />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Dividend history */}
        <View style={styles.divSection}>
          <Text style={styles.divSectionTitle}>Dividend History</Text>
          {detail.dividend_records.length === 0 ? (
            <View style={styles.divEmpty}>
              <Calendar size={24} color="#D1D5DB" />
              <Text style={styles.divEmptyText}>
                Your first dividend will appear here after one month.
              </Text>
            </View>
          ) : (
            detail.dividend_records.map((d) => (
              <DividendRow key={d.id} item={d} />
            ))
          )}
        </View>

        {/* Withdraw button */}
        {detail.status === 'active' && (
          <TouchableOpacity
            style={styles.withdrawBtn}
            onPress={() => setShowWithdraw(true)}
          >
            <Text style={styles.withdrawBtnText}>
              {detail.is_matured ? 'Withdraw Investment' : 'Early Withdrawal'}
            </Text>
            {!detail.is_matured && (
              <Text style={styles.withdrawBtnSub}>
                {detail.penalty_rate_pct}% penalty applies
              </Text>
            )}
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {detail && (
        <WithdrawModal
          visible={showWithdraw}
          investment={detail}
          onCancel={() => setShowWithdraw(false)}
          onConfirm={handleWithdraw}
          loading={withdrawing}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F9FAFB' },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingBottom: 20 },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  headerSub: { fontSize: 12, color: '#9CA3AF', marginTop: 1 },
  headerStatus: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  headerStatusText: { fontSize: 11, fontWeight: '700' },

  section: { paddingHorizontal: 16, paddingTop: 20 },

  // Term bar
  termBar: { marginBottom: 8 },
  termBarLabels: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 6,
  },
  termBarDate: { fontSize: 11, color: '#9CA3AF' },
  termBarPct: { fontSize: 13, fontWeight: '800', color: '#064E3B' },
  termBarTrack: { height: 8, backgroundColor: '#E5E7EB', borderRadius: 4, overflow: 'hidden' },
  termBarFill: { height: 8, borderRadius: 4 },
  termBarSub: { fontSize: 10, color: '#9CA3AF', marginTop: 4 },

  // Metrics grid
  metricsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10,
    paddingHorizontal: 16, paddingTop: 16,
  },
  metricCard: {
    width: (SW - 42) / 2,
    backgroundColor: '#fff', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#E5E7EB', gap: 6,
  },
  metricLabel: { fontSize: 11, color: '#9CA3AF' },
  metricValue: { fontSize: 16, fontWeight: '800', color: '#111827' },

  // Projection card
  projCard: {
    marginHorizontal: 16, marginTop: 16, borderRadius: 16, padding: 18,
  },
  projCardTitle: { fontSize: 14, fontWeight: '700', color: '#064E3B', marginBottom: 14 },
  projRow: { flexDirection: 'row', gap: 8 },
  projItem: { flex: 1, alignItems: 'center' },
  projLabel: { fontSize: 10, color: '#6B7280', marginBottom: 4 },
  projValue: { fontSize: 14, fontWeight: '700', color: '#111827', textAlign: 'center' },
  projPenaltyNote: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 14, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: '#BBF7D0',
  },
  projPenaltyText: { fontSize: 12, color: '#92400E' },

  // Collect card
  collectCard: { marginHorizontal: 16, marginTop: 16, borderRadius: 16, overflow: 'hidden' },
  collectCardInner: {
    flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18,
  },
  collectCardTitle: { fontSize: 16, fontWeight: '800', color: '#fff' },
  collectCardSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },

  // Dividend section
  divSection: { paddingHorizontal: 16, paddingTop: 20 },
  divSectionTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 12 },
  divEmpty: {
    alignItems: 'center', paddingVertical: 32, gap: 8,
    backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#E5E7EB',
  },
  divEmptyText: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', maxWidth: 220 },

  divRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 12, paddingHorizontal: 14,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  divDot: { width: 8, height: 8, borderRadius: 4 },
  divPeriod: { fontSize: 13, fontWeight: '600', color: '#111827' },
  divCollected: { fontSize: 11, color: '#9CA3AF', marginTop: 1 },
  divAmount: { fontSize: 14, fontWeight: '800' },
  divBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  divBadgeText: { fontSize: 10, fontWeight: '700' },

  // Withdraw
  withdrawBtn: {
    marginHorizontal: 16, marginTop: 20,
    backgroundColor: '#FEF2F2', borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: '#FECACA', alignItems: 'center',
  },
  withdrawBtnText: { fontSize: 15, fontWeight: '700', color: '#DC2626' },
  withdrawBtnSub: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },
  modalClose: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center',
  },
  penaltyWarn: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: '#FEF2F2', borderRadius: 12, padding: 14, marginBottom: 16,
    borderWidth: 1, borderColor: '#FECACA',
  },
  penaltyWarnText: { flex: 1, fontSize: 13, color: '#DC2626', lineHeight: 19 },
  modalBreakdown: { marginBottom: 20 },
  modalRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10,
  },
  modalRowLabel: { fontSize: 14, color: '#6B7280' },
  modalRowValue: { fontSize: 14, fontWeight: '700', color: '#111827' },
  modalDivider: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 4 },
  modalConfirmBtn: {
    backgroundColor: '#059669', borderRadius: 16, paddingVertical: 16,
    alignItems: 'center', marginBottom: 10,
  },
  modalConfirmText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  modalCancelBtn: {
    backgroundColor: '#F3F4F6', borderRadius: 16, paddingVertical: 14,
    alignItems: 'center',
  },
  modalCancelText: { color: '#374151', fontSize: 14, fontWeight: '600' },
});
