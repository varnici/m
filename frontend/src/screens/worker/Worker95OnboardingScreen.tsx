// @ts-nocheck
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  User,
  Briefcase,
  CreditCard,
  Calendar,
  Building2,
  CheckCircle2,
  Copy,
  ChevronRight,
  ChevronLeft,
  Landmark,
  Lock,
} from 'lucide-react-native';
import { Clipboard } from 'react-native';
import type { RootStackScreenProps } from '@/navigation/types';

// ---------------------------------------------------------------------------
// Step definitions
// ---------------------------------------------------------------------------
const STEPS = [
  { id: 1, label: 'Personal Info', icon: User },
  { id: 2, label: 'Employment', icon: Briefcase },
  { id: 3, label: 'Verification', icon: CreditCard },
  { id: 4, label: 'Your Account', icon: Landmark },
];

const SALARY_DAYS = Array.from({ length: 28 }, (_, i) => i + 1);
const BANKS = ['Access Bank', 'GTBank', 'First Bank', 'Zenith Bank', 'UBA', 'Stanbic IBTC', 'Opay', 'Kuda Bank'];

function generateVirtualAccount(): string {
  return `VR${Math.floor(1000000000 + Math.random() * 9000000000)}`;
}

// ---------------------------------------------------------------------------
// Step Indicator
// ---------------------------------------------------------------------------
function StepIndicator({ current }: { current: number }) {
  return (
    <View style={styles.stepRow}>
      {STEPS.map((s, idx) => {
        const done = current > s.id;
        const active = current === s.id;
        return (
          <React.Fragment key={s.id}>
            <View style={styles.stepItem}>
              <View style={[styles.stepDot, done && styles.stepDotDone, active && styles.stepDotActive]}>
                {done ? (
                  <CheckCircle2 size={14} color="#fff" />
                ) : (
                  <Text style={[styles.stepNum, active && { color: '#fff' }]}>{s.id}</Text>
                )}
              </View>
              <Text style={[styles.stepLabel, active && styles.stepLabelActive]}>{s.label}</Text>
            </View>
            {idx < STEPS.length - 1 && (
              <View style={[styles.stepLine, done && styles.stepLineDone]} />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------
export default function Worker95OnboardingScreen({
  navigation,
}: RootStackScreenProps<'Worker95Onboarding'>) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [virtualAccount, setVirtualAccount] = useState<string | null>(null);

  // Form state
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [employer, setEmployer] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [salaryDay, setSalaryDay] = useState<number | null>(null);
  const [salaryBank, setSalaryBank] = useState('');
  const [bvn, setBvn] = useState('');
  const [nin, setNin] = useState('');

  const scrollRef = useRef<ScrollView>(null);

  const canProceed = (): boolean => {
    if (step === 1) return fullName.trim().length > 1 && phone.trim().length >= 10;
    if (step === 2) return employer.trim().length > 1 && salaryDay !== null;
    if (step === 3) return bvn.trim().length === 11;
    return true;
  };

  const handleNext = async () => {
    if (!canProceed()) {
      Alert.alert('Incomplete', 'Please fill in all required fields to continue.');
      return;
    }
    if (step === 3) {
      setLoading(true);
      // Simulate BVN verification + virtual account creation
      await new Promise((r) => setTimeout(r, 1500));
      setVirtualAccount(generateVirtualAccount());
      setLoading(false);
    }
    setStep((s) => s + 1);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const handleBack = () => {
    if (step === 1) { navigation.goBack(); return; }
    setStep((s) => s - 1);
  };

  const copyAccount = () => {
    if (virtualAccount) {
      Clipboard.setString(virtualAccount);
      Alert.alert('Copied', 'Virtual account number copied.');
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
            <ChevronLeft size={22} color="#111827" />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Worker Profile Setup</Text>
            <Text style={styles.headerSub}>Step {step} of {STEPS.length}</Text>
          </View>
        </View>

        <ScrollView ref={scrollRef} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <StepIndicator current={step} />

          {/* ── STEP 1: Personal Info ── */}
          {step === 1 && (
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Tell us about yourself</Text>
              <Text style={styles.stepDesc}>Your identity is kept private and only used for compliance.</Text>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Full Legal Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Adaeze Okonkwo"
                  value={fullName}
                  onChangeText={setFullName}
                  autoCapitalize="words"
                />
              </View>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Phone Number *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="08012345678"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  maxLength={11}
                />
              </View>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Email Address</Text>
                <TextInput
                  style={styles.input}
                  placeholder="adaeze@company.com"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.privacyNote}>
                <Lock size={13} color="#6B7280" />
                <Text style={styles.privacyText}>
                  Your data is encrypted and never shared with third parties without your consent.
                </Text>
              </View>
            </View>
          )}

          {/* ── STEP 2: Employment ── */}
          {step === 2 && (
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Employment details</Text>
              <Text style={styles.stepDesc}>This helps us set up your salary automation correctly.</Text>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Employer / Company Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Lagos State Government"
                  value={employer}
                  onChangeText={setEmployer}
                  autoCapitalize="words"
                />
              </View>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Job Title</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Senior Accountant"
                  value={jobTitle}
                  onChangeText={setJobTitle}
                  autoCapitalize="words"
                />
              </View>

              <Text style={styles.fieldLabel}>Salary Credit Day *</Text>
              <Text style={styles.fieldHint}>Which day of the month is your salary paid?</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayPicker}>
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

              <Text style={[styles.fieldLabel, { marginTop: 20 }]}>Salary Bank</Text>
              <View style={styles.bankGrid}>
                {BANKS.map((b) => (
                  <TouchableOpacity
                    key={b}
                    style={[styles.bankChip, salaryBank === b && styles.bankChipActive]}
                    onPress={() => setSalaryBank(b)}
                  >
                    <Text style={[styles.bankChipText, salaryBank === b && styles.bankChipTextActive]}>
                      {b}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* ── STEP 3: BVN Verification ── */}
          {step === 3 && (
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Identity verification</Text>
              <Text style={styles.stepDesc}>
                Your BVN links your bank accounts and enables automated salary coordination. Required by CBN regulations.
              </Text>

              <View style={styles.bvnInfoCard}>
                <CreditCard size={20} color="#059669" />
                <Text style={styles.bvnInfoText}>
                  Your BVN is an 11-digit number. Dial *565*0# on any registered line to retrieve it.
                </Text>
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Bank Verification Number (BVN) *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="22123456789"
                  value={bvn}
                  onChangeText={setBvn}
                  keyboardType="number-pad"
                  maxLength={11}
                  secureTextEntry
                />
                {bvn.length > 0 && bvn.length < 11 && (
                  <Text style={styles.fieldError}>{11 - bvn.length} more digits needed</Text>
                )}
                {bvn.length === 11 && (
                  <Text style={styles.fieldSuccess}>BVN looks valid ✓</Text>
                )}
              </View>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>National Identity Number (NIN) — Optional</Text>
                <TextInput
                  style={styles.input}
                  placeholder="12345678901"
                  value={nin}
                  onChangeText={setNin}
                  keyboardType="number-pad"
                  maxLength={11}
                />
              </View>

              <View style={styles.privacyNote}>
                <Lock size={13} color="#6B7280" />
                <Text style={styles.privacyText}>
                  BVN data is processed securely and never stored in plain text. Verification happens via NIBSS-licensed channels.
                </Text>
              </View>
            </View>
          )}

          {/* ── STEP 4: Virtual Account Reveal ── */}
          {step === 4 && (
            <View style={styles.stepContent}>
              <View style={styles.successIcon}>
                <CheckCircle2 size={48} color="#059669" />
              </View>
              <Text style={styles.stepTitle}>You're all set, {fullName.split(' ')[0]}!</Text>
              <Text style={styles.stepDesc}>
                Your worker profile is live. A dedicated virtual account has been created for funding your portfolio.
              </Text>

              {/* Virtual Account Card */}
              <LinearGradient colors={['#064E3B', '#059669']} style={styles.accountRevealCard}>
                <View style={styles.accountRevealTop}>
                  <Building2 size={18} color="rgba(255,255,255,0.8)" />
                  <Text style={styles.accountRevealBank}>VentureRoot MFB</Text>
                </View>
                <Text style={styles.accountRevealLabel}>Your Virtual Account Number</Text>
                <View style={styles.accountRevealRow}>
                  <Text style={styles.accountRevealNumber}>{virtualAccount}</Text>
                  <TouchableOpacity onPress={copyAccount} style={styles.copyBtn}>
                    <Copy size={16} color="#fff" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.accountRevealName}>{fullName.toUpperCase()}</Text>
                <Text style={styles.accountRevealHint}>
                  Transfer any amount here to instantly fund your investments or savings target.
                </Text>
              </LinearGradient>

              {/* Summary */}
              <View style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>Profile Summary</Text>
                {[
                  { label: 'Name', value: fullName },
                  { label: 'Employer', value: employer || '—' },
                  { label: 'Salary Day', value: salaryDay ? `${salaryDay}th of every month` : '—' },
                  { label: 'BVN Status', value: '✓ Verified' },
                ].map((item) => (
                  <View key={item.label} style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>{item.label}</Text>
                    <Text style={styles.summaryValue}>{item.value}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={{ height: 120 }} />
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          {step < 4 ? (
            <TouchableOpacity
              style={[styles.nextBtn, !canProceed() && styles.nextBtnDisabled]}
              onPress={handleNext}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Text style={styles.nextBtnText}>
                    {step === 3 ? 'Verify & Generate Account' : 'Continue'}
                  </Text>
                  <ChevronRight size={18} color="#fff" />
                </>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.nextBtn}
              onPress={() => navigation.navigate('Worker95Dashboard')}
            >
              <Text style={styles.nextBtnText}>Go to My Dashboard</Text>
              <ChevronRight size={18} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F9FAFB' },
  scroll: { paddingHorizontal: 20, paddingTop: 8 },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
  },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  headerSub: { fontSize: 12, color: '#9CA3AF' },

  stepRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 20 },
  stepItem: { alignItems: 'center', gap: 6 },
  stepDot: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#F3F4F6', borderWidth: 2, borderColor: '#E5E7EB',
    alignItems: 'center', justifyContent: 'center',
  },
  stepDotActive: { backgroundColor: '#059669', borderColor: '#059669' },
  stepDotDone: { backgroundColor: '#059669', borderColor: '#059669' },
  stepNum: { fontSize: 13, fontWeight: '700', color: '#9CA3AF' },
  stepLabel: { fontSize: 10, color: '#9CA3AF', fontWeight: '500', textAlign: 'center', maxWidth: 56 },
  stepLabelActive: { color: '#059669', fontWeight: '700' },
  stepLine: { flex: 1, height: 2, backgroundColor: '#E5E7EB', marginTop: -14 },
  stepLineDone: { backgroundColor: '#059669' },

  stepContent: {},
  stepTitle: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 6 },
  stepDesc: { fontSize: 14, color: '#6B7280', lineHeight: 21, marginBottom: 24 },

  field: { marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  fieldHint: { fontSize: 12, color: '#9CA3AF', marginBottom: 10 },
  fieldError: { fontSize: 12, color: '#EF4444', marginTop: 4 },
  fieldSuccess: { fontSize: 12, color: '#059669', marginTop: 4, fontWeight: '600' },
  input: {
    backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, color: '#111827', borderWidth: 1, borderColor: '#E5E7EB',
  },

  dayPicker: { marginBottom: 4 },
  dayChip: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', marginRight: 8,
  },
  dayChipActive: { backgroundColor: '#059669' },
  dayChipText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  dayChipTextActive: { color: '#fff' },

  bankGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  bankChip: {
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10,
    backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB',
  },
  bankChipActive: { backgroundColor: '#064E3B', borderColor: '#064E3B' },
  bankChipText: { fontSize: 13, fontWeight: '500', color: '#374151' },
  bankChipTextActive: { color: '#fff', fontWeight: '600' },

  bvnInfoCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: '#F0FDF4', borderRadius: 12, padding: 14,
    marginBottom: 20, borderWidth: 1, borderColor: '#A7F3D0',
  },
  bvnInfoText: { flex: 1, fontSize: 13, color: '#065F46', lineHeight: 19 },

  privacyNote: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#F9FAFB', borderRadius: 10, padding: 12, marginTop: 8,
  },
  privacyText: { flex: 1, fontSize: 12, color: '#6B7280', lineHeight: 18 },

  successIcon: { alignItems: 'center', marginBottom: 16, marginTop: 8 },

  accountRevealCard: { borderRadius: 20, padding: 22, marginBottom: 20 },
  accountRevealTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  accountRevealBank: { fontSize: 14, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  accountRevealLabel: { fontSize: 11, color: 'rgba(255,255,255,0.65)', marginBottom: 4 },
  accountRevealRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  accountRevealNumber: { fontSize: 22, fontWeight: '800', color: '#fff', letterSpacing: 1 },
  copyBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  accountRevealName: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 12 },
  accountRevealHint: { fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 17 },

  summaryCard: { backgroundColor: '#fff', borderRadius: 16, padding: 18, borderWidth: 1, borderColor: '#E5E7EB' },
  summaryTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 14 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  summaryLabel: { fontSize: 13, color: '#9CA3AF' },
  summaryValue: { fontSize: 13, fontWeight: '600', color: '#111827' },

  footer: {
    padding: 20, paddingBottom: 32, backgroundColor: '#fff',
    borderTopWidth: 1, borderTopColor: '#E5E7EB',
  },
  nextBtn: {
    backgroundColor: '#059669', borderRadius: 16, paddingVertical: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  nextBtnDisabled: { opacity: 0.5 },
  nextBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
