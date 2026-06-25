import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  useWindowDimensions,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import {
  ChevronDown,
  Check,
  Upload,
  FileText,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react-native';
import OnboardingShell, { OnboardingButton, OnboardingInput } from '@/components/onboarding/OnboardingShell';
import { useOnboardingNav } from '@/hooks/useOnboardingNav';
import { colors } from '@/theme/colors';

const INSURERS = [
  'Leadway Assurance',
  'AXA Mansard',
  'Sovereign Trust',
  'AIICO Insurance',
  'NICON Insurance',
  'NEM Insurance',
  'Others',
];

const MIN_COVERAGE = 5_000_000;

export default function LogisticsInsuranceScreen() {
  const { goNext, goBack, step, total } = useOnboardingNav();
  const { width } = useWindowDimensions();
  const hp = Math.max(20, width * 0.06);

  const [policyRef, setPolicyRef] = useState('');
  const [insurer, setInsurer] = useState('');
  const [insurerOpen, setInsurerOpen] = useState(false);
  const [otherInsurer, setOtherInsurer] = useState('');
  const [coverageAmount, setCoverageAmount] = useState('');
  const [coverageError, setCoverageError] = useState('');
  const [document, setDocument] = useState<{ name: string; size: string } | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleCoverageChange = (value: string) => {
    const digits = value.replace(/\D/g, '');
    setCoverageAmount(digits);
    const amount = parseInt(digits, 10);
    if (digits.length > 0 && amount < MIN_COVERAGE) {
      setCoverageError(`Minimum coverage required: ₦${MIN_COVERAGE.toLocaleString()}`);
    } else {
      setCoverageError('');
    }
  };

  const formatCurrency = (value: string) => {
    const num = parseInt(value, 10);
    if (isNaN(num)) return '';
    return `₦${num.toLocaleString()}`;
  };

  const handleUploadDocument = () => {
    setUploading(true);
    setTimeout(() => {
      setUploading(false);
      setDocument({
        name: 'GIT_insurance_policy.pdf',
        size: '3.1 MB',
      });
    }, 1500);
  };

  const coverageNum = parseInt(coverageAmount, 10) || 0;
  const isCoverageValid = coverageNum >= MIN_COVERAGE;
  const isInsurerValid = insurer.length > 0 && (insurer !== 'Others' || otherInsurer.trim().length > 0);
  const isFormValid =
    policyRef.trim().length > 0 &&
    isInsurerValid &&
    isCoverageValid &&
    document !== null;

  return (
    <OnboardingShell
      currentStep={step}
      totalSteps={total}
      title="Insurance Details"
      subtitle="Goods-in-Transit (GIT) insurance is mandatory. Provide your policy details."
      onBack={goBack}
      footer={
        <OnboardingButton
          title="Continue"
          onPress={() => goNext({ policyRef, insurer: insurer === 'Others' ? otherInsurer : insurer, coverageAmount, insuranceDocument: document })}
          disabled={!isFormValid}
        />
      }
    >
      {/* Minimum Coverage Notice */}
      <View style={styles.noticeCard}>
        <ShieldCheck size={20} color={colors.ventureroot.green} />
        <View className="flex-1 ml-3">
          <Text style={styles.noticeTitle}>Minimum Coverage Requirement</Text>
          <Text style={styles.noticeText}>
            All logistics partners must maintain a minimum GIT insurance coverage
            of {'₦'}5,000,000 to operate on the VentureRoot platform.
          </Text>
        </View>
      </View>

      {/* Policy Reference */}
      <OnboardingInput
        label="GIT INSURANCE POLICY REFERENCE NUMBER"
        value={policyRef}
        onChangeText={setPolicyRef}
        placeholder="e.g. GIT/2024/001234"
        helper="Your Goods-in-Transit insurance policy number"
        autoCapitalize="characters"
      />

      {/* Insurer Dropdown */}
      <View style={styles.fieldWrap}>
        <Text style={styles.label}>INSURANCE PROVIDER</Text>
        <TouchableOpacity
          style={styles.dropdown}
          onPress={() => setInsurerOpen(!insurerOpen)}
          activeOpacity={0.7}
          accessibilityRole="button"
        >
          <Text style={insurer ? styles.dropdownText : styles.dropdownPlaceholder}>
            {insurer || 'Select your insurer'}
          </Text>
          <ChevronDown size={18} color="#94A3B8" />
        </TouchableOpacity>
        {insurerOpen && (
          <View style={styles.dropdownList}>
            {INSURERS.map((ins) => (
              <TouchableOpacity
                key={ins}
                style={[styles.dropdownItem, insurer === ins && styles.dropdownItemActive]}
                onPress={() => {
                  setInsurer(ins);
                  setInsurerOpen(false);
                  if (ins !== 'Others') setOtherInsurer('');
                }}
              >
                <Text
                  style={[styles.dropdownItemText, insurer === ins && styles.dropdownItemTextActive]}
                >
                  {ins}
                </Text>
                {insurer === ins && <Check size={16} color={colors.ventureroot.green} />}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Other Insurer Name */}
      {insurer === 'Others' && (
        <OnboardingInput
          label="INSURANCE COMPANY NAME"
          value={otherInsurer}
          onChangeText={setOtherInsurer}
          placeholder="Enter insurer name"
          autoCapitalize="words"
        />
      )}

      {/* Coverage Amount */}
      <OnboardingInput
        label="COVERAGE AMOUNT"
        value={coverageAmount}
        onChangeText={handleCoverageChange}
        placeholder="e.g. 10000000"
        error={coverageError}
        helper={
          coverageAmount.length > 0
            ? `Coverage: ${formatCurrency(coverageAmount)}`
            : `Minimum: ₦${MIN_COVERAGE.toLocaleString()}`
        }
        keyboardType="number-pad"
      />

      {isCoverageValid && (
        <View style={styles.coverageValid}>
          <Check size={14} color="#10B981" />
          <Text style={styles.coverageValidText}>
            Coverage of {formatCurrency(coverageAmount)} meets the minimum requirement
          </Text>
        </View>
      )}

      {/* Insurance Document Upload */}
      <View style={styles.uploadSection}>
        <Text style={styles.label}>INSURANCE DOCUMENT (PDF)</Text>
        <Text style={styles.uploadHelper}>
          Upload a copy of your GIT insurance certificate or policy document.
        </Text>

        {!document ? (
          <TouchableOpacity
            style={styles.uploadArea}
            onPress={handleUploadDocument}
            disabled={uploading}
            activeOpacity={0.7}
            accessibilityRole="button"
          >
            {uploading ? (
              <ActivityIndicator size="small" color={colors.ventureroot.green} />
            ) : (
              <Upload size={28} color={colors.ventureroot.green} />
            )}
            <Text style={styles.uploadText}>
              {uploading ? 'Uploading...' : 'Select PDF Document'}
            </Text>
            <Text style={styles.uploadHint}>Maximum file size: 10MB</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.uploadedCard}>
            <View className="flex-row items-center flex-1">
              <FileText size={20} color={colors.ventureroot.green} />
              <View className="ml-3 flex-1">
                <Text style={styles.uploadedName}>{document.name}</Text>
                <Text style={styles.uploadedSize}>{document.size}</Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => setDocument(null)}
              style={styles.removeButton}
              accessibilityLabel="Remove document"
              accessibilityRole="button"
            >
              <Text style={styles.removeText}>Remove</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Warning about insurance lapse */}
      <View style={styles.warningCard}>
        <AlertTriangle size={16} color="#F59E0B" />
        <Text style={styles.warningText}>
          GIT insurance must remain active at all times. If your policy lapses,
          your logistics partner account will be automatically suspended until
          renewed coverage is provided.
        </Text>
      </View>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  noticeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#065F46',
    marginBottom: 4,
  },
  noticeText: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 18,
  },
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
    maxHeight: 250,
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
  coverageValid: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 16,
    marginTop: -8,
  },
  coverageValidText: {
    fontSize: 12,
    color: '#065F46',
    fontWeight: '600',
    marginLeft: 6,
  },
  uploadSection: {
    marginBottom: 16,
  },
  uploadHelper: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 17,
    marginBottom: 10,
  },
  uploadArea: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 28,
    backgroundColor: '#FAFBFC',
    minHeight: 44,
  },
  uploadText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#004D2C',
    marginTop: 10,
  },
  uploadHint: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 4,
  },
  uploadedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 12,
    padding: 14,
  },
  uploadedName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  uploadedSize: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  removeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#FEE2E2',
    minHeight: 44,
    justifyContent: 'center',
  },
  removeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    color: '#92400E',
    lineHeight: 18,
    marginLeft: 10,
  },
});
