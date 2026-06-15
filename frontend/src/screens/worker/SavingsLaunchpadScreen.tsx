// @ts-nocheck
import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Target,
  Zap,
  RefreshCw,
  ChevronRight,
  Calendar,
  TrendingUp,
  CheckCircle2,
} from 'lucide-react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { workerService } from '@/services/workerService';
import { useWorkerStore, selectActivePlans } from '@/store/workerStore';
import type { RootStackScreenProps } from '@/navigation/types';

const fmt = (n: number) =>
  `₦${n.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ---------------------------------------------------------------------------
// Pure client-side projection: months to target using monthly compounding
// ---------------------------------------------------------------------------
function projectMonths(
  current: number,
  target: number,
  monthlyAddition: number,
  annualRateDecimal: number
): number | null {
  if (monthlyAddition <= 0 || target <= current) return null;
  const r = annualRateDecimal / 12;
  let balance = current;
  let months = 0;
  while (balance < target && months < 600) {
    balance = balance * (1 + r) + monthlyAddition;
    months++;
  }
  return months >= 600 ? null : months;
}

function targetDateLabel(months: number | null): string {
  if (months === null) return '—';
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toLocaleDateString('en-NG', { month: 'long', year: 'numeric' });
}

export default function SavingsLaunchpadScreen({
  navigation,
}: RootStackScreenProps<'Worker95Savings'>) {
  const plans = useWorkerStore(selectActivePlans);
  const { updateSavingsPlanRule } = useWorkerStore();
  const queryClient = useQueryClient();

  // Pick first non-achieved plan as the focal target
  const activePlan = plans.find((p) => !p.is_achieved) ?? plans[0] ?? null;

  // Automation toggles (local state — committed via API on confirm)
  const [salaryDirect, setSalaryDirect] = useState(
    activePlan?.automated_rule === 'salary_direct'
  );
  const [roundUp, setRoundUp] = useState(activePlan?.automated_rule === 'round_up');

  // Projection slider: monthly addition in Naira (10,000 – 500,000)
  const [monthlyAddition, setMonthlyAddition] = useState(50000);
  const GROWTH_RATE = 0.06; // 6% annual, conservative

  const projectedMonths = useMemo(
    () =>
      activePlan
        ? projectMonths(
            activePlan.current_balance,
            activePlan.target_amount,
            monthlyAddition,
            GROWTH_RATE
          )
        : null,
    [activePlan, monthlyAddition]
  );

  const { mutate: saveRule, isLoading: isSaving } = useMutation({
    mutationFn: () => {
      if (!activePlan) throw new Error('No active plan');
      const rule = salaryDirect ? 'salary_direct' : roundUp ? 'round_up' : 'manual';
      const amount = rule !== 'manual' ? monthlyAddition : 0;
      return workerService.configureSavingsRules({
        plan_id: activePlan.id,
        automated_rule: rule,
        rule_amount: amount,
      });
    },
    onSuccess: (res) => {
      updateSavingsPlanRule(res.plan_id, res.automated_rule as any, res.rule_amount);
      queryClient.invalidateQueries(['worker-dashboard']);
      Alert.alert('Saved', res.message);
    },
    onError: () => {
      Alert.alert('Error', 'Failed to save automation rule. Please try again.');
    },
  });

  const handleSalaryToggle = (val: boolean) => {
    setSalaryDirect(val);
    if (val) setRoundUp(false);
  };

  const handleRoundUpToggle = (val: boolean) => {
    setRoundUp(val);
    if (val) setSalaryDirect(false);
  };

  const pct = activePlan
    ? Math.min(100, Math.round((activePlan.current_balance / activePlan.target_amount) * 100))
    : 0;

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* ── Header ── */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ChevronRight size={22} color="#111827" style={{ transform: [{ rotate: '180deg' }] }} />
          </TouchableOpacity>
          <View>
            <Text style={styles.title}>Business Launch Pad</Text>
            <Text style={styles.subtitle}>Savings automation & projection</Text>
          </View>
        </View>

        {activePlan == null ? (
          <View style={styles.noPlanCard}>
            <Target size={40} color="#D1D5DB" />
            <Text style={styles.noPlanText}>No savings target configured yet.</Text>
            <Text style={styles.noPlanHint}>
              Contact support or use the dashboard to create your first business savings target.
            </Text>
          </View>
        ) : (
          <>
            {/* ── Target Progress ── */}
            <LinearGradient colors={['#064E3B', '#059669']} style={styles.targetCard}>
              <Text style={styles.targetLabel}>{activePlan.target_name}</Text>
              <Text style={styles.targetValue}>{fmt(activePlan.current_balance)}</Text>
              <Text style={styles.targetOf}>of {fmt(activePlan.target_amount)}</Text>

              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${pct}%` }]} />
              </View>

              <View style={styles.targetFooter}>
                <Text style={styles.targetPct}>{pct}% funded</Text>
                {activePlan.is_achieved && (
                  <View style={styles.achievedBadge}>
                    <CheckCircle2 size={14} color="#059669" />
                    <Text style={styles.achievedText}>Goal Achieved!</Text>
                  </View>
                )}
              </View>
            </LinearGradient>

            {/* ── Automation Toggles ── */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Automation Behaviours</Text>

              <View style={styles.toggleCard}>
                <View style={styles.toggleInfo}>
                  <Zap size={20} color="#FBBF24" />
                  <View style={styles.toggleText}>
                    <Text style={styles.toggleTitle}>Salary Direct Sweep</Text>
                    <Text style={styles.toggleDesc}>
                      Automatically transfers a fixed amount on salary credit days.
                    </Text>
                  </View>
                </View>
                <Switch
                  value={salaryDirect}
                  onValueChange={handleSalaryToggle}
                  trackColor={{ false: '#E5E7EB', true: '#A7F3D0' }}
                  thumbColor={salaryDirect ? '#059669' : '#9CA3AF'}
                />
              </View>

              <View style={styles.toggleCard}>
                <View style={styles.toggleInfo}>
                  <RefreshCw size={20} color="#60A5FA" />
                  <View style={styles.toggleText}>
                    <Text style={styles.toggleTitle}>Transaction Round-Up</Text>
                    <Text style={styles.toggleDesc}>
                      Rounds up every digital payment and sweeps excess change into your target.
                    </Text>
                  </View>
                </View>
                <Switch
                  value={roundUp}
                  onValueChange={handleRoundUpToggle}
                  trackColor={{ false: '#E5E7EB', true: '#BFDBFE' }}
                  thumbColor={roundUp ? '#3B82F6' : '#9CA3AF'}
                />
              </View>

              {(salaryDirect || roundUp) && (
                <View style={styles.ruleAmountBox}>
                  <Text style={styles.ruleAmountLabel}>
                    {salaryDirect ? 'Monthly sweep amount' : 'Round-up cap per month'}
                  </Text>
                  <Text style={styles.ruleAmountValue}>{fmt(monthlyAddition)}</Text>
                </View>
              )}
            </View>

            {/* ── Projection Model ── */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Capital Projection Model</Text>
              <View style={styles.projCard}>
                <Text style={styles.projSliderLabel}>Monthly contribution</Text>

                <View style={styles.stepperRow}>
                  <TouchableOpacity
                    style={styles.stepperBtn}
                    onPress={() => setMonthlyAddition((v) => Math.max(10000, v - 5000))}
                  >
                    <Text style={styles.stepperBtnText}>−</Text>
                  </TouchableOpacity>
                  <Text style={styles.stepperValue}>{fmt(monthlyAddition)}</Text>
                  <TouchableOpacity
                    style={styles.stepperBtn}
                    onPress={() => setMonthlyAddition((v) => Math.min(500000, v + 5000))}
                  >
                    <Text style={styles.stepperBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.sliderLabels}>
                  <Text style={styles.sliderMin}>Min ₦10k</Text>
                  <Text style={styles.sliderMax}>Max ₦500k</Text>
                </View>

                <View style={styles.projResultRow}>
                  <View style={styles.projStat}>
                    <Calendar size={16} color="#059669" />
                    <View>
                      <Text style={styles.projStatLabel}>Estimated Target Date</Text>
                      <Text style={styles.projStatValue}>{targetDateLabel(projectedMonths)}</Text>
                    </View>
                  </View>
                  <View style={styles.projStat}>
                    <TrendingUp size={16} color="#059669" />
                    <View>
                      <Text style={styles.projStatLabel}>Months to Goal</Text>
                      <Text style={styles.projStatValue}>
                        {projectedMonths !== null ? `${projectedMonths} mo` : 'N/A'}
                      </Text>
                    </View>
                  </View>
                </View>

                <Text style={styles.projNote}>
                  Projection assumes 6% annual growth. No network calls — purely illustrative.
                </Text>
              </View>
            </View>

            {/* ── Confirm Button ── */}
            <TouchableOpacity
              style={[styles.confirmBtn, isSaving && styles.confirmBtnDisabled]}
              onPress={() => saveRule()}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.confirmBtnText}>Confirm Automation Settings</Text>
              )}
            </TouchableOpacity>
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F9FAFB' },
  scroll: { paddingHorizontal: 16, paddingTop: 8 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
    marginBottom: 8,
  },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 17, fontWeight: '700', color: '#111827' },
  subtitle: { fontSize: 12, color: '#9CA3AF', marginTop: 1 },

  noPlanCard: { flex: 1, alignItems: 'center', paddingVertical: 80, gap: 10 },
  noPlanText: { fontSize: 16, fontWeight: '600', color: '#374151' },
  noPlanHint: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', maxWidth: 280 },

  targetCard: { borderRadius: 20, padding: 22, marginBottom: 24 },
  targetLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 13, marginBottom: 4 },
  targetValue: { color: '#fff', fontSize: 30, fontWeight: '800', letterSpacing: -0.5 },
  targetOf: { color: 'rgba(255,255,255,0.65)', fontSize: 13, marginBottom: 16, marginTop: 2 },
  progressTrack: { height: 8, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 4, overflow: 'hidden', marginBottom: 10 },
  progressFill: { height: 8, backgroundColor: '#fff', borderRadius: 4 },
  targetFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  targetPct: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '600' },
  achievedBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  achievedText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 },

  toggleCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  toggleInfo: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, flex: 1, marginRight: 12 },
  toggleText: { flex: 1 },
  toggleTitle: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 2 },
  toggleDesc: { fontSize: 12, color: '#6B7280', lineHeight: 17 },

  ruleAmountBox: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginTop: 4,
  },
  ruleAmountLabel: { fontSize: 13, color: '#065F46', fontWeight: '600' },
  ruleAmountValue: { fontSize: 16, color: '#059669', fontWeight: '800' },

  projCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  projSliderLabel: { fontSize: 13, color: '#6B7280', marginBottom: 10 },
  projBold: { fontWeight: '700', color: '#111827' },
  stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  stepperBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
  stepperBtnText: { fontSize: 22, fontWeight: '700', color: '#059669', lineHeight: 26 },
  stepperValue: { fontSize: 20, fontWeight: '800', color: '#111827', letterSpacing: -0.5 },
  sliderLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 18 },
  sliderMin: { fontSize: 11, color: '#9CA3AF' },
  sliderMax: { fontSize: 11, color: '#9CA3AF' },

  projResultRow: { flexDirection: 'row', gap: 16, marginBottom: 14 },
  projStat: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#F0FDF4', borderRadius: 12, padding: 12 },
  projStatLabel: { fontSize: 11, color: '#065F46', marginBottom: 2 },
  projStatValue: { fontSize: 15, fontWeight: '700', color: '#064E3B' },
  projNote: { fontSize: 11, color: '#9CA3AF', fontStyle: 'italic', lineHeight: 16 },

  confirmBtn: {
    backgroundColor: '#059669',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnDisabled: { opacity: 0.6 },
  confirmBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
