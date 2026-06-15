// @ts-nocheck
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ChevronLeft,
  Zap,
  RefreshCw,
  Calendar,
  Building2,
  AlertCircle,
  CheckCircle2,
  Info,
  ChevronDown,
} from 'lucide-react-native';
import type { RootStackScreenProps } from '@/navigation/types';

const BANKS = [
  'Access Bank', 'GTBank', 'First Bank', 'Zenith Bank',
  'UBA', 'Stanbic IBTC', 'Opay', 'Kuda Bank', 'Moniepoint', 'PalmPay',
];

const SALARY_DAYS = Array.from({ length: 28 }, (_, i) => i + 1);

const fmt = (n: number) =>
  `₦${n.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const SWEEP_PRESETS = [5000, 10000, 20000, 50000, 100000];
const ROUNDUP_THRESHOLDS = [
  { label: 'Every transaction', value: 1 },
  { label: '≥ ₦500 transactions', value: 500 },
  { label: '≥ ₦1,000 transactions', value: 1000 },
  { label: '≥ ₦5,000 transactions', value: 5000 },
];

export default function Worker95SalaryConfigScreen({
  navigation,
}: RootStackScreenProps<'Worker95SalaryConfig'>) {
  // Salary Direct Sweep
  const [sweepEnabled, setSweepEnabled] = useState(false);
  const [salaryBank, setSalaryBank] = useState('');
  const [salaryDay, setSalaryDay] = useState<number | null>(null);
  const [sweepAmount, setSweepAmount] = useState('');
  const [showBankPicker, setShowBankPicker] = useState(false);

  // Round-Up
  const [roundUpEnabled, setRoundUpEnabled] = useState(false);
  const [roundUpThreshold, setRoundUpThreshold] = useState(1);
  const [roundUpMonthlyCapRaw, setRoundUpMonthlyCapRaw] = useState('');

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const sweepAmountNum = parseFloat(sweepAmount.replace(/[^0-9.]/g, '')) || 0;
  const roundUpCap = parseFloat(roundUpMonthlyCapRaw.replace(/[^0-9.]/g, '')) || 0;

  const canSave =
    (sweepEnabled ? salaryBank && salaryDay && sweepAmountNum > 0 : true) &&
    (roundUpEnabled ? roundUpCap > 0 : true) &&
    (sweepEnabled || roundUpEnabled);

  const handleSave = async () => {
    if (!canSave) {
      Alert.alert('Incomplete', 'Fill in all required fields for the enabled automation modes.');
      return;
    }
    setSaving(true);
    await new Promise((r) => setTimeout(r, 1400));
    setSaving(false);
    setSaved(true);
    Alert.alert(
      'Automation Configured ✓',
      'Your salary automation rules are now active. Changes take effect from your next salary credit date.',
      [{ text: 'Done', onPress: () => navigation.goBack() }]
    );
  };

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={22} color="#111827" />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Salary Automation</Text>
          <Text style={styles.headerSub}>Configure your auto-savings rules</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Explainer banner */}
        <LinearGradient colors={['#064E3B', '#059669']} style={styles.banner}>
          <Zap size={22} color="#FCD34D" />
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>Automate your wealth building</Text>
            <Text style={styles.bannerDesc}>
              Enable one or both modes. Funds are swept directly into your active savings target.
            </Text>
          </View>
        </LinearGradient>

        {/* ── MODE 1: Salary Direct Sweep ── */}
        <View style={styles.modeCard}>
          <View style={styles.modeHeader}>
            <View style={styles.modeIconWrap}>
              <Zap size={20} color="#FBBF24" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.modeTitle}>Salary Direct Sweep</Text>
              <Text style={styles.modeDesc}>
                A fixed amount is deducted on your salary credit date each month.
              </Text>
            </View>
            <Switch
              value={sweepEnabled}
              onValueChange={setSweepEnabled}
              trackColor={{ false: '#E5E7EB', true: '#A7F3D0' }}
              thumbColor={sweepEnabled ? '#059669' : '#9CA3AF'}
            />
          </View>

          {sweepEnabled && (
            <View style={styles.modeFields}>
              {/* Bank picker */}
              <Text style={styles.fieldLabel}>Salary Bank *</Text>
              <TouchableOpacity
                style={styles.pickerBtn}
                onPress={() => setShowBankPicker(!showBankPicker)}
              >
                <Building2 size={16} color="#9CA3AF" />
                <Text style={[styles.pickerBtnText, salaryBank && { color: '#111827' }]}>
                  {salaryBank || 'Select your bank'}
                </Text>
                <ChevronDown size={16} color="#9CA3AF" />
              </TouchableOpacity>
              {showBankPicker && (
                <View style={styles.bankDropdown}>
                  {BANKS.map((b) => (
                    <TouchableOpacity
                      key={b}
                      style={[styles.bankOption, salaryBank === b && styles.bankOptionActive]}
                      onPress={() => { setSalaryBank(b); setShowBankPicker(false); }}
                    >
                      <Text style={[styles.bankOptionText, salaryBank === b && styles.bankOptionTextActive]}>
                        {b}
                      </Text>
                      {salaryBank === b && <CheckCircle2 size={15} color="#059669" />}
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Salary day */}
              <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Salary Credit Day *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayRow}>
                {SALARY_DAYS.map((d) => (
                  <TouchableOpacity
                    key={d}
                    style={[styles.dayChip, salaryDay === d && styles.dayChipActive]}
                    onPress={() => setSalaryDay(d)}
                  >
                    <Text style={[styles.dayChipText, salaryDay === d && styles.dayChipTextActive]}>
                      {d}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              {salaryDay && (
                <View style={styles.inlineInfo}>
                  <Calendar size={13} color="#059669" />
                  <Text style={styles.inlineInfoText}>
                    Sweep will fire on the {salaryDay}{salaryDay === 1 ? 'st' : salaryDay === 2 ? 'nd' : salaryDay === 3 ? 'rd' : 'th'} of each month.
                  </Text>
                </View>
              )}

              {/* Sweep amount */}
              <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Monthly Sweep Amount *</Text>
              <View style={styles.amountInputWrap}>
                <Text style={styles.currencySymbol}>₦</Text>
                <TextInput
                  style={styles.amountInput}
                  placeholder="0.00"
                  value={sweepAmount}
                  onChangeText={setSweepAmount}
                  keyboardType="numeric"
                />
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetRow}>
                {SWEEP_PRESETS.map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[styles.presetChip, sweepAmountNum === p && styles.presetChipActive]}
                    onPress={() => setSweepAmount(String(p))}
                  >
                    <Text style={[styles.presetText, sweepAmountNum === p && styles.presetTextActive]}>
                      ₦{p >= 1000 ? `${p / 1000}k` : p}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        {/* ── MODE 2: Transaction Round-Up ── */}
        <View style={styles.modeCard}>
          <View style={styles.modeHeader}>
            <View style={[styles.modeIconWrap, { backgroundColor: '#EFF6FF' }]}>
              <RefreshCw size={20} color="#3B82F6" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.modeTitle}>Transaction Round-Up</Text>
              <Text style={styles.modeDesc}>
                Every qualifying spend is rounded up to the nearest ₦100 and the difference goes to savings.
              </Text>
            </View>
            <Switch
              value={roundUpEnabled}
              onValueChange={setRoundUpEnabled}
              trackColor={{ false: '#E5E7EB', true: '#BFDBFE' }}
              thumbColor={roundUpEnabled ? '#3B82F6' : '#9CA3AF'}
            />
          </View>

          {roundUpEnabled && (
            <View style={styles.modeFields}>
              <Text style={styles.fieldLabel}>Trigger Threshold</Text>
              <Text style={styles.fieldHint}>Only round up transactions above this amount.</Text>
              <View style={styles.thresholdGrid}>
                {ROUNDUP_THRESHOLDS.map((t) => (
                  <TouchableOpacity
                    key={t.value}
                    style={[styles.thresholdChip, roundUpThreshold === t.value && styles.thresholdChipActive]}
                    onPress={() => setRoundUpThreshold(t.value)}
                  >
                    <Text style={[styles.thresholdText, roundUpThreshold === t.value && styles.thresholdTextActive]}>
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Monthly Cap *</Text>
              <Text style={styles.fieldHint}>Maximum round-up to collect per month.</Text>
              <View style={styles.amountInputWrap}>
                <Text style={styles.currencySymbol}>₦</Text>
                <TextInput
                  style={styles.amountInput}
                  placeholder="0.00"
                  value={roundUpMonthlyCapRaw}
                  onChangeText={setRoundUpMonthlyCapRaw}
                  keyboardType="numeric"
                />
              </View>
            </View>
          )}
        </View>

        {/* Summary preview */}
        {(sweepEnabled || roundUpEnabled) && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Monthly Automation Summary</Text>
            {sweepEnabled && sweepAmountNum > 0 && (
              <View style={styles.summaryRow}>
                <Zap size={14} color="#FBBF24" />
                <Text style={styles.summaryText}>
                  Salary sweep: <Text style={styles.summaryBold}>{fmt(sweepAmountNum)}</Text> on the {salaryDay || '?'}th
                </Text>
              </View>
            )}
            {roundUpEnabled && roundUpCap > 0 && (
              <View style={styles.summaryRow}>
                <RefreshCw size={14} color="#3B82F6" />
                <Text style={styles.summaryText}>
                  Round-up cap: <Text style={styles.summaryBold}>{fmt(roundUpCap)}</Text> / month
                </Text>
              </View>
            )}
            <View style={styles.summaryDivider} />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryTotal}>
                Max monthly contribution:{' '}
                <Text style={[styles.summaryBold, { color: '#059669' }]}>
                  {fmt((sweepEnabled ? sweepAmountNum : 0) + (roundUpEnabled ? roundUpCap : 0))}
                </Text>
              </Text>
            </View>
          </View>
        )}

        <View style={styles.infoBox}>
          <Info size={14} color="#6B7280" />
          <Text style={styles.infoText}>
            Automation rules take effect from the next applicable trigger date. You can pause or modify rules at any time.
          </Text>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveBtn, (!canSave || saving) && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={!canSave || saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>
              {saved ? '✓ Saved' : 'Save Automation Rules'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F9FAFB' },
  scroll: { paddingHorizontal: 16, paddingTop: 12 },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
  },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  headerSub: { fontSize: 12, color: '#9CA3AF' },

  banner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 14,
    borderRadius: 16, padding: 18, marginBottom: 16,
  },
  bannerTitle: { fontSize: 15, fontWeight: '700', color: '#fff', marginBottom: 4 },
  bannerDesc: { fontSize: 13, color: 'rgba(255,255,255,0.8)', lineHeight: 19 },

  modeCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    marginBottom: 14, borderWidth: 1, borderColor: '#E5E7EB',
  },
  modeHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  modeIconWrap: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#FEF3C7', alignItems: 'center', justifyContent: 'center' },
  modeTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 2 },
  modeDesc: { fontSize: 12, color: '#6B7280', lineHeight: 18, flex: 1 },

  modeFields: { marginTop: 16, borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 16 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  fieldHint: { fontSize: 12, color: '#9CA3AF', marginBottom: 10, marginTop: -4 },

  pickerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#F9FAFB', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  pickerBtnText: { flex: 1, fontSize: 14, color: '#9CA3AF' },
  bankDropdown: {
    backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB',
    marginTop: 4, overflow: 'hidden',
  },
  bankOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  bankOptionActive: { backgroundColor: '#F0FDF4' },
  bankOptionText: { fontSize: 14, color: '#374151' },
  bankOptionTextActive: { color: '#059669', fontWeight: '600' },

  dayRow: { marginBottom: 10 },
  dayChip: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  dayChipActive: { backgroundColor: '#059669' },
  dayChipText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  dayChipTextActive: { color: '#fff' },
  inlineInfo: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F0FDF4', borderRadius: 8, padding: 10, marginTop: 6 },
  inlineInfoText: { fontSize: 12, color: '#065F46' },

  amountInputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F9FAFB', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 4,
    borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 10,
  },
  currencySymbol: { fontSize: 20, fontWeight: '700', color: '#9CA3AF', marginRight: 4 },
  amountInput: { flex: 1, fontSize: 22, fontWeight: '700', color: '#111827', paddingVertical: 10 },

  presetRow: { marginBottom: 4 },
  presetChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F3F4F6', marginRight: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  presetChipActive: { backgroundColor: '#059669', borderColor: '#059669' },
  presetText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  presetTextActive: { color: '#fff' },

  thresholdGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  thresholdChip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB' },
  thresholdChipActive: { backgroundColor: '#EFF6FF', borderColor: '#93C5FD' },
  thresholdText: { fontSize: 12, fontWeight: '500', color: '#6B7280' },
  thresholdTextActive: { color: '#1D4ED8', fontWeight: '600' },

  summaryCard: { backgroundColor: '#F0FDF4', borderRadius: 14, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: '#A7F3D0' },
  summaryTitle: { fontSize: 13, fontWeight: '700', color: '#065F46', marginBottom: 12 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  summaryText: { fontSize: 13, color: '#374151' },
  summaryBold: { fontWeight: '700', color: '#111827' },
  summaryDivider: { height: 1, backgroundColor: '#BBF7D0', marginVertical: 8 },
  summaryTotal: { fontSize: 13, color: '#374151' },

  infoBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#F9FAFB', borderRadius: 10, padding: 12, marginBottom: 12 },
  infoText: { flex: 1, fontSize: 12, color: '#9CA3AF', lineHeight: 17 },

  footer: { padding: 20, paddingBottom: 32, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  saveBtn: { backgroundColor: '#059669', borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
