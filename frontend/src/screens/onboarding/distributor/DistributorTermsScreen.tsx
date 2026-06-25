import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  useWindowDimensions,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { CheckCircle2, Clock, FileCheck, Copy } from 'lucide-react-native';
import OnboardingShell, { OnboardingButton } from '@/components/onboarding/OnboardingShell';
import { useOnboardingNav } from '@/hooks/useOnboardingNav';
import { colors } from '@/theme/colors';

const TERMS_SECTIONS = [
  {
    title: '1. DATA SHARING & PRIVACY',
    content:
      'By registering as a distributor on VentureRoot, you authorize the platform to collect, store, and process your business data including but not limited to: company registration details, director information, financial records, warehouse locations, and product category data. Your data will be shared with verified retail partners only to facilitate order fulfillment. We will never sell your data to third parties without explicit consent. All data is encrypted using AES-256 standards and stored in compliance with the Nigeria Data Protection Regulation (NDPR).',
  },
  {
    title: '2. PAYMENT SETTLEMENT',
    content:
      'All payments for fulfilled orders will be settled to your linked current account within 3-5 business days of delivery confirmation by the retail partner. VentureRoot reserves the right to hold settlement in cases of: disputed deliveries, quality complaints from retail partners, or suspected fraudulent activity. You will be notified of any settlement holds within 24 hours.',
  },
  {
    title: '3. FEE STRUCTURE',
    content:
      'VentureRoot charges a platform facilitation fee of 2.5% on each completed transaction. This fee is automatically deducted from settlement amounts. Additional fees may apply for: premium placement in the distributor directory (1% surcharge), expedited settlement (0.5% processing fee), and insurance coverage for goods in transit. All fees are subject to applicable VAT at the prevailing rate.',
  },
  {
    title: '4. DISTRIBUTOR OBLIGATIONS',
    content:
      'As a registered distributor, you are obligated to: maintain accurate and current inventory levels on the platform, fulfill accepted orders within the agreed timeline, ensure product quality meets stated specifications, provide valid product expiry information where applicable, maintain adequate insurance coverage for warehoused goods, and respond to retail partner queries within 24 hours.',
  },
  {
    title: '5. PLATFORM RULES',
    content:
      'VentureRoot reserves the right to suspend or terminate distributor accounts for: repeated order cancellations (more than 3 in 30 days), consistent quality complaints, failure to maintain CAC registration, expired business permits, or violations of these terms. Suspended accounts may appeal within 14 days of suspension notice.',
  },
  {
    title: '6. DISPUTE RESOLUTION',
    content:
      'All disputes between distributors and retail partners shall first be resolved through the VentureRoot mediation process. If mediation fails, disputes will be escalated to arbitration in accordance with the Arbitration and Conciliation Act of Nigeria. The venue for arbitration shall be Lagos, Nigeria.',
  },
];

export default function DistributorTermsScreen() {
  const { goNext, goBack, step, total } = useOnboardingNav();
  const { width } = useWindowDimensions();
  const hp = Math.max(20, width * 0.06);

  const [accepted, setAccepted] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [referenceNumber] = useState(
    `VR-DIST-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`
  );

  const handleSubmit = () => {
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <OnboardingShell
        currentStep={step}
        totalSteps={total}
        title="Application Submitted"
        subtitle="Your distributor application is being reviewed by our team."
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
            Your distributor onboarding application has been received and is now under review.
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
            Our verification team will review your application within 2-3 business days.
            You will receive an SMS and email notification once your account is approved.
          </Text>

          <View style={styles.statusTimeline}>
            <View style={styles.timelineItem}>
              <View style={[styles.timelineDot, styles.timelineDotComplete]} />
              <Text style={[styles.timelineText, styles.timelineTextComplete]}>Application submitted</Text>
            </View>
            <View style={styles.timelineLine} />
            <View style={styles.timelineItem}>
              <View style={[styles.timelineDot, styles.timelineDotActive]} />
              <Text style={[styles.timelineText, styles.timelineTextActive]}>Document verification</Text>
            </View>
            <View style={styles.timelineLine} />
            <View style={styles.timelineItem}>
              <View style={styles.timelineDot} />
              <Text style={styles.timelineText}>CAC & bank confirmation</Text>
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
            <Text style={styles.summaryValue}>Distributor</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Steps Completed</Text>
            <Text style={styles.summaryValue}>5 of 5</Text>
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
      title="Terms & Conditions"
      subtitle="Please review and accept the distributor terms of service."
      onBack={goBack}
      footer={
        <OnboardingButton
          title="Submit Application"
          onPress={handleSubmit}
          disabled={!accepted}
        />
      }
    >
      {/* Scrollable Terms */}
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
          I have read and agree to the VentureRoot Distributor Terms and Conditions,
          including data sharing, payment settlement, and fee structure policies.
        </Text>
      </TouchableOpacity>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  termsContainer: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    maxHeight: 320,
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
  statusTimeline: {
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
  timelineDotComplete: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  timelineDotActive: {
    borderColor: '#F59E0B',
    backgroundColor: '#FEF3C7',
  },
  timelineLine: {
    width: 2,
    height: 16,
    backgroundColor: '#E5E7EB',
    marginLeft: 5,
  },
  timelineText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginLeft: 12,
    fontWeight: '500',
  },
  timelineTextComplete: {
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
