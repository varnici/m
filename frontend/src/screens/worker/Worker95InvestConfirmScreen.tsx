// @ts-nocheck
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ChevronLeft,
  TrendingUp,
  Calendar,
  Zap,
  AlertTriangle,
  CheckCircle2,
  Info,
} from 'lucide-react-native';
import { workerService } from '@/services/workerService';
import type { RootStackScreenProps } from '@/navigation/types';

const MIN_INVESTMENT = 10000;
const MAX_INVESTMENT = 5000000;
const FIXED_MONTHLY_RATE = 1.0;
const EARLY_PENALTY_PCT = 3.5;

const fmt = (n: number) =>
  `₦${n.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const QUICK_AMOUNTS = [10000, 25000, 50000, 100000, 250000, 500000];

function computeProjection(principal: number, monthlyRoiPct: number, months: number) {
  const r = monthlyRoiPct / 100;
  const totalDividends = principal * r * months;
  const finalValue = principal + totalDividends;
  return { totalDividends, finalValue };
}

export default function Worker95InvestConfirmScreen({
  navigation,
  route,
}: RootStackScreenProps<'Worker95InvestConfirm'>) {
  const item = route.params?.item;
  const [rawAmount, setRawAmount] = useState('');
  const [termMonths, setTermMonths] = useState<6 | 12>(6);
  const [projectionMonths, setProjectionMonths] = useState(6);
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const principal = useMemo(() => {
    const n = parseFloat(rawAmount.replace(/[^0-9.]/g, ''));
    return isNaN(n) ? 0 : n;
  }, [rawAmount]);

  const isValid = principal >= MIN_INVESTMENT && principal <= MAX_INVESTMENT;

  const projection = useMemo(
    () => (item && isValid ? computeProjection(principal, FIXED_MONTHLY_RATE, projectionMonths) : null),
    [principal, item, projectionMonths, isValid]
  );

  const handleConfirm = async () => {
    if (!isValid) {
      Alert.alert('Invalid Amount', `Minimum investment is ${fmt(MIN_INVESTMENT)}.`);
      return;
    }
    setLoading(true);
    try {
      await workerService.createInvestment({
        cluster_id: item.cluster_id,
        amount: principal,
        term_months: termMonths,
      });
      setConfirmed(true);
    } catch (e: any) {
      Alert.alert('Investment Failed', e?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!item) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.centered}>
          <Text style={{ color: '#EF4444' }}>Investment data missing.</Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={{ color: '#059669', marginTop: 8 }}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Success state ──
  if (confirmed) {
    return (
      <SafeAreaView style={styles.root}>
        <ScrollView contentContainerStyle={styles.successScroll}>
          <LinearGradient colors={['#064E3B', '#059669']} style={styles.successHero}>
            <CheckCircle2 size={60} color="#fff" />
            <Text style={styles.successTitle}>Investment Confirmed!</Text>
            <Text style={styles.successSub}>
              Your {fmt(principal)} has been deployed into {item.business_name}.
            </Text>
          </LinearGradient>

          <View style={styles.successCard}>
            <Text style={styles.successCardTitle}>What happens next?</Text>
            {[
              { step: '1', text: `Your ${fmt(principal)} is locked for ${termMonths} months in ${item.business_name}.` },
              { step: '2', text: `You earn ${FIXED_MONTHLY_RATE}% monthly — that's ${fmt(principal * FIXED_MONTHLY_RATE / 100)} every month.` },
              { step: '3', text: 'After each month, your dividend becomes available to collect.' },
              { step: '4', text: `Withdrawing before maturity incurs a ${EARLY_PENALTY_PCT}% penalty on the total amount.` },
            ].map((s) => (
              <View key={s.step} style={styles.successStep}>
                <View style={styles.successStepDot}>
                  <Text style={styles.successStepNum}>{s.step}</Text>
                </View>
                <Text style={styles.successStepText}>{s.text}</Text>
              </View>
            ))}
          </View>

          <View style={styles.successActions}>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => navigation.navigate('Worker95Portfolio')}
            >
              <Text style={styles.primaryBtnText}>View My Portfolio</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => navigation.navigate('Main', { screen: 'WorkerMarketplace' } as any)}
            >
              <Text style={styles.secondaryBtnText}>Invest in Another Business</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ChevronLeft size={22} color="#111827" />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Confirm Investment</Text>
            <Text style={styles.headerSub}>{item.business_name}</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Business recap */}
          <View style={styles.businessRecap}>
            <View>
              <Text style={styles.recapName}>{item.business_name}</Text>
              <Text style={styles.recapCategory}>{item.category} · {item.risk_rating} Risk</Text>
            </View>
            <View style={styles.roiBadge}>
              <TrendingUp size={13} color="#059669" />
              <Text style={styles.roiBadgeText}>{FIXED_MONTHLY_RATE}%/mo</Text>
            </View>
          </View>

          {/* Investment Term Selection */}
          <View style={styles.amountSection}>
            <Text style={styles.amountLabel}>Investment Term</Text>
            <View style={styles.projMonthRow}>
              {([6, 12] as const).map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[styles.monthChip, termMonths === m && styles.monthChipActive]}
                  onPress={() => { setTermMonths(m); setProjectionMonths(m); }}
                >
                  <Text style={[styles.monthChipText, termMonths === m && styles.monthChipTextActive]}>
                    {m === 6 ? '6 Months' : '1 Year'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
              <View style={{ flex: 1, backgroundColor: '#F0FDF4', borderRadius: 10, padding: 10, alignItems: 'center' }}>
                <Text style={{ fontSize: 10, color: '#6B7280' }}>Monthly Return</Text>
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#059669' }}>{FIXED_MONTHLY_RATE}%</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: '#FEF3C7', borderRadius: 10, padding: 10, alignItems: 'center' }}>
                <Text style={{ fontSize: 10, color: '#6B7280' }}>Early Penalty</Text>
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#92400E' }}>{EARLY_PENALTY_PCT}%</Text>
              </View>
            </View>
          </View>

          {/* Amount input */}
          <View style={styles.amountSection}>
            <Text style={styles.amountLabel}>Investment Amount</Text>
            <View style={styles.amountInputWrap}>
              <Text style={styles.amountSymbol}>₦</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="0.00"
                value={rawAmount}
                onChangeText={setRawAmount}
                keyboardType="numeric"
                placeholderTextColor="#D1D5DB"
              />
            </View>
            {rawAmount.length > 0 && !isValid && (
              <Text style={styles.amountError}>Minimum investment is {fmt(MIN_INVESTMENT)}</Text>
            )}
            {isValid && (
              <Text style={styles.amountValid}>✓ Amount accepted</Text>
            )}

            {/* Quick amounts */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickRow}>
              {QUICK_AMOUNTS.map((q) => (
                <TouchableOpacity
                  key={q}
                  style={[styles.quickChip, principal === q && styles.quickChipActive]}
                  onPress={() => setRawAmount(String(q))}
                >
                  <Text style={[styles.quickChipText, principal === q && styles.quickChipTextActive]}>
                    {q >= 1000000 ? `₦${q / 1000000}M` : `₦${q / 1000}k`}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Projection model */}
          {isValid && projection && (
            <View style={styles.projSection}>
              <Text style={styles.projTitle}>Return Projection</Text>

              <View style={styles.projMonthRow}>
                {[termMonths].map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[styles.monthChip, styles.monthChipActive]}
                    disabled
                  >
                    <Text style={[styles.monthChipText, styles.monthChipTextActive]}>
                      {m === 6 ? '6 months' : '12 months'} (your term)
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <LinearGradient colors={['#F0FDF4', '#DCFCE7']} style={styles.projCard}>
                <View style={styles.projRow}>
                  <View style={styles.projStat}>
                    <Text style={styles.projStatLabel}>Principal</Text>
                    <Text style={styles.projStatValue}>{fmt(principal)}</Text>
                  </View>
                  <View style={styles.projStat}>
                    <Text style={styles.projStatLabel}>Dividends ({projectionMonths} mo)</Text>
                    <Text style={[styles.projStatValue, { color: '#059669' }]}>
                      +{fmt(projection.totalDividends)}
                    </Text>
                  </View>
                  <View style={styles.projStat}>
                    <Text style={styles.projStatLabel}>Total Value</Text>
                    <Text style={[styles.projStatValue, { fontWeight: '800', color: '#064E3B' }]}>
                      {fmt(projection.finalValue)}
                    </Text>
                  </View>
                </View>

                <View style={styles.projDivider} />

                <View style={styles.projFooter}>
                  <Calendar size={14} color="#059669" />
                  <Text style={styles.projFooterText}>
                    First dividend of {fmt(principal * FIXED_MONTHLY_RATE / 100)} available after 1 month.
                    Collect monthly or let it accumulate.
                  </Text>
                </View>
              </LinearGradient>

              <View style={styles.disclaimerBox}>
                <Info size={13} color="#6B7280" />
                <Text style={styles.disclaimerText}>
                  Projections are estimates based on current inventory performance. Actual returns may vary. Past performance does not guarantee future results.
                </Text>
              </View>
            </View>
          )}

          {/* Risk acknowledgement */}
          {item.risk_rating === 'High' && (
            <View style={styles.riskWarn}>
              <AlertTriangle size={16} color="#DC2626" />
              <Text style={styles.riskWarnText}>
                This is a HIGH RISK investment. Only invest funds you can afford to lose.
              </Text>
            </View>
          )}

          <View style={{ height: 120 }} />
        </ScrollView>

        {/* CTA */}
        <View style={styles.footer}>
          <View style={styles.footerSummary}>
            <Text style={styles.footerLabel}>You are investing</Text>
            <Text style={styles.footerAmount}>{isValid ? fmt(principal) : '₦0.00'}</Text>
          </View>
          <TouchableOpacity
            style={[styles.confirmBtn, (!isValid || loading) && styles.confirmBtnDisabled]}
            onPress={handleConfirm}
            disabled={!isValid || loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Zap size={16} color="#fff" />
                <Text style={styles.confirmBtnText}>Confirm & Deploy Capital</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F9FAFB' },
  scroll: { paddingHorizontal: 20, paddingTop: 12 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
  },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  headerSub: { fontSize: 12, color: '#9CA3AF', marginTop: 1 },

  businessRecap: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 20,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  recapName: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 2 },
  recapCategory: { fontSize: 12, color: '#9CA3AF' },
  roiBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#D1FAE5', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  roiBadgeText: { fontSize: 13, color: '#065F46', fontWeight: '700' },

  amountSection: { marginBottom: 20 },
  amountLabel: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 12 },
  amountInputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 4,
    borderWidth: 2, borderColor: '#E5E7EB', marginBottom: 8,
  },
  amountSymbol: { fontSize: 28, fontWeight: '700', color: '#9CA3AF', marginRight: 4 },
  amountInput: { flex: 1, fontSize: 32, fontWeight: '800', color: '#111827', paddingVertical: 12 },
  amountError: { fontSize: 12, color: '#EF4444', marginBottom: 8 },
  amountValid: { fontSize: 12, color: '#059669', fontWeight: '600', marginBottom: 8 },
  quickRow: { marginTop: 8 },
  quickChip: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20, backgroundColor: '#F3F4F6', marginRight: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  quickChipActive: { backgroundColor: '#059669', borderColor: '#059669' },
  quickChipText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  quickChipTextActive: { color: '#fff' },

  projSection: { marginBottom: 20 },
  projTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 12 },
  projMonthRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  monthChip: { flex: 1, paddingVertical: 9, borderRadius: 10, backgroundColor: '#F3F4F6', alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
  monthChipActive: { backgroundColor: '#064E3B', borderColor: '#064E3B' },
  monthChipText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  monthChipTextActive: { color: '#fff' },

  projCard: { borderRadius: 16, padding: 18, marginBottom: 10 },
  projRow: { flexDirection: 'row', gap: 8 },
  projStat: { flex: 1, alignItems: 'center' },
  projStatLabel: { fontSize: 10, color: '#6B7280', marginBottom: 4, textAlign: 'center' },
  projStatValue: { fontSize: 14, fontWeight: '700', color: '#111827', textAlign: 'center' },
  projDivider: { height: 1, backgroundColor: '#BBF7D0', marginVertical: 12 },
  projFooter: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  projFooterText: { flex: 1, fontSize: 12, color: '#065F46', lineHeight: 18 },

  disclaimerBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#F9FAFB', borderRadius: 10, padding: 12 },
  disclaimerText: { flex: 1, fontSize: 11, color: '#9CA3AF', lineHeight: 17 },

  riskWarn: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: '#FEF2F2', borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: '#FECACA' },
  riskWarnText: { flex: 1, fontSize: 13, color: '#DC2626', lineHeight: 19 },

  footer: {
    backgroundColor: '#fff', paddingHorizontal: 20, paddingTop: 14, paddingBottom: 32,
    borderTopWidth: 1, borderTopColor: '#E5E7EB', gap: 12,
  },
  footerSummary: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerLabel: { fontSize: 13, color: '#9CA3AF' },
  footerAmount: { fontSize: 18, fontWeight: '800', color: '#111827' },
  confirmBtn: {
    backgroundColor: '#059669', borderRadius: 16, paddingVertical: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  confirmBtnDisabled: { opacity: 0.4 },
  confirmBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  successScroll: { paddingBottom: 40 },
  successHero: { padding: 40, alignItems: 'center', gap: 14 },
  successTitle: { fontSize: 26, fontWeight: '800', color: '#fff' },
  successSub: { fontSize: 14, color: 'rgba(255,255,255,0.8)', textAlign: 'center', lineHeight: 21 },
  successCard: { margin: 20, backgroundColor: '#fff', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#E5E7EB' },
  successCardTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 16 },
  successStep: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  successStepDot: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#D1FAE5', alignItems: 'center', justifyContent: 'center' },
  successStepNum: { fontSize: 13, fontWeight: '800', color: '#059669' },
  successStepText: { flex: 1, fontSize: 13, color: '#374151', lineHeight: 20 },
  successActions: { paddingHorizontal: 20, gap: 10 },
  primaryBtn: { backgroundColor: '#059669', borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  secondaryBtn: { backgroundColor: '#F3F4F6', borderRadius: 16, paddingVertical: 14, alignItems: 'center' },
  secondaryBtnText: { color: '#374151', fontSize: 14, fontWeight: '600' },
});
