import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import OnboardingShell, { OnboardingButton, OnboardingInput } from '@/components/onboarding/OnboardingShell';
import MaskedInput from '@/components/onboarding/MaskedInput';
import { useOnboardingNav } from '@/hooks/useOnboardingNav';
import { validateNIN, validateDriverLicence } from '@/utils/validation';
import { colors } from '@/theme/colors';

const ID_TYPES = [
  { label: 'National ID (NIN)', value: 'NIN' },
  { label: "Voter's Card", value: 'VOTER' },
  { label: 'International Passport', value: 'PASSPORT' },
  { label: "Driver's License", value: 'DL' },
] as const;

function validateIdNumber(idType: string, idNumber: string): { valid: boolean; error?: string } {
  const trimmed = idNumber.trim();
  if (!trimmed) return { valid: false, error: 'ID number is required' };

  switch (idType) {
    case 'NIN':
      return validateNIN(trimmed);
    case 'VOTER': {
      if (trimmed.length !== 19) return { valid: false, error: "Voter's card number must be 19 characters" };
      return { valid: true };
    }
    case 'PASSPORT': {
      if (!/^[A-Za-z0-9]{9}$/.test(trimmed)) return { valid: false, error: 'Passport number must be 9 alphanumeric characters' };
      return { valid: true };
    }
    case 'DL':
      return validateDriverLicence(trimmed);
    default:
      return { valid: false, error: 'Select an ID type' };
  }
}

const KYCVerificationScreen = () => {
  const { goNext, goBack, step, total, data } = useOnboardingNav();

  const [idType, setIdType] = useState(data.idType || 'NIN');
  const [idNumber, setIdNumber] = useState(data.idNumber || '');
  const [idExpiry, setIdExpiry] = useState(data.idExpiry || '');

  const validation = useMemo(() => validateIdNumber(idType, idNumber), [idType, idNumber]);
  const idNumberError = idNumber.length > 0 ? validation.error : undefined;
  const isFormValid = validation.valid;

  const isSensitive = idType === 'NIN';

  const maxLengthMap: Record<string, number> = {
    NIN: 11,
    VOTER: 19,
    PASSPORT: 9,
    DL: 12,
  };

  const placeholderMap: Record<string, string> = {
    NIN: 'Enter 11-digit NIN',
    VOTER: 'Enter 19-character voter card number',
    PASSPORT: 'Enter 9-character passport number',
    DL: 'e.g. LA1234567',
  };

  return (
    <OnboardingShell
      currentStep={step}
      totalSteps={total}
      title="KYC Verification"
      subtitle="Provide a valid identity document to verify your account."
      onBack={goBack}
      footer={
        <View style={{ gap: 10 }}>
          <OnboardingButton
            title="Continue"
            onPress={() => goNext({ idType, idNumber: idNumber.trim(), idExpiry: idExpiry.trim() || undefined })}
            disabled={!isFormValid}
          />
          <OnboardingButton
            title="Complete KYC Later"
            variant="secondary"
            onPress={() => goNext({ idType: undefined, idNumber: undefined, idExpiry: undefined })}
          />
        </View>
      }
    >
      {/* ID Type Selection */}
      <Text style={{ fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 10, letterSpacing: 0.5 }}>
        ID Type
      </Text>
      <View style={{ gap: 8, marginBottom: 20 }}>
        {ID_TYPES.map((item) => {
          const isSelected = idType === item.value;
          return (
            <TouchableOpacity
              key={item.value}
              onPress={() => {
                setIdType(item.value);
                setIdNumber('');
              }}
              activeOpacity={0.7}
              style={{
                paddingVertical: 14,
                paddingHorizontal: 16,
                borderRadius: 12,
                borderWidth: 1.5,
                borderColor: isSelected ? colors.ventureroot.green : '#E2E8F0',
                backgroundColor: isSelected ? '#F0FDF4' : '#FFFFFF',
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: '600', color: isSelected ? colors.ventureroot.green : '#334155' }}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ID Number Input */}
      {isSensitive ? (
        <MaskedInput
          label="NIN Number"
          value={idNumber}
          onChangeText={setIdNumber}
          placeholder={placeholderMap[idType]}
          error={idNumberError}
          maxLength={maxLengthMap[idType]}
          keyboardType="number-pad"
          helper="Your NIN is encrypted and stored securely"
        />
      ) : (
        <OnboardingInput
          label="ID Number"
          value={idNumber}
          onChangeText={setIdNumber}
          placeholder={placeholderMap[idType]}
          error={idNumberError}
          maxLength={maxLengthMap[idType]}
          keyboardType={idType === 'VOTER' ? 'default' : 'default'}
          autoCapitalize={idType === 'PASSPORT' || idType === 'DL' ? 'characters' : 'none'}
        />
      )}

      {/* Expiry Date (optional) */}
      <OnboardingInput
        label="Expiry Date (optional)"
        value={idExpiry}
        onChangeText={setIdExpiry}
        placeholder="DD/MM/YYYY"
        maxLength={10}
        helper="Leave blank if not applicable"
      />
    </OnboardingShell>
  );
};

export default KYCVerificationScreen;
