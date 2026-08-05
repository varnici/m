// @ts-nocheck
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Alert,
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
  Zap,
  ArrowRight,
  Info,
  Users,
} from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import type { RootStackScreenProps } from '@/navigation/types';
import { useFundingRoundsForCluster, useContributeToFundingRound } from '@/hooks/useFundingRounds';

const { width: SW } = Dimensions.get('window');

const fmt = (n: number) =>
  `₦${n.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const RISK_META = {
  Low:    { color: '#059669', bg: '#D1FAE5', label: 'Low Risk', desc: 'Stable turnover with consistent demand. Suitable for conservative investors.' },
  Medium: { color: '#D97706', bg: '#FEF3C7', label: 'Medium Risk', desc: 'Moderate volatility. Good for investors seeking balanced returns.' },
  High:   { color: '#EF4444', bg: '#FEE2E2', label: 'High Risk', desc: 'Higher volatility. Suitable for experienced investors only.' },
};

// ---------------------------------------------------------------------------
// Main screen — receives MarketplaceItem via route params
// ---------------------------------------------------------------------------
export default function Worker95BusinessDetailScreen({
  navigation,
  route,
}: RootStackScreenProps<'Worker95BusinessDetail'>) {
  const item = route.params?.item;
  const [activeTab, setActiveTab] = useState<'overview' | 'investors'>('overview');
  const { data: fundingRounds, isLoading: roundsLoading } = useFundingRoundsForCluster(item?.cluster_id);
  const contribute = useContributeToFundingRound();
  const [contributeAmount, setContributeAmount] = useState<Record<string, string>>({});

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

  // Annualized projection of the real monthly rate — a mathematical
  // extrapolation, not a separately-reported figure.
  const avgReturnAllTime = (item.projected_monthly_roi * 12).toFixed(1);
  const lastUpdatedLabel = new Date(item.last_updated_at).toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

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
          {(['overview', 'investors'] as const).map((t) => (
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
            <View style={styles.metricsGrid}>
              {[
                { icon: BarChart3, label: '30-Day Turnover', value: fmt(item.rolling_30_day_turnover) },
                { icon: TrendingUp, label: 'Monthly ROI', value: `${item.projected_monthly_roi.toFixed(2)}%` },
                { icon: Calendar, label: 'Category', value: item.category },
                { icon: Package, label: 'Risk Rating', value: risk.label },
              ].map((m) => (
                <View key={m.label} style={styles.metricCard}>
                  <m.icon size={18} color="#059669" />
                  <Text style={styles.metricValue} numberOfLines={1} adjustsFontSizeToFit>
                    {m.value}
                  </Text>
                  <Text style={styles.metricLabel}>{m.label}</Text>
                </View>
              ))}
            </View>

            <View style={styles.infoCard}>
              <Info size={16} color="#3B82F6" />
              <Text style={styles.infoText}>
                Figures reflect this business's most recently reported 30-day turnover, last
                updated {lastUpdatedLabel}. Detailed per-transaction reporting isn't available yet.
              </Text>
            </View>
          </View>
        )}

        {/* ── Investors Tab ── */}
        {activeTab === 'investors' && (
          <View style={styles.tabContent}>
            <View style={styles.investorStatRow}>
              <View style={styles.investorStat}>
                <Text style={styles.investorStatVal}>₦10,000</Text>
                <Text style={styles.investorStatLabel}>Min. Entry</Text>
              </View>
              <View style={styles.investorStat}>
                <Text style={styles.investorStatVal}>{avgReturnAllTime}%</Text>
                <Text style={styles.investorStatLabel}>Projected Annual Return</Text>
              </View>
            </View>

            <Text style={styles.sectionHeading}>Open funding rounds</Text>

            {roundsLoading ? (
              <ActivityIndicator color="#059669" style={{ marginTop: 16 }} />
            ) : !fundingRounds || fundingRounds.length === 0 ? (
              <View style={styles.infoCard}>
                <Users size={16} color="#3B82F6" />
                <Text style={styles.infoText}>
                  No group funding round is open for this business right now — you can still invest
                  directly using the button below.
                </Text>
              </View>
            ) : (
              fundingRounds.map((round) => {
                const amount = contributeAmount[round.id] || '';
                return (
                  <View key={round.id} style={styles.roundCard}>
                    <View style={styles.roundHeaderRow}>
                      <Text style={styles.roundContributors}>
                        {round.contributors_count} contributor{round.contributors_count === 1 ? '' : 's'}
                      </Text>
                      <Text style={styles.roundProgressPct}>{round.progress_pct}%</Text>
                    </View>
                    <View style={styles.roundProgressTrack}>
                      <View style={[styles.roundProgressFill, { width: `${Math.min(100, round.progress_pct)}%` }]} />
                    </View>
                    <Text style={styles.roundAmounts}>
                      ₦{(round.raised_amount_kobo / 100).toLocaleString()} raised of ₦
                      {(round.target_amount_kobo / 100).toLocaleString()} target
                    </Text>

                    <View style={styles.roundContributeRow}>
                      <TextInput
                        value={amount}
                        onChangeText={(v) => setContributeAmount((prev) => ({ ...prev, [round.id]: v }))}
                        placeholder="Amount (₦)"
                        keyboardType="number-pad"
                        style={styles.roundInput}
                      />
                      <TouchableOpacity
                        style={styles.roundContributeBtn}
                        disabled={contribute.isPending || !amount}
                        onPress={() => {
                          const kobo = Math.round(parseFloat(amount) * 100);
                          if (!kobo || kobo <= 0) return;
                          contribute.mutate(
                            { roundId: round.id, amountKobo: kobo },
                            {
                              onSuccess: (result) => {
                                setContributeAmount((prev) => ({ ...prev, [round.id]: '' }));
                                Toast.show({
                                  type: 'success',
                                  text1: result.settled ? 'Round fully funded!' : 'Contribution recorded',
                                  text2: result.settled
                                    ? 'This round just hit its target.'
                                    : `₦${(result.raised_amount_kobo / 100).toLocaleString()} raised so far`,
                                });
                              },
                              onError: (err: any) =>
                                Alert.alert('Could not contribute', err.message || 'Please try again'),
                            }
                          );
                        }}
                      >
                        {contribute.isPending ? (
                          <ActivityIndicator color="#fff" size="small" />
                        ) : (
                          <Text style={styles.roundContributeBtnText}>Contribute</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}

            <View style={styles.infoCard}>
              <Zap size={16} color="#FBBF24" />
              <Text style={styles.infoText}>
                Dividends accrue monthly on your principal and become available to collect or
                withdraw from your portfolio once credited.
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

  investorStatRow: { flexDirection: 'row', gap: 10 },
  investorStat: { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 14, alignItems: 'center', gap: 4, borderWidth: 1, borderColor: '#E5E7EB' },
  investorStatVal: { fontSize: 16, fontWeight: '800', color: '#111827' },
  investorStatLabel: { fontSize: 10, color: '#9CA3AF', textAlign: 'center' },

  sectionHeading: { fontSize: 13, fontWeight: '700', color: '#374151', marginTop: 20, marginBottom: 10 },
  roundCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 10 },
  roundHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  roundContributors: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  roundProgressPct: { fontSize: 12, fontWeight: '800', color: '#059669' },
  roundProgressTrack: { height: 6, backgroundColor: '#F3F4F6', borderRadius: 3, overflow: 'hidden' },
  roundProgressFill: { height: '100%', backgroundColor: '#10B981', borderRadius: 3 },
  roundAmounts: { fontSize: 11, color: '#9CA3AF', marginTop: 6 },
  roundContributeRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  roundInput: { flex: 1, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, color: '#111827' },
  roundContributeBtn: { backgroundColor: '#059669', paddingHorizontal: 16, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  roundContributeBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },

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
