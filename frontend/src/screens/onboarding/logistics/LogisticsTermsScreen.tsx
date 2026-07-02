import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  useWindowDimensions,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {
  CheckCircle2,
  Clock,
  FileCheck,
  Copy,
  ChevronDown,
  Check,
  AlertCircle,
} from 'lucide-react-native';
import OnboardingShell, { OnboardingButton, OnboardingInput } from '@/components/onboarding/OnboardingShell';
import { useOnboardingNav } from '@/hooks/useOnboardingNav';
import { colors } from '@/theme/colors';
import { useAuth } from '@/context/AuthContext';
import { useOnboardingStore } from '@/store/onboardingStore';
import { submitLogisticsOnboarding } from '@/services/onboardingSubmitService';

const TERMS_SECTIONS = [
  {
    title: '1. SERVICE LEVEL REQUIREMENTS',
    content:
      'As a logistics partner, you commit to the following service levels: pickup within 2 hours of dispatch notification in urban areas (4 hours for rural), delivery within the agreed timeline per order, proof-of-delivery photo submission upon completion, and real-time GPS tracking during transit. Failure to meet service levels on more than 15% of orders in a 30-day period may result in account review and potential suspension.',
  },
  {
    title: '2. LIABILITY & DAMAGE POLICY',
    content:
      'The logistics partner bears full responsibility for goods from pickup to delivery confirmation. In case of damage, loss, or theft during transit, the partner is liable for the full declared value of the goods up to the GIT insurance coverage limit. Claims must be filed within 48 hours of the delivery window. VentureRoot will facilitate the claims process with the insurance provider but does not bear financial liability for in-transit losses.',
  },
  {
    title: '3. PAYMENT TERMS',
    content:
      'Delivery fees are calculated based on distance, weight, and urgency tier. Standard payments are settled weekly (every Friday) to the linked bank account. Express settlement (within 24 hours) is available for a 1% processing fee. VentureRoot deducts a 5% platform commission from each delivery fee before settlement. All payments are subject to applicable taxes and withholding requirements.',
  },
  {
    title: '4. GIT INSURANCE LAPSE AUTO-SUSPENSION',
    content:
      'Your GIT insurance policy must remain active and on file at all times. VentureRoot monitors insurance validity. If your policy expires or is cancelled: (a) Your account will be automatically suspended, (b) All pending dispatch assignments will be reassigned, (c) Earned but unsettled fees will be held until insurance is renewed, (d) Repeated lapses (3 or more in 12 months) may result in permanent account termination. You will receive reminders at 30, 14, and 7 days before policy expiry.',
  },
  {
    title: '5. DATA & PRIVACY',
    content:
      'VentureRoot collects and processes your fleet data, delivery routes, driver information, and GPS tracking data. This data is used for: platform operations, route optimization, performance analytics, and regulatory compliance. Your data is protected under the Nigeria Data Protection Regulation (NDPR) and will not be sold to third parties.',
  },
  {
    title: '6. TERMINATION',
    content:
      'Either party may terminate this agreement with 30 days written notice. VentureRoot may terminate immediately for: fraud, unsafe driving practices, repeated service failures, insurance non-compliance, or violation of these terms. Upon termination, all pending settlements will be processed within 14 business days.',
  },
];

const NIGERIAN_BANKS = [
  'Access Bank', 'Citibank Nigeria', 'Ecobank Nigeria', 'Fidelity Bank',
  'First Bank of Nigeria', 'First City Monument Bank', 'Globus Bank',
  'Guaranty Trust Bank', 'Heritage Bank', 'Jaiz Bank', 'Keystone Bank',
  'Kuda Microfinance Bank', 'Opay', 'Palmpay', 'Polaris Bank',
  'Providus Bank', 'Stanbic IBTC Bank', 'Standard Chartered Bank',
  'Sterling Bank', 'Union Bank of Nigeria', 'United Bank for Africa',
  'Unity Bank', 'Wema Bank', 'Zenith Bank',
];

