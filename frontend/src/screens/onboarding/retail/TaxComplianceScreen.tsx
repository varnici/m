import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import OnboardingShell, { OnboardingButton, OnboardingInput } from '@/components/onboarding/OnboardingShell';
import { useOnboardingNav } from '@/hooks/useOnboardingNav';
import { validateTIN } from '@/utils/validation';
import { colors } from '@/theme/colors';

const TaxComplianceScreen = () => {
  const { goNext, goBack, step, total, data } = useOnboardingNav();

  const [tin, setTin] = useState(data.tin || '');
  const [vatRegistered, setVatRegistered] = useState(data.vatRegistered || false);
  const [willingToRegister, setWillingToRegister] = useState(data.willingToRegister || false);

  const tinValidation = tin ? validateTIN(tin) : { valid: true };

  const canContinue = tinValidation.valid;

  return (
    <OnboardingShell
      currentStep={step}
      totalSteps={total}
      title="Tax Compliance"
      subtitle="Enter your tax details. TIN is optional but helps unlock institutional trade lines."
      onBack={goBack}
      footer={
        <OnboardingButton
          title="Continue"
          onPress={() => goNext({ tin, vatRegistered, willingToRegister })}
          disabled={!canContinue}
        />
      }
    >
      <OnboardingInput
        label="Tax Identification Number (TIN)"
        value={tin}
        onChangeText={setTin}
        placeholder="Enter 8-digit TIN (optional)"
        keyboardType="number-pad"
        maxLength={8}
        error={tinValidation.error}
        helper="Optional -- formalized businesses qualify for MSME development grants."
      />

      <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 12, marginTop: 8, letterSpacing: 0.5 }}>
        Compliance Status
      </Text>

      <TouchableOpacity
        onPress={() => setVatRegistered(!vatRegistered)}
        activeOpacity={0.7}
        style={{
          backgroundColor: vatRegistered ? '#F0FDF4' : '#FFFFFF',
          borderWidth: 1.5,
          borderColor: vatRegistered ? colors.ventureroot.green : '#E2E8F0',
          borderRadius: 12,
          padding: 16,
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <View
          style={{
            width: 22,
            height: 22,
            borderRadius: 4,
            borderWidth: 2,
            borderColor: vatRegistered ? colors.ventureroot.green : '#CBD5E1',
            backgroundColor: vatRegistered ? colors.ventureroot.green : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 12,
          }}
        >
          {vatRegistered && <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>{'✓'}</Text>}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#0F172A' }}>VAT Registered</Text>
          <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>Value Added Tax protocol enabled</Text>
        </View>
      </TouchableOpacity>

      {!tin && (
        <TouchableOpacity
          onPress={() => setWillingToRegister(!willingToRegister)}
          activeOpacity={0.7}
          style={{
            backgroundColor: willingToRegister ? '#F0FDF4' : '#FFFFFF',
            borderWidth: 1.5,
            borderColor: willingToRegister ? colors.ventureroot.green : '#E2E8F0',
            borderRadius: 12,
            padding: 16,
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 12,
          }}
        >
          <View
            style={{
              width: 22,
              height: 22,
              borderRadius: 4,
              borderWidth: 2,
              borderColor: willingToRegister ? colors.ventureroot.green : '#CBD5E1',
              backgroundColor: willingToRegister ? colors.ventureroot.green : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 12,
            }}
          >
            {willingToRegister && <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>{'✓'}</Text>}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#0F172A' }}>Assist with CAC/FIRS Registration</Text>
            <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>We can help you register for tax compliance</Text>
          </View>
        </TouchableOpacity>
      )}

      <View style={{ backgroundColor: '#F8FAFC', borderRadius: 10, padding: 16, marginTop: 8, flexDirection: 'row', alignItems: 'center' }}>
        <Text style={{ fontSize: 13, color: '#64748B', flex: 1 }}>
          Tax identifiers are encrypted and compliance metadata is strictly restricted to regulatory APIs.
        </Text>
      </View>
    </OnboardingShell>
  );
};

export default TaxComplianceScreen;
