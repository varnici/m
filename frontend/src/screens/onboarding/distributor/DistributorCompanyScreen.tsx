import React, { useState } from 'react';
import { View, Text, StyleSheet, useWindowDimensions, ActivityIndicator } from 'react-native';
import { Building2, CheckCircle2, AlertCircle } from 'lucide-react-native';
import OnboardingShell, { OnboardingButton, OnboardingInput } from '@/components/onboarding/OnboardingShell';
import { useOnboardingNav } from '@/hooks/useOnboardingNav';
import { colors } from '@/theme/colors';

export default function DistributorCompanyScreen() {
  const { goNext, goBack, step, total } = useOnboardingNav();
  const { width } = useWindowDimensions();
  const hp = Math.max(20, width * 0.06);

  const [companyName, setCompanyName] = useState('');
  const [rcNumber, setRcNumber] = useState('');
  const [tin, setTin] = useState('');
  const [rcError, setRcError] = useState('');
  const [tinError, setTinError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [cacData, setCacData] = useState<{
    registeredName: string;
    registrationDate: string;
    status: string;
  } | null>(null);

  const validateRC = (value: string) => {
    setRcNumber(value);
    setVerified(false);
    setCacData(null);
    if (value.length > 0) {
      const pattern = /^RC\d{6,7}$/;
      if (!pattern.test(value.toUpperCase())) {
        setRcError('Format: RC followed by 6-7 digits (e.g. RC123456)');
      } else {
        setRcError('');
      }
    } else {
      setRcError('');
    }
  };

  const validateTIN = (value: string) => {
    const digits = value.replace(/\D/g, '');
    setTin(digits);
    if (digits.length > 0 && digits.length !== 8) {
      setTinError('TIN must be exactly 8 digits');
    } else {
      setTinError('');
    }
  };

  const handleVerifyCAC = () => {
    setVerifying(true);
    // Simulate CAC verification lookup
    setTimeout(() => {
      setVerifying(false);
      setVerified(true);
      setCacData({
        registeredName: companyName.toUpperCase(),
        registrationDate: '15/03/2019',
        status: 'Active',
      });
    }, 2000);
  };

  const isRCValid = /^RC\d{6,7}$/i.test(rcNumber);
  const isTINValid = tin.length === 8;
  const isFormValid = companyName.trim().length > 0 && isRCValid && isTINValid && verified;

  return (
    <OnboardingShell
      currentStep={step}
      totalSteps={total}
      title="Company Registration"
      subtitle="Enter your company details exactly as registered with the Corporate Affairs Commission (CAC)."
      onBack={goBack}
      footer={
        <OnboardingButton
          title="Continue"
          onPress={() => goNext({ companyName, rcNumber, tin })}
          disabled={!isFormValid}
        />
      }
    >
      <OnboardingInput
        label="COMPANY NAME (EXACT CAC NAME)"
        value={companyName}
        onChangeText={(v) => {
          setCompanyName(v);
          setVerified(false);
          setCacData(null);
        }}
        placeholder="e.g. Dangote Industries Limited"
        autoCapitalize="words"
      />

      <OnboardingInput
        label="CAC RC NUMBER"
        value={rcNumber}
        onChangeText={validateRC}
        placeholder="e.g. RC123456"
        error={rcError}
        helper="RC followed by 6-7 digits"
        autoCapitalize="characters"
        maxLength={9}
      />

      <OnboardingInput
        label="TAX IDENTIFICATION NUMBER (TIN)"
        value={tin}
        onChangeText={validateTIN}
        placeholder="e.g. 12345678"
        error={tinError}
        helper="8-digit FIRS Tax Identification Number"
        keyboardType="number-pad"
        maxLength={8}
      />

      {/* Verify CAC Button */}
      {companyName.trim().length > 0 && isRCValid && !verified && (
        <View style={{ marginTop: 8, marginBottom: 16 }}>
          <OnboardingButton
            title={verifying ? 'Verifying...' : 'Verify CAC Details'}
            onPress={handleVerifyCAC}
            disabled={verifying}
            variant="secondary"
          />
          {verifying && (
            <View className="flex-row items-center justify-center mt-3">
              <ActivityIndicator size="small" color={colors.ventureroot.green} />
              <Text style={styles.verifyingText}>Looking up CAC records...</Text>
            </View>
          )}
        </View>
      )}

      {/* CAC Verification Result */}
      {verified && cacData && (
        <View style={styles.cacCard}>
          <View className="flex-row items-center mb-3">
            <CheckCircle2 size={20} color="#10B981" />
            <Text style={styles.cacTitle}>CAC Record Confirmed</Text>
          </View>

          <View style={styles.cacRow}>
            <Text style={styles.cacLabel}>Registered Name</Text>
            <Text style={styles.cacValue}>{cacData.registeredName}</Text>
          </View>

          <View style={styles.cacRow}>
            <Text style={styles.cacLabel}>Registration Date</Text>
            <Text style={styles.cacValue}>{cacData.registrationDate}</Text>
          </View>

          <View style={styles.cacRow}>
            <Text style={styles.cacLabel}>Status</Text>
            <View className="flex-row items-center">
              <View style={styles.statusDot} />
              <Text style={[styles.cacValue, { color: '#10B981' }]}>{cacData.status}</Text>
            </View>
          </View>

          <View style={styles.cacNotice}>
            <AlertCircle size={14} color="#F59E0B" />
            <Text style={styles.cacNoticeText}>
              Ensure this matches your company records. Discrepancies may delay verification.
            </Text>
          </View>
        </View>
      )}
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  verifyingText: {
    fontSize: 13,
    color: '#64748B',
    marginLeft: 8,
  },
  cacCard: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  cacTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#065F46',
    marginLeft: 8,
  },
  cacRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#D1FAE5',
  },
  cacLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  cacValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  cacNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 12,
    padding: 10,
    backgroundColor: '#FFFBEB',
    borderRadius: 8,
  },
  cacNoticeText: {
    fontSize: 11,
    color: '#92400E',
    marginLeft: 8,
    flex: 1,
    lineHeight: 16,
  },
});
