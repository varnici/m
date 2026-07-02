import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import OnboardingShell, { OnboardingButton, OnboardingInput } from '@/components/onboarding/OnboardingShell';
import { useOnboardingNav } from '@/hooks/useOnboardingNav';
import { colors } from '@/theme/colors';

const OWNERSHIP_OPTIONS = ['Rented', 'Owned', 'Mobile'] as const;
const REGISTRATION_OPTIONS = ['Registered', 'Not Registered'] as const;

const ShopInformationScreen = () => {
  const { goNext, goBack, step, total, data } = useOnboardingNav();

  const [businessName, setBusinessName] = useState(data.businessName || '');
  const [tradingName, setTradingName] = useState(data.tradingName || '');
  const [yearsInOperation, setYearsInOperation] = useState(
    data.yearsInOperation != null ? String(data.yearsInOperation) : '0',
  );
  const [ownershipType, setOwnershipType] = useState(data.ownershipType || 'Rented');
  const [employeeCount, setEmployeeCount] = useState(
    data.employee_count != null ? String(data.employee_count) : '0',
  );
  const [registrationStatus, setRegistrationStatus] = useState(
    data.registrationStatus || 'Not Registered',
  );

  const isFormValid = businessName.trim().length >= 2;

  const handleContinue = () => {
    goNext({
      businessName: businessName.trim(),
      tradingName: tradingName.trim(),
      yearsInOperation: parseInt(yearsInOperation, 10) || 0,
      ownershipType,
      employee_count: parseInt(employeeCount, 10) || 0,
      registrationStatus,
    });
  };

  return (
    <OnboardingShell
      currentStep={step}
      totalSteps={total}
      title="Business Information"
      subtitle="Provide your shop profile so we can tailor the rest of your onboarding."
      onBack={goBack}
      footer={
        <OnboardingButton
          title="Continue"
          onPress={handleContinue}
          disabled={!isFormValid}
        />
      }
    >
      <Text
        style={{
          fontSize: 12,
          fontWeight: '700',
          color: '#475569',
          letterSpacing: 0.5,
          marginBottom: 20,
        }}
      >
        SHOP PROFILE
      </Text>

      <OnboardingInput
        label="REGISTERED BUSINESS NAME"
        value={businessName}
        onChangeText={setBusinessName}
        placeholder="e.g. Acme Retail Ventures"
        error={
          businessName && businessName.trim().length < 2
            ? 'Business name must be at least 2 characters'
            : undefined
        }
        autoCapitalize="words"
      />

      <OnboardingInput
        label="TRADING NAME (IF DIFFERENT)"
        value={tradingName}
        onChangeText={setTradingName}
        placeholder="e.g. Oga's Shop"
        autoCapitalize="words"
      />

      <OnboardingInput
        label="YEARS IN OPERATION"
        value={yearsInOperation}
        onChangeText={(t) => setYearsInOperation(t.replace(/\D/g, ''))}
        placeholder="0"
        keyboardType="number-pad"
        maxLength={3}
      />

      <OnboardingInput
        label="NUMBER OF EMPLOYEES"
        value={employeeCount}
        onChangeText={(t) => setEmployeeCount(t.replace(/\D/g, ''))}
        placeholder="0"
        keyboardType="number-pad"
        maxLength={5}
      />

      {/* Ownership Type selector */}
      <View style={{ marginBottom: 20 }}>
        <Text
          style={{
            fontSize: 12,
            fontWeight: '700',
            color: '#475569',
            marginBottom: 8,
            letterSpacing: 0.5,
          }}
        >
          OWNERSHIP TYPE
        </Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {OWNERSHIP_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option}
              onPress={() => setOwnershipType(option)}
              style={{
                flex: 1,
                paddingVertical: 14,
                borderRadius: 12,
                alignItems: 'center',
                borderWidth: 1.5,
                borderColor:
                  ownershipType === option ? colors.ventureroot.green : '#E2E8F0',
                backgroundColor:
                  ownershipType === option ? 'rgba(0, 77, 44, 0.05)' : '#FFFFFF',
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color:
                    ownershipType === option ? colors.ventureroot.green : '#475569',
                }}
              >
                {option}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Registration Status selector */}
      <View style={{ marginBottom: 16 }}>
        <Text
          style={{
            fontSize: 12,
            fontWeight: '700',
            color: '#475569',
            marginBottom: 8,
            letterSpacing: 0.5,
          }}
        >
          REGISTRATION STATUS
        </Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {REGISTRATION_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option}
              onPress={() => setRegistrationStatus(option)}
              style={{
                flex: 1,
                paddingVertical: 14,
                borderRadius: 12,
                alignItems: 'center',
                borderWidth: 1.5,
                borderColor:
                  registrationStatus === option ? colors.ventureroot.green : '#E2E8F0',
                backgroundColor:
                  registrationStatus === option ? 'rgba(0, 77, 44, 0.05)' : '#FFFFFF',
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color:
                    registrationStatus === option
                      ? colors.ventureroot.green
                      : '#475569',
                }}
              >
                {option}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </OnboardingShell>
  );
};

export default ShopInformationScreen;