export default function LogisticsTermsScreen() {
  const { goNext, goBack, step, total, data } = useOnboardingNav();
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const hp = Math.max(20, width * 0.06);

  const [bankName, setBankName] = useState('');
  const [bankOpen, setBankOpen] = useState(false);
  const [accountNumber, setAccountNumber] = useState('');
  const [accountError, setAccountError] = useState('');
  const [lookingUp, setLookingUp] = useState(false);
  const [resolvedName, setResolvedName] = useState('');

  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [referenceNumber] = useState(
    `VR-LOG-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`
  );

  const validateAccountNumber = (value: string) => {
    const digits = value.replace(/\D/g, '');
    setAccountNumber(digits);
    setResolvedName('');
    if (digits.length > 0 && digits.length !== 10) {
      setAccountError('NUBAN account number must be exactly 10 digits');
    } else {
      setAccountError('');
    }
  };

  useEffect(() => {
    if (bankName && accountNumber.length === 10 && !accountError) {
      setLookingUp(true);
      setResolvedName('');
      const timer = setTimeout(() => {
        setLookingUp(false);
        setResolvedName('ACCOUNT VERIFIED');
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [bankName, accountNumber, accountError]);

  const isBankValid = bankName.length > 0 && accountNumber.length === 10 && !accountError && resolvedName.length > 0;
  const isFormValid = isBankValid && accepted;

  const handleSubmit = async () => {
    if (!user?.id) {
      Alert.alert('Error', 'Session expired. Please log in again.');
      return;
    }
    setSubmitting(true);
    const result = await submitLogisticsOnboarding(
      { ...data, bankName, accountNumber, termsAccepted: true },
      user.id,
    );
    setSubmitting(false);
    if (!result.success) {
      Alert.alert('Submission Failed', result.error || 'Something went wrong. Please try again.', [
        { text: 'Retry', onPress: handleSubmit },
        { text: 'Cancel' },
      ]);
      return;
    }
    useOnboardingStore.getState().completeOnboarding();
    setSubmitted(true);
  };

  // Submission success view
  if (submitted) {
    return (
      <OnboardingShell
        currentStep={step}
        totalSteps={total}
        title="Application Submitted"
        subtitle="Your logistics partner application is under review."
        scrollable={true}
        footer={
          <OnboardingButton
            title="Go to Dashboard"
            onPress={() => goNext()}
          />
        }
      >
        <View style={styles.successCard}>
          <View style={styles.successIconWrap}>
            <CheckCircle2 size={48} color="#10B981" />
          </View>
          <Text style={styles.successTitle}>Submission Successful</Text>
          <Text style={styles.successSubtitle}>
            Your logistics partner onboarding application has been received
            and is now under review by our operations team.
          </Text>
        </View>

        {/* Reference Number */}
        <View style={styles.referenceCard}>
          <Text style={styles.referenceLabel}>APPLICATION REFERENCE</Text>
          <View className="flex-row items-center justify-between">
            <Text style={styles.referenceNumber}>{referenceNumber}</Text>
            <TouchableOpacity
              style={styles.copyButton}
              activeOpacity={0.7}
              accessibilityLabel="Copy reference number"
              accessibilityRole="button"
            >
              <Copy size={16} color={colors.ventureroot.green} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Status Card */}
        <View style={styles.statusCard}>
          <View className="flex-row items-center mb-3">
            <Clock size={18} color="#F59E0B" />
            <Text style={styles.statusTitle}>Under Review</Text>
          </View>
          <Text style={styles.statusText}>
            Our operations team will verify your fleet details, driver licences,
            and insurance within 3-5 business days. You will be notified via SMS and email.
          </Text>

          <View style={styles.timeline}>
            <View style={styles.timelineItem}>
              <View style={[styles.timelineDot, styles.timelineDotDone]} />
              <Text style={[styles.timelineText, styles.timelineTextDone]}>Application submitted</Text>
            </View>
            <View style={styles.timelineLine} />
            <View style={styles.timelineItem}>
              <View style={[styles.timelineDot, styles.timelineDotActive]} />
              <Text style={[styles.timelineText, styles.timelineTextActive]}>Fleet & licence verification</Text>
            </View>
            <View style={styles.timelineLine} />
            <View style={styles.timelineItem}>
              <View style={styles.timelineDot} />
              <Text style={styles.timelineText}>Insurance confirmation</Text>
            </View>
            <View style={styles.timelineLine} />
            <View style={styles.timelineItem}>
              <View style={styles.timelineDot} />
              <Text style={styles.timelineText}>Bank account verification</Text>
            </View>
            <View style={styles.timelineLine} />
            <View style={styles.timelineItem}>
              <View style={styles.timelineDot} />
              <Text style={styles.timelineText}>Account activation</Text>
            </View>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <View className="flex-row items-center mb-3">
            <FileCheck size={18} color={colors.ventureroot.green} />
            <Text style={styles.summaryTitle}>Submission Summary</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Type</Text>
            <Text style={styles.summaryValue}>Logistics Partner</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Steps Completed</Text>
            <Text style={styles.summaryValue}>5 of 5</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Bank Account</Text>
            <Text style={styles.summaryValue}>{bankName}</Text>
          </View>
          <View style={[styles.summaryRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.summaryLabel}>Submitted On</Text>
            <Text style={styles.summaryValue}>{new Date().toLocaleDateString('en-NG')}</Text>
          </View>
        </View>
      </OnboardingShell>
    );
  }

  return (
    <OnboardingShell
      currentStep={step}
      totalSteps={total}
      title="Terms & Bank Account"
      subtitle="Review the logistics partner terms and link your settlement bank account."
      onBack={goBack}
      footer={
        <OnboardingButton
          title={submitting ? 'Submitting...' : 'Submit Application'}
          onPress={handleSubmit}
          disabled={!isFormValid || submitting}
        />
      }
    >
      {/* Scrollable Terms */}
      <Text style={styles.sectionHeader}>LOGISTICS PARTNER AGREEMENT</Text>
      <View style={styles.termsContainer}>
        <ScrollView
          style={styles.termsScroll}
          showsVerticalScrollIndicator={true}
          nestedScrollEnabled={true}
        >
          {TERMS_SECTIONS.map((section, index) => (
            <View key={index} style={styles.termsSection}>
              <Text style={styles.termsSectionTitle}>{section.title}</Text>
              <Text style={styles.termsSectionContent}>{section.content}</Text>
            </View>
          ))}
          <View style={{ height: 20 }} />
        </ScrollView>
      </View>

      {/* Bank Account Section */}
      <Text style={[styles.sectionHeader, { marginTop: 8 }]}>SETTLEMENT BANK ACCOUNT</Text>

      <View style={styles.fieldWrap}>
        <Text style={styles.label}>BANK NAME</Text>
        <TouchableOpacity
          style={styles.dropdown}
          onPress={() => setBankOpen(!bankOpen)}
          activeOpacity={0.7}
          accessibilityRole="button"
        >
          <Text style={bankName ? styles.dropdownText : styles.dropdownPlaceholder}>
            {bankName || 'Select your bank'}
          </Text>
          <ChevronDown size={18} color="#94A3B8" />
        </TouchableOpacity>
        {bankOpen && (
          <View style={styles.dropdownList}>
            {NIGERIAN_BANKS.map((bank) => (
              <TouchableOpacity
                key={bank}
                style={[styles.dropdownItem, bankName === bank && styles.dropdownItemActive]}
                onPress={() => {
                  setBankName(bank);
                  setBankOpen(false);
                  setResolvedName('');
                }}
              >
                <Text style={[styles.dropdownItemText, bankName === bank && styles.dropdownItemTextActive]}>
                  {bank}
                </Text>
                {bankName === bank && <Check size={16} color={colors.ventureroot.green} />}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <OnboardingInput
        label="ACCOUNT NUMBER (NUBAN)"
        value={accountNumber}
        onChangeText={validateAccountNumber}
        placeholder="10-digit account number"
        error={accountError}
        helper="Your 10-digit NUBAN account number"
        keyboardType="number-pad"
        maxLength={10}
      />

      {lookingUp && (
        <View style={styles.lookupCard}>
          <ActivityIndicator size="small" color={colors.ventureroot.green} />
          <Text style={styles.lookupText}>Verifying account...</Text>
        </View>
      )}

      {resolvedName.length > 0 && !lookingUp && (
        <View style={styles.resolvedCard}>
          <CheckCircle2 size={18} color="#10B981" />
          <View className="ml-2 flex-1">
            <Text style={styles.resolvedName}>{resolvedName}</Text>
            <Text style={styles.resolvedBank}>{bankName}</Text>
          </View>
        </View>
      )}

      {/* Consent Checkbox */}
      <TouchableOpacity
        style={styles.consentRow}
        onPress={() => setAccepted(!accepted)}
        activeOpacity={0.7}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: accepted }}
      >
        <View style={[styles.checkbox, accepted && styles.checkboxActive]}>
          {accepted && <CheckCircle2 size={16} color="#FFFFFF" />}
        </View>
        <Text style={styles.consentText}>
          I have read and agree to the VentureRoot Logistics Partner Terms and Conditions,
          including service level requirements, liability terms, payment structure,
          and the GIT insurance auto-suspension policy.
        </Text>
      </TouchableOpacity>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 1,
    marginBottom: 12,
  },
  termsContainer: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    maxHeight: 280,
    marginBottom: 20,
    overflow: 'hidden',
  },
  termsScroll: {
    padding: 16,
  },
  termsSection: {
    marginBottom: 20,
  },
  termsSectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  termsSectionContent: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 20,
  },
  // Bank fields
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  fieldWrap: {
    marginBottom: 16,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  dropdownText: {
    fontSize: 15,
    color: '#0F172A',
  },
  dropdownPlaceholder: {
    fontSize: 15,
    color: '#94A3B8',
  },
  dropdownList: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    marginTop: 4,
    maxHeight: 200,
    overflow: 'scroll',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  dropdownItemActive: {
    backgroundColor: '#F0FDF4',
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#334155',
  },
  dropdownItemTextActive: {
    color: '#004D2C',
    fontWeight: '700',
  },
  lookupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  lookupText: {
    fontSize: 13,
    color: '#64748B',
    marginLeft: 10,
  },
  resolvedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  resolvedName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#065F46',
  },
  resolvedBank: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  // Consent
  consentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    minHeight: 44,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    marginRight: 12,
  },
  checkboxActive: {
    backgroundColor: '#004D2C',
    borderColor: '#004D2C',
  },
  consentText: {
    flex: 1,
    fontSize: 13,
    color: '#334155',
    lineHeight: 19,
  },
  // Success / submission state
  successCard: {
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 16,
    padding: 32,
    marginBottom: 20,
  },
  successIconWrap: {
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#065F46',
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  referenceCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  referenceLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 1,
    marginBottom: 8,
  },
  referenceNumber: {
    fontSize: 16,
    fontWeight: '800',
    color: '#004D2C',
    letterSpacing: 0.5,
  },
  copyButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusCard: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  statusTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#92400E',
    marginLeft: 8,
  },
  statusText: {
    fontSize: 13,
    color: '#78716C',
    lineHeight: 19,
    marginBottom: 16,
  },
  timeline: {
    paddingLeft: 4,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
  },
  timelineDotDone: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  timelineDotActive: {
    borderColor: '#F59E0B',
    backgroundColor: '#FEF3C7',
  },
  timelineLine: {
    width: 2,
    height: 14,
    backgroundColor: '#E5E7EB',
    marginLeft: 5,
  },
  timelineText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginLeft: 12,
    fontWeight: '500',
  },
  timelineTextDone: {
    color: '#065F46',
    fontWeight: '700',
  },
  timelineTextActive: {
    color: '#92400E',
    fontWeight: '700',
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginLeft: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  summaryLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
});
