// @ts-nocheck
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ChevronLeft,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  BarChart3,
  Calendar,
  Package,
  Users,
  Zap,
  ArrowRight,
  Info,
} from 'lucide-react-native';
import type { RootStackScreenProps } from '@/navigation/types';

const { width: SW } = Dimensions.get('window');

const fmt = (n: number) =>
  `₦${n.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ---------------------------------------------------------------------------
// Mock monthly turnover bars (last 6 months)
// ---------------------------------------------------------------------------
const MOCK_TURNOVER_MONTHS = [
  { month: 'Jan', value: 8200000 },
  { month: 'Feb', value: 9100000 },
  { month: 'Mar', value: 10500000 },
  { month: 'Apr', value: 9800000 },
  { month: 'May', value: 11200000 },
  { month: 'Jun', value: 12500000 },
];

const RISK_META = {
  Low:    { color: '#059669', bg: '#D1FAE5', label: 'Low Risk', desc: 'Stable turnover with consistent demand. Suitable for conservative investors.' },
  Medium: { color: '#D97706', bg: '#FEF3C7', label: 'Medium Risk', desc: 'Moderate volatility. Good for investors seeking balanced returns.' },
  High:   { color: '#EF4444', bg: '#FEE2E2', label: 'High Risk', desc: 'Higher volatility. Suitable for experienced investors only.' },
};

// ---------------------------------------------------------------------------
// Bar chart component — no external library
// ---------------------------------------------------------------------------
function TurnoverChart({ data }: { data: typeof MOCK_TURNOVER_MONTHS }) {
  const max = Math.max(...data.map((d) => d.value));
  const barWidth = (SW - 80) / data.length - 8;

  return (
    <View style={chartStyles.container}>
      <Text style={chartStyles.title}>6-Month Turnover Trend</Text>
      <View style={chartStyles.chart}>
        {data.map((item, idx) => {
          const h = Math.max(8, (item.value / max) * 100);
          const isLatest = idx === data.length - 1;
          return (
            <View key={item.month} style={[chartStyles.barWrap, { width: barWidth }]}>
              <Text style={chartStyles.barValue}>
                ₦{(item.value / 1000000).toFixed(1)}M
              </Text>
              <View
                style={[
                  chartStyles.bar,
                  { height: h, backgroundColor: isLatest ? '#059669' : '#A7F3D0' },
                ]}
              />
              <Text style={chartStyles.barLabel}>{item.month}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const chartStyles = StyleSheet.create({
  container: { marginBottom: 4 },
  title: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 14 },
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 130 },
  barWrap: { alignItems: 'center', gap: 4 },
  barValue: { fontSize: 9, color: '#9CA3AF', textAlign: 'center' },
  bar: { width: '100%', borderRadius: 4 },
  barLabel: { fontSize: 11, color: '#6B7280', fontWeight: '500' },
});

// ---------------------------------------------------------------------------
// Main screen — receives MarketplaceItem via route params
// ---------------------------------------------------------------------------
export default function Worker95BusinessDetailScreen({
  navigation,
  route,
}: RootStackScreenProps<'Worker95BusinessDetail'>) {
  const item = route.params?.item;
  const [activeTab, setActiveTab] = useState<'overview' | 'ledger' | 'investors'>('overview');

  if (!item) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.centered}>
          <Text style={styles.errorText}>Business data not found.</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={{ color: '#059669', fontWeight: '600' }}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const risk = RISK_META[item.risk_rating as keyof typeof RISK_META] ?? RISK_META.Medium;

  // Computed from seed data
  const totalInvestors = Math.floor(12 + Math.random() * 88);
  const totalPooled = item.rolling_30_day_turnover * 0.15;
  const avgReturnAllTime = (item.projected_monthly_roi * 12).toFixed(1);

  const MOCK_LEDGER = [
    { date: 'Jun 01', event: 'Monthly inventory restocking', amount: item.rolling_30_day_turnover * 0.28, type: 'Inflow' },
    { date: 'Jun 08', event: 'Bulk distribution payout', amount: item.rolling_30_day_turnover * 0.19, type: 'Outflow' },
    { date: 'Jun 15', event: 'Retail sales deposit', amount: item.rolling_30_day_turnover * 0.31, type: 'Inflow' },
    { date: 'Jun 22', event: 'Supplier payment', amount: item.rolling_30_day_turnover * 0.14, type: 'Outflow' },
    { date: 'Jun 30', event: 'Monthly profit distribution', amount: item.rolling_30_day_turnover * item.projected_monthly_roi / 100, type: 'Dividend' },
  ];

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* ── Hero ── */}
        <LinearGradient colors={['#064E3B', '#059669']} style={styles.hero}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.heroBack}>
            <ChevronLeft size={20} color="#fff" />
          </TouchableOpacity>

          <View style={styles.heroRank}>
            <Text style={styles.heroRankText}>#{item.rank}</Text>
          </View>
          <Text style={styles.heroName}>{item.business_name}</Text>
          <Text style={styles.heroCategory}>{item.category}</Text>

          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatVal}>{fmt(item.rolling_30_day_turnover)}</Text>
              <Text style={styles.heroStatLabel}>30-Day Turnover</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatVal}>{item.projected_monthly_roi.toFixed(2)}%</Text>
              <Text style={styles.heroStatLabel}>Monthly ROI</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatVal}>{avgReturnAllTime}%</Text>
              <Text style={styles.heroStatLabel}>Annual Return</Text>
            </View>
          </View>
        </LinearGradient>

        {/* ── Risk banner ── */}
        <View style={[styles.riskBanner, { backgroundColor: risk.bg }]}>
          {item.risk_rating === 'High' ? (
            <AlertTriangle size={16} color={risk.color} />
          ) : (
            <CheckCircle2 size={16} color={risk.color} />
          )}
          <View style={{ flex: 1 }}>
            <Text style={[styles.riskLabel, { color: risk.color }]}>{risk.label}</Text>
            <Text style={[styles.riskDesc, { color: risk.color }]}>{risk.desc}</Text>
          </View>
        </View>

        {/* ── Tab bar ── */}
        <View style={styles.tabBar}>
          {(['overview', 'ledger', 'investors'] as const).map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.tab, activeTab === t && styles.tabActive]}
              onPress={() => setActiveTab(t)}
            >
              <Text style={[styles.tabText, activeTab === t && styles.tabTextActive]}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Overview Tab ── */}
        {activeTab === 'overview' && (
          <View style={styles.tabContent}>
            <TurnoverChart data={MOCK_TURNOVER_MONTHS} />

            <View style={styles.metricsGrid}>
              {[
                { icon: Package, label: 'SKUs Tracked', value: `${Math.floor(40 + Math.random() * 160)}` },
                { icon: Users, label: 'Active Investors', value: `${totalInvestors}` },
                { icon: BarChart3, label: 'Capital Pooled', value: `₦${(totalPooled / 1000000).toFixed(1)}M` },
                { icon: Calendar, label: 'Operating Since', value: '2021' },
              ].map((m) => (
                <View key={m.label} style={styles.metricCard}>
                  <m.icon size={18} color="#059669" />
                  <Text style={styles.metricValue}>{m.value}</Text>
                  <Text style={styles.metricLabel}>{m.label}</Text>
                </View>
              ))}
            </View>

            <View style={styles.infoCard}>
              <Info size={16} color="#3B82F6" />
              <Text style={styles.infoText}>
                Inventory performance data is pulled live from the VentureRoot Layer 2 merchant integration.
                Data is refreshed every 24 hours.
              </Text>
            </View>
          </View>
        )}

        {/* ── Ledger Tab ── */}
        {activeTab === 'ledger' && (
          <View style={styles.tabContent}>
            <Text style={styles.ledgerNote}>
              Showing aggregated business cash flow for the current month. Individual transaction details are
              anonymised per merchant privacy policy.
            </Text>
            {MOCK_LEDGER.map((entry, idx) => (
              <View key={idx} style={styles.ledgerRow}>
                <View style={styles.ledgerLeft}>
                  <Text style={styles.ledgerDate}>{entry.date}</Text>
                  <View
                    style={[
                      styles.ledgerTypeBadge,
                      {
                        backgroundColor:
                          entry.type === 'Inflow' ? '#D1FAE5' :
                          entry.type === 'Dividend' ? '#FEF3C7' : '#FEE2E2',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.ledgerTypeText,
                        {
                          color:
                            entry.type === 'Inflow' ? '#065F46' :
                            entry.type === 'Dividend' ? '#92400E' : '#991B1B',
                        },
                      ]}
                    >
                      {entry.type}
                    </Text>
                  </View>
                </View>
                <View style={styles.ledgerMid}>
                  <Text style={styles.ledgerEvent}>{entry.event}</Text>
                </View>
                <Text
                  style={[
                    styles.ledgerAmount,
                    { color: entry.type === 'Outflow' ? '#EF4444' : '#059669' },
                  ]}
                >
                  {entry.type === 'Outflow' ? '-' : '+'}{fmt(entry.amount)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Investors Tab ── */}
        {activeTab === 'investors' && (
          <View style={styles.tabContent}>
            <View style={styles.investorStatRow}>
              <View style={styles.investorStat}>
                <Text style={styles.investorStatVal}>{totalInvestors}</Text>
                <Text style={styles.investorStatLabel}>Active Investors</Text>
              </View>
              <View style={styles.investorStat}>
                <Text style={styles.investorStatVal}>{fmt(totalPooled)}</Text>
                <Text style={styles.investorStatLabel}>Total Capital Pooled</Text>
              </View>
              <View style={styles.investorStat}>
                <Text style={styles.investorStatVal}>₦10k</Text>
                <Text style={styles.investorStatLabel}>Min. Entry</Text>
              </View>
            </View>

            <View style={styles.poolBar}>
              <Text style={styles.poolBarLabel}>Pool utilisation</Text>
              <View style={styles.poolTrack}>
                <View style={[styles.poolFill, { width: '68%' }]} />
              </View>
              <Text style={styles.poolPct}>68% filled</Text>
            </View>

            <View style={styles.infoCard}>
              <Zap size={16} color="#FBBF24" />
              <Text style={styles.infoText}>
                Investors receive monthly dividends on the 1st of each month, automatically credited to their VentureRoot portfolio.
              </Text>
            </View>
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* ── Invest CTA ── */}
      <View style={styles.investBar}>
        <View>
          <Text style={styles.investBarLabel}>Expected return</Text>
          <Text style={styles.investBarValue}>{item.projected_monthly_roi.toFixed(2)}% / month</Text>
        </View>
        <TouchableOpacity
          style={styles.investBtn}
          onPress={() =>
            navigation.navigate('Worker95InvestConfirm', { item })
          }
        >
          <Text style={styles.investBtnText}>Invest Now</Text>
          <ArrowRight size={16} color="#fff" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F9FAFB' },
  scroll: { paddingBottom: 120 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  errorText: { fontSize: 15, color: '#EF4444' },
  backBtn: { paddingHorizontal: 20, paddingVertical: 10 },

  hero: { padding: 22, paddingTop: 16 },
  heroBack: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  heroRank: { backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginBottom: 8 },
  heroRankText: { fontSize: 12, color: '#fff', fontWeight: '700' },
  heroName: { fontSize: 24, fontWeight: '800', color: '#fff', marginBottom: 4 },
  heroCategory: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 22 },
  heroStats: { flexDirection: 'row', alignItems: 'center' },
  heroStat: { flex: 1, alignItems: 'center' },
  heroStatVal: { fontSize: 16, fontWeight: '800', color: '#fff', marginBottom: 2 },
  heroStatLabel: { fontSize: 10, color: 'rgba(255,255,255,0.65)', textAlign: 'center' },
  heroStatDivider: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.25)' },

  riskBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 14, margin: 16, borderRadius: 12 },
  riskLabel: { fontSize: 13, fontWeight: '700', marginBottom: 2 },
  riskDesc: { fontSize: 12, lineHeight: 17, opacity: 0.85 },

  tabBar: { flexDirection: 'row', marginHorizontal: 16, backgroundColor: '#F3F4F6', borderRadius: 12, padding: 4, marginBottom: 4 },
  tab: { flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: 'center' },
  tabActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  tabText: { fontSize: 13, fontWeight: '500', color: '#9CA3AF' },
  tabTextActive: { color: '#111827', fontWeight: '700' },

  tabContent: { paddingHorizontal: 16, paddingTop: 16 },

  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16 },
  metricCard: { width: (SW - 52) / 2, backgroundColor: '#fff', borderRadius: 14, padding: 14, alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#E5E7EB' },
  metricValue: { fontSize: 18, fontWeight: '800', color: '#111827' },
  metricLabel: { fontSize: 11, color: '#9CA3AF', textAlign: 'center' },

  infoCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: '#EFF6FF', borderRadius: 12, padding: 14, marginTop: 16, borderWidth: 1, borderColor: '#BFDBFE' },
  infoText: { flex: 1, fontSize: 12, color: '#1D4ED8', lineHeight: 18 },

  ledgerNote: { fontSize: 12, color: '#9CA3AF', marginBottom: 14, fontStyle: 'italic' },
  ledgerRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8, gap: 10, borderWidth: 1, borderColor: '#F3F4F6' },
  ledgerLeft: { gap: 4, alignItems: 'flex-start', width: 56 },
  ledgerDate: { fontSize: 11, color: '#9CA3AF', fontWeight: '600' },
  ledgerTypeBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  ledgerTypeText: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase' },
  ledgerMid: { flex: 1 },
  ledgerEvent: { fontSize: 12, color: '#374151', lineHeight: 17 },
  ledgerAmount: { fontSize: 13, fontWeight: '700' },

  investorStatRow: { flexDirection: 'row', gap: 10 },
  investorStat: { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 14, alignItems: 'center', gap: 4, borderWidth: 1, borderColor: '#E5E7EB' },
  investorStatVal: { fontSize: 16, fontWeight: '800', color: '#111827' },
  investorStatLabel: { fontSize: 10, color: '#9CA3AF', textAlign: 'center' },

  poolBar: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginTop: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  poolBarLabel: { fontSize: 13, color: '#374151', fontWeight: '600', marginBottom: 10 },
  poolTrack: { height: 8, backgroundColor: '#E5E7EB', borderRadius: 4, overflow: 'hidden', marginBottom: 6 },
  poolFill: { height: 8, backgroundColor: '#059669', borderRadius: 4 },
  poolPct: { fontSize: 12, color: '#059669', fontWeight: '600' },

  investBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32,
    borderTopWidth: 1, borderTopColor: '#E5E7EB',
  },
  investBarLabel: { fontSize: 12, color: '#9CA3AF' },
  investBarValue: { fontSize: 18, fontWeight: '800', color: '#059669' },
  investBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#059669', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14,
  },
  investBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
