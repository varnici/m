/**
 * Platform Financial Health Dashboard — Admin only.
 *
 * Displays all seven survival metrics with traffic-light status:
 *   NPL %  |  DRP Coverage  |  STV (days)
 *   ELR %  |  WAM match     |  OFCT (hours)  |  HPFR %
 *
 * Plus: breakeven volume, platform margin, active portfolio.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AlertTriangle, CheckCircle, RefreshCw, TrendingUp, XCircle } from 'lucide-react-native';
import { BaseService } from '@/services/baseService';

// ── Data types ────────────────────────────────────────────────────────────────

interface MetricStatus {
  value: number;
  status: 'green' | 'amber' | 'red';
  threshold_green: string;
  threshold_amber: string;
  unit: string;
}

interface PlatformSnapshot {
  snapshot_date: string;
  npl: MetricStatus;
  drp: MetricStatus;
  stv: MetricStatus;
  elr: MetricStatus;
  ofct: MetricStatus;
  hpfr: MetricStatus;
  wam_investor_months: number;
  wam_merchant_months: number;
  wam_safe: boolean;
  system_liquidity_reserve: number;
  total_active_portfolio: number;
  total_merchant_interest_collected: number;
  platform_net_margin: number;
  breakeven_volume_ngn: number;
  monthly_operating_cost: number;
  total_unclaimed_dividends: number;
  alerts: string[];
}

// ── API service ───────────────────────────────────────────────────────────────

class AdminMetricsService extends BaseService {
  async getToday(): Promise<PlatformSnapshot> {
    const res = await this.fetchWithAuth('/v1/admin/metrics/today');
    return res.json();
  }
  async triggerRollup(): Promise<void> {
    await this.fetchWithAuth('/v1/admin/metrics/trigger-rollup', { method: 'POST' });
  }
}
const metricsApi = new AdminMetricsService();

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_COLORS = {
  green: { bg: '#F0FDF4', border: '#86EFAC', text: '#166534', dot: '#22C55E' },
  amber: { bg: '#FFFBEB', border: '#FCD34D', text: '#92400E', dot: '#F59E0B' },
  red:   { bg: '#FEF2F2', border: '#FCA5A5', text: '#991B1B', dot: '#EF4444' },
};

const fmt = (n: number | undefined | null, decimals = 2): string => {
  if (n == null) return '—';
  return n.toFixed(decimals);
};

const fmtNgn = (n: number): string => {
  if (n >= 1_000_000) return `₦${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `₦${(n / 1_000).toFixed(0)}K`;
  return `₦${n.toFixed(0)}`;
};

// ── Sub-components ────────────────────────────────────────────────────────────

const StatusDot = ({ status }: { status: 'green' | 'amber' | 'red' }) => (
  <View style={[styles.dot, { backgroundColor: STATUS_COLORS[status].dot }]} />
);

const MetricCard = ({
  label,
  metric,
  description,
}: {
  label: string;
  metric: MetricStatus;
  description?: string;
}) => {
  const c = STATUS_COLORS[metric.status];
  return (
    <View style={[styles.metricCard, { backgroundColor: c.bg, borderColor: c.border }]}>
      <View style={styles.metricHeader}>
        <StatusDot status={metric.status} />
        <Text style={[styles.metricLabel, { color: c.text }]}>{label}</Text>
      </View>
      <Text style={[styles.metricValue, { color: c.text }]}>
        {fmt(metric.value)}{metric.unit}
      </Text>
      <View style={styles.thresholdRow}>
        <Text style={styles.thresholdText}>✓ {metric.threshold_green}</Text>
        <Text style={styles.thresholdText}>⚠ {metric.threshold_amber}</Text>
      </View>
      {description && (
        <Text style={styles.metricDesc}>{description}</Text>
      )}
    </View>
  );
};

const KpiTile = ({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) => (
  <View style={styles.kpiTile}>
    <Text style={styles.kpiValue}>{value}</Text>
    <Text style={styles.kpiLabel}>{label}</Text>
    {sub && <Text style={styles.kpiSub}>{sub}</Text>}
  </View>
);

const AlertBanner = ({ alerts }: { alerts: string[] }) => {
  if (!alerts.length) return null;
  return (
    <View style={styles.alertBox}>
      <View style={styles.alertTitle}>
        <AlertTriangle size={16} color="#991B1B" />
        <Text style={styles.alertTitleText}>
          {alerts.length} Active Alert{alerts.length > 1 ? 's' : ''}
        </Text>
      </View>
      {alerts.map((a, i) => (
        <Text key={i} style={styles.alertItem}>• {a}</Text>
      ))}
    </View>
  );
};

// ── Main screen ───────────────────────────────────────────────────────────────

const AdminMetricsDashboard = () => {
  const [data, setData] = useState<PlatformSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rolling, setRolling] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const snap = await metricsApi.getToday();
      setData(snap);
    } catch (err: any) {
      if (!silent) {
        Alert.alert('Could not load metrics', err.message || 'Backend unreachable.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRollup = async () => {
    setRolling(true);
    try {
      await metricsApi.triggerRollup();
      await load(true);
      Alert.alert('Done', 'Metrics snapshot recalculated.');
    } catch (err: any) {
      Alert.alert('Rollup failed', err.message);
    } finally {
      setRolling(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#004D2C" />
        <Text style={styles.loadingText}>Loading platform metrics…</Text>
      </SafeAreaView>
    );
  }

  if (!data) {
    return (
      <SafeAreaView style={styles.center}>
        <XCircle size={48} color="#EF4444" />
        <Text style={styles.emptyText}>No snapshot available yet.</Text>
        <Text style={styles.emptySubtext}>Run the rollup manually or wait for the 00:15 UTC cron job.</Text>
        <TouchableOpacity style={styles.rollupBtn} onPress={handleRollup} disabled={rolling}>
          <Text style={styles.rollupBtnText}>{rolling ? 'Computing…' : 'Compute Now'}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const healthyCount = [data.npl, data.drp, data.stv, data.elr, data.ofct, data.hpfr]
    .filter(m => m.status === 'green').length;
  const overallStatus = data.alerts.length === 0 ? 'green'
    : data.alerts.some(a => a.startsWith('CRITICAL')) ? 'red'
    : 'amber';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(true); }}
            tintColor="#004D2C"
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Platform Health</Text>
            <Text style={styles.headerDate}>Snapshot: {data.snapshot_date}</Text>
          </View>
          <TouchableOpacity
            style={styles.refreshBtn}
            onPress={handleRollup}
            disabled={rolling}
          >
            <RefreshCw size={16} color="#004D2C" />
            <Text style={styles.refreshBtnText}>{rolling ? 'Computing…' : 'Recalculate'}</Text>
          </TouchableOpacity>
        </View>

        {/* Overall health bar */}
        <View style={[styles.overallBadge, { backgroundColor: STATUS_COLORS[overallStatus].bg, borderColor: STATUS_COLORS[overallStatus].border }]}>
          <StatusDot status={overallStatus} />
          <Text style={[styles.overallText, { color: STATUS_COLORS[overallStatus].text }]}>
            {healthyCount}/6 metrics in healthy range
          </Text>
          {overallStatus === 'green' && <CheckCircle size={16} color="#22C55E" style={{ marginLeft: 'auto' }} />}
        </View>

        {/* Active alerts */}
        <AlertBanner alerts={data.alerts} />

        {/* Section: Portfolio KPIs */}
        <Text style={styles.sectionTitle}>PORTFOLIO</Text>
        <View style={styles.kpiRow}>
          <KpiTile
            label="Active Portfolio"
            value={fmtNgn(data.total_active_portfolio)}
            sub="Total funded inventory"
          />
          <KpiTile
            label="Monthly Interest"
            value={fmtNgn(data.total_merchant_interest_collected)}
            sub="Merchant receipts"
          />
          <KpiTile
            label="Unclaimed Dividends"
            value={fmtNgn(data.total_unclaimed_dividends)}
            sub="9-5 pending payouts"
          />
        </View>

        {/* Section: Risk & Credit */}
        <Text style={styles.sectionTitle}>RISK & CREDIT QUALITY</Text>
        <View style={styles.metricGrid}>
          <MetricCard
            label="NPL Rate"
            metric={data.npl}
            description="Non-performing principal as % of active portfolio. Target < 2%."
          />
          <MetricCard
            label="DRP Coverage"
            metric={data.drp}
            description="Reserve cash vs. projected defaults. Must stay > 1.5×."
          />
          <MetricCard
            label="Stock Turnover"
            metric={data.stv}
            description="Days to sell financed inventory. > 18 days triggers demotion."
          />
        </View>

        {/* Section: Liquidity & ALM */}
        <Text style={styles.sectionTitle}>LIQUIDITY & ALM</Text>
        <MetricCard
          label="Early Liquidation Rate"
          metric={data.elr}
          description="Capital pulled before maturity. > 5% triggers penalty escalation."
        />
        <View style={[styles.wamCard, { borderColor: data.wam_safe ? '#86EFAC' : '#FCA5A5' }]}>
          <View style={styles.wamHeader}>
            <StatusDot status={data.wam_safe ? 'green' : 'red'} />
            <Text style={styles.wamTitle}>Weighted Average Maturity (WAM)</Text>
          </View>
          <View style={styles.wamRow}>
            <View style={styles.wamCol}>
              <Text style={styles.wamColLabel}>INVESTOR WAM</Text>
              <Text style={styles.wamColValue}>{fmt(data.wam_investor_months, 1)} months</Text>
            </View>
            <View style={styles.wamDivider} />
            <View style={styles.wamCol}>
              <Text style={styles.wamColLabel}>MERCHANT CYCLE</Text>
              <Text style={styles.wamColValue}>{fmt(data.wam_merchant_months, 1)} months</Text>
            </View>
          </View>
          <Text style={[styles.wamRule, { color: data.wam_safe ? '#166534' : '#991B1B' }]}>
            {data.wam_safe
              ? `✓ Safe — investor capital rotates ${(data.wam_investor_months / data.wam_merchant_months).toFixed(0)}× before lockup ends`
              : '✗ CRITICAL — investor WAM shorter than merchant cycle. Liquidity mismatch.'}
          </Text>
        </View>
        <View style={styles.kpiRow}>
          <KpiTile label="Liquidity Reserve" value={fmtNgn(data.system_liquidity_reserve)} sub="DRP cash on hand" />
        </View>

        {/* Section: Operational */}
        <Text style={styles.sectionTitle}>MARKETPLACE OPERATIONS</Text>
        <View style={styles.metricGrid}>
          <MetricCard
            label="Order Fulfilment"
            metric={data.ofct}
            description="Avg hours: investor match → merchant delivery confirmed."
          />
          <MetricCard
            label="PIN Failure Rate"
            metric={data.hpfr}
            description="Failed handoff PINs. > 1.5% flags delivery fraud or bugs."
          />
        </View>

        {/* Section: Platform Economics */}
        <Text style={styles.sectionTitle}>PLATFORM ECONOMICS</Text>
        <View style={styles.economicsCard}>
          <View style={styles.econRow}>
            <Text style={styles.econLabel}>Net Spread (Margin)</Text>
            <Text style={styles.econValue}>{fmt(data.platform_net_margin, 1)}%</Text>
          </View>
          <View style={styles.econDivider} />
          <View style={styles.econRow}>
            <Text style={styles.econLabel}>Monthly OpEx</Text>
            <Text style={styles.econValue}>{fmtNgn(data.monthly_operating_cost)}</Text>
          </View>
          <View style={styles.econDivider} />
          <View style={styles.econRow}>
            <Text style={styles.econLabel}>Breakeven Volume</Text>
            <Text style={[styles.econValue, { color: '#004D2C' }]}>{fmtNgn(data.breakeven_volume_ngn)}</Text>
          </View>
          <View style={styles.breakevenBar}>
            <View style={[
              styles.breakevenFill,
              {
                width: `${Math.min(100, (data.total_active_portfolio / data.breakeven_volume_ngn) * 100)}%`,
                backgroundColor: data.total_active_portfolio >= data.breakeven_volume_ngn ? '#22C55E' : '#F59E0B',
              },
            ]} />
          </View>
          <Text style={styles.breakevenHint}>
            {data.total_active_portfolio >= data.breakeven_volume_ngn
              ? `✓ Above breakeven — platform is self-funding`
              : `Need ${fmtNgn(data.breakeven_volume_ngn - data.total_active_portfolio)} more active capital to break even`}
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: '#F8FAFC' },
  loadingText:  { marginTop: 16, fontSize: 14, color: '#64748B' },
  emptyText:    { fontSize: 18, fontWeight: '700', color: '#0F172A', marginTop: 16 },
  emptySubtext: { fontSize: 13, color: '#64748B', textAlign: 'center', marginTop: 8 },
  rollupBtn:  { marginTop: 24, backgroundColor: '#004D2C', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 14 },
  rollupBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 20, paddingBottom: 8,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#0F172A' },
  headerDate:  { fontSize: 12, color: '#64748B', marginTop: 2 },
  refreshBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#F0FDF4', paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1, borderColor: '#BBF7D0',
  },
  refreshBtnText: { fontSize: 12, fontWeight: '700', color: '#004D2C' },

  overallBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 20, marginVertical: 8, paddingHorizontal: 16,
    paddingVertical: 12, borderRadius: 12, borderWidth: 1,
  },
  overallText: { fontSize: 14, fontWeight: '600' },

  alertBox: {
    margin: 20, marginTop: 4, backgroundColor: '#FEF2F2',
    borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#FCA5A5',
  },
  alertTitle: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  alertTitleText: { fontWeight: '700', fontSize: 14, color: '#991B1B' },
  alertItem: { fontSize: 13, color: '#7F1D1D', lineHeight: 20, marginBottom: 4 },

  sectionTitle: {
    fontSize: 11, fontWeight: '800', color: '#94A3B8', letterSpacing: 1.5,
    marginHorizontal: 20, marginTop: 24, marginBottom: 10,
  },

  kpiRow: { flexDirection: 'row', marginHorizontal: 16, gap: 10, marginBottom: 4 },
  kpiTile: {
    flex: 1, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  kpiValue: { fontSize: 20, fontWeight: '800', color: '#0F172A' },
  kpiLabel: { fontSize: 11, color: '#64748B', marginTop: 4, fontWeight: '600' },
  kpiSub:   { fontSize: 10, color: '#94A3B8', marginTop: 2 },

  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: 16, gap: 10 },
  metricCard: {
    flex: 1, minWidth: '45%', borderRadius: 14, padding: 16, borderWidth: 1, marginBottom: 4,
  },
  metricHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  metricLabel:  { fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },
  metricValue:  { fontSize: 28, fontWeight: '800', marginBottom: 4 },
  thresholdRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  thresholdText: { fontSize: 10, color: '#64748B' },
  metricDesc:   { fontSize: 11, color: '#64748B', marginTop: 8, lineHeight: 16 },

  dot: { width: 8, height: 8, borderRadius: 4 },

  wamCard: {
    marginHorizontal: 20, marginBottom: 10, backgroundColor: '#FFFFFF',
    borderRadius: 14, padding: 16, borderWidth: 1,
  },
  wamHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  wamTitle: { fontSize: 13, fontWeight: '700', color: '#0F172A' },
  wamRow: { flexDirection: 'row', alignItems: 'center' },
  wamCol: { flex: 1, alignItems: 'center' },
  wamColLabel: { fontSize: 10, color: '#94A3B8', fontWeight: '700', letterSpacing: 1 },
  wamColValue: { fontSize: 24, fontWeight: '800', color: '#0F172A', marginTop: 4 },
  wamDivider: { width: 1, height: 40, backgroundColor: '#E2E8F0' },
  wamRule: { fontSize: 12, fontWeight: '600', marginTop: 12, lineHeight: 18 },

  economicsCard: {
    marginHorizontal: 20, backgroundColor: '#FFFFFF',
    borderRadius: 14, padding: 20, borderWidth: 1, borderColor: '#E2E8F0',
  },
  econRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  econLabel:   { fontSize: 14, color: '#475569', fontWeight: '500' },
  econValue:   { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  econDivider: { height: 1, backgroundColor: '#F1F5F9' },
  breakevenBar: {
    height: 8, backgroundColor: '#F1F5F9', borderRadius: 4, marginTop: 16, overflow: 'hidden',
  },
  breakevenFill: { height: '100%', borderRadius: 4 },
  breakevenHint: { fontSize: 12, color: '#64748B', marginTop: 8, fontWeight: '500' },
});

export default AdminMetricsDashboard;
