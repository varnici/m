import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import OnboardingShell, { OnboardingButton, OnboardingInput } from '@/components/onboarding/OnboardingShell';
import { useOnboardingNav } from '@/hooks/useOnboardingNav';
import { validateName, validateDOB, validateEmail, formatDOBInput } from '@/utils/validation';
import { colors } from '@/theme/colors';

const GENDER_OPTIONS = ['Male', 'Female', 'Prefer not to say'] as const;

const BasicInfoScreen = () => {
  const { goNext, goBack, step, total, data } = useOnboardingNav();

  const [fullName, setFullName] = useState(data.fullName || '');
  const [dateOfBirth, setDateOfBirth] = useState(data.dateOfBirth || '');
  const [gender, setGender] = useState(data.gender || '');
  const [nationality, setNationality] = useState(data.nationality || 'Nigerian');
  const [email, setEmail] = useState(data.email || '');

  // Track whether user has interacted with each field for inline errors
  const [touched, setTouched] = useState({
    fullName: false,
    dateOfBirth: false,
    email: false,
  });

  const nameResult = validateName(fullName);
  const dobResult = dateOfBirth ? validateDOB(dateOfBirth) : { valid: false, error: undefined };
  const emailResult = email ? validateEmail(email) : { valid: true }; // email is optional

  const isFormValid =
    nameResult.valid &&
    (dateOfBirth ? dobResult.valid : false) &&
    gender !== '' &&
    emailResult.valid;

  const handleDOBChange = (text: string) => {
    setDateOfBirth(formatDOBInput(text));
  };

  const handleContinue = () => {
    goNext({ fullName: fullName.trim(), dateOfBirth, gender, nationality, email: email.trim() });
  };

  return (
    <OnboardingShell
      currentStep={step}
      totalSteps={total}
      title="Personal Profile"
      subtitle="Individual identification (KYC Level 1). Your data is secured with encryption."
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
        KYC LEVEL 1
      </Text>

      <OnboardingInput
        label="FULL LEGAL NAME (AS IN ID)"
        value={fullName}
        onChangeText={(t) => {
          setFullName(t);
          if (!touched.fullName) setTouched((p) => ({ ...p, fullName: true }));
        }}
        placeholder="e.g. John Doe Akpan"
        error={touched.fullName && !nameResult.valid ? nameResult.error : undefined}
        autoCapitalize="words"
      />

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <OnboardingInput
            label="DATE OF BIRTH"
            value={dateOfBirth}
            onChangeText={(t) => {
              handleDOBChange(t);
              if (!touched.dateOfBirth) setTouched((p) => ({ ...p, dateOfBirth: true }));
            }}
            placeholder="DD/MM/YYYY"
            keyboardType="number-pad"
            maxLength={10}
            error={touched.dateOfBirth && dateOfBirth && !dobResult.valid ? dobResult.error : undefined}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 12,
              fontWeight: '700',
              color: '#475569',
              marginBottom: 6,
              letterSpacing: 0.5,
            }}
          >
            GENDER
          </Text>
          <View style={{ gap: 6 }}>
            {GENDER_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option}
                onPress={() => setGender(option)}
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 14,
                  borderRadius: 10,
                  borderWidth: 1.5,
                  borderColor: gender === option ? colors.ventureroot.green : '#E2E8F0',
                  backgroundColor: gender === option ? 'rgba(0, 77, 44, 0.05)' : '#FFFFFF',
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '600',
                    color: gender === option ? colors.ventureroot.green : '#475569',
                  }}
                >
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      <OnboardingInput
        label="NATIONALITY"
        value={nationality}
        onChangeText={setNationality}
        placeholder="e.g. Nigerian"
        autoCapitalize="words"
      />

      <OnboardingInput
        label="EMAIL ADDRESS (OPTIONAL)"
        value={email}
        onChangeText={(t) => {
          setEmail(t);
          if (!touched.email) setTouched((p) => ({ ...p, email: true }));
        }}
        placeholder="name@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        error={touched.email && email && !emailResult.valid ? emailResult.error : undefined}
      />
    </OnboardingShell>
  );
};

export default BasicInfoScreen;
