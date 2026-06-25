import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  useWindowDimensions,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { ChevronDown, Check, CheckCircle2, AlertCircle } from 'lucide-react-native';
import OnboardingShell, { OnboardingButton, OnboardingInput } from '@/components/onboarding/OnboardingShell';
import { useOnboardingNav } from '@/hooks/useOnboardingNav';
import { colors } from '@/theme/colors';

const NIGERIAN_BANKS = [
  'Access Bank',
  'Citibank Nigeria',
  'Ecobank Nigeria',
  'Fidelity Bank',
  'First Bank of Nigeria',
  'First City Monument Bank',
  'Globus Bank',
  'Guaranty Trust Bank',
  'Heritage Bank',
  'Jaiz Bank',
  'Keystone Bank',
  'Kuda Microfinance Bank',
  'Opay',
  'Palmpay',
  'Parallex Bank',
  'Polaris Bank',
  'Providus Bank',
  'Stanbic IBTC Bank',
  'Standard Chartered Bank',
  'Sterling Bank',
  'SunTrust Bank',
  'TAJBank',
  'Titan Trust Bank',
  'Union Bank of Nigeria',
  'United Bank for Africa',
  'Unity Bank',
  'VFD Microfinance Bank',
  'Wema Bank',
  'Zenith Bank',
];

const ACCOUNT_TYPES = ['Current', 'Savings'] as const;

export default function DistributorBankScreen() {
  const { goNext, goBack, step, total } = useOnboardingNav();
  const { width } = useWindowDimensions();
  const hp = Math.max(20, width * 0.06);

  const [bankName, setBankName] = useState('');
  const [bankOpen, setBankOpen] = useState(false);
  const [accountNumber, setAccountNumber] = useState('');
  const [accountError, setAccountError] = useState('');
  const [accountType, setAccountType] = useState<'Current' | 'Savings' | ''>('');
  const [accountTypeWarning, setAccountTypeWarning] = useState('');

  // Name lookup
  const [lookingUp, setLookingUp] = useState(false);
  const [resolvedName, setResolvedName] = useState('');

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

  const handleAccountTypeSelect = (type: 'Current' | 'Savings') => {
    setAccountType(type);
    if (type === 'Savings') {
      setAccountTypeWarning('A current account is strongly recommended for business operations');
    } else {
      setAccountTypeWarning('');
    }
  };

  // Trigger name lookup when bank + account are complete
  useEffect(() => {
    if (bankName && accountNumber.length === 10 && !accountError) {
      setLookingUp(true);
      setResolvedName('');
      const timer = setTimeout(() => {
        setLookingUp(false);
        setResolvedName('ABUBAKAR MUHAMMAD IBRAHIM');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [bankName, accountNumber, accountError]);

  const isFormValid =
    bankName.length > 0 &&
    accountNumber.length === 10 &&
    !accountError &&
    accountType === 'Current' &&
    resolvedName.length > 0;

  return (
    <OnboardingShell
      currentStep={step}
      totalSteps={total}
      title="Bank Account"
      subtitle="Link your business bank account for settlement. A current account is required."
      onBack={goBack}
      footer={
        <OnboardingButton
          title="Continue"
          onPress={() => goNext({ bankName, accountNumber, accountType, resolvedName })}
          disabled={!isFormValid}
        />
      }
    >
      {/* Bank Name Dropdown */}
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

      {/* Account Type Selector */}
      <View style={styles.fieldWrap}>
        <Text style={styles.label}>ACCOUNT TYPE</Text>
        <View className="flex-row" style={{ gap: 12 }}>
          {ACCOUNT_TYPES.map((type) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.typeButton,
                accountType === type && styles.typeButtonActive,
                type === 'Current' && accountType === type && styles.typeButtonRequired,
              ]}
              onPress={() => handleAccountTypeSelect(type)}
              activeOpacity={0.7}
              accessibilityRole="radio"
              accessibilityState={{ selected: accountType === type }}
            >
              <View style={[styles.radio, accountType === type && styles.radioActive]}>
                {accountType === type && <View style={styles.radioInner} />}
              </View>
              <Text
                style={[
                  styles.typeButtonText,
                  accountType === type && styles.typeButtonTextActive,
                ]}
              >
                {type}
              </Text>
              {type === 'Current' && (
                <View style={styles.requiredBadge}>
                  <Text style={styles.requiredBadgeText}>Required</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
        {accountTypeWarning && (
          <View className="flex-row items-center mt-2">
            <AlertCircle size={14} color="#F59E0B" />
            <Text style={styles.warningText}>{accountTypeWarning}</Text>
          </View>
        )}
      </View>

      {/* Name Lookup Result */}
      {lookingUp && (
        <View style={styles.lookupCard}>
          <ActivityIndicator size="small" color={colors.ventureroot.green} />
          <Text style={styles.lookupText}>Verifying account details...</Text>
        </View>
      )}

      {resolvedName.length > 0 && !lookingUp && (
        <View style={styles.resolvedCard}>
          <View className="flex-row items-center mb-2">
            <CheckCircle2 size={20} color="#10B981" />
            <Text style={styles.resolvedTitle}>Account Verified</Text>
          </View>
          <View style={styles.resolvedRow}>
            <Text style={styles.resolvedLabel}>Account Name</Text>
            <Text style={styles.resolvedValue}>{resolvedName}</Text>
          </View>
          <View style={[styles.resolvedRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.resolvedLabel}>Bank</Text>
            <Text style={styles.resolvedValue}>{bankName}</Text>
          </View>
          <Text style={styles.resolvedHint}>
            Please confirm this matches your company's bank account.
          </Text>
        </View>
      )}
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
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
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    minHeight: 48,
  },
  typeButtonActive: {
    borderColor: '#004D2C',
    backgroundColor: '#F0FDF4',
  },
  typeButtonRequired: {
    borderColor: '#004D2C',
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    marginLeft: 10,
  },
  typeButtonTextActive: {
    color: '#004D2C',
    fontWeight: '700',
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: {
    borderColor: '#004D2C',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#004D2C',
  },
  requiredBadge: {
    marginLeft: 'auto',
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  requiredBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  warningText: {
    fontSize: 12,
    color: '#D97706',
    marginLeft: 6,
    flex: 1,
  },
  lookupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  lookupText: {
    fontSize: 13,
    color: '#64748B',
    marginLeft: 10,
  },
  resolvedCard: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  resolvedTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#065F46',
    marginLeft: 8,
  },
  resolvedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#D1FAE5',
  },
  resolvedLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  resolvedValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  resolvedHint: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 8,
    lineHeight: 16,
  },
});
