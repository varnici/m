import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, useWindowDimensions } from 'react-native';
import OnboardingShell, { OnboardingButton, OnboardingInput } from '@/components/onboarding/OnboardingShell';
import { useOnboardingNav } from '@/hooks/useOnboardingNav';
import { colors } from '@/theme/colors';

const NIGERIAN_STATES = [
  'Abia','Adamawa','Akwa Ibom','Anambra','Bauchi','Bayelsa','Benue','Borno',
  'Cross River','Delta','Ebonyi','Edo','Ekiti','Enugu','FCT','Gombe','Imo',
  'Jigawa','Kaduna','Kano','Katsina','Kebbi','Kogi','Kwara','Lagos','Nasarawa',
  'Niger','Ogun','Ondo','Osun','Oyo','Plateau','Rivers','Sokoto','Taraba',
  'Yobe','Zamfara',
];

const GENDERS = ['Male', 'Female', 'Prefer not to say'];

const WorkerProfileScreen = () => {
  const { goNext, goBack, step, total } = useOnboardingNav();
  const { width } = useWindowDimensions();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [showStates, setShowStates] = useState(false);

  const alphaOnly = (text: string) => text.replace(/[^a-zA-Z\-\s]/g, '');

  const isOver18 = () => {
    if (!dob || dob.length !== 10) return true;
    const [d, m, y] = dob.split('/');
    if (!d || !m || !y) return true;
    const birthDate = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    return age >= 18;
  };

  const formatDOB = (text: string) => {
    const digits = text.replace(/\D/g, '');
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
  };

  const canContinue =
    firstName.trim().length >= 2 &&
    lastName.trim().length >= 2 &&
    dob.length === 10 &&
    isOver18() &&
    state.length > 0;

  return (
    <OnboardingShell
      currentStep={step}
      totalSteps={total}
      title="Personal Profile"
      subtitle="Enter your name exactly as it appears on your NIN slip and BVN record."
      onBack={goBack}
      footer={
        <OnboardingButton
          title="Continue"
          onPress={() => goNext({ firstName, lastName, dob, gender, street, city, state })}
          disabled={!canContinue}
        />
      }
    >
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <OnboardingInput
            label="FIRST NAME"
            value={firstName}
            onChangeText={(t) => setFirstName(alphaOnly(t))}
            placeholder="First name"
            autoCapitalize="words"
          />
        </View>
        <View style={{ flex: 1 }}>
          <OnboardingInput
            label="LAST NAME"
            value={lastName}
            onChangeText={(t) => setLastName(alphaOnly(t))}
            placeholder="Last name"
            autoCapitalize="words"
          />
        </View>
      </View>

      <OnboardingInput
        label="DATE OF BIRTH"
        value={dob}
        onChangeText={(t) => setDob(formatDOB(t))}
        placeholder="DD/MM/YYYY"
        keyboardType="number-pad"
        maxLength={10}
        error={dob.length === 10 && !isOver18() ? 'You must be 18 or older to create an investment account.' : undefined}
      />

      <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 8, letterSpacing: 0.5 }}>
        GENDER
      </Text>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
        {GENDERS.map((g) => (
          <TouchableOpacity
            key={g}
            onPress={() => setGender(g)}
            style={{
              flex: 1,
              paddingVertical: 12,
              borderRadius: 10,
              alignItems: 'center',
              backgroundColor: gender === g ? colors.ventureroot.green : '#F1F5F9',
              borderWidth: 1,
              borderColor: gender === g ? colors.ventureroot.green : '#E2E8F0',
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: '600',
                color: gender === g ? '#FFFFFF' : '#475569',
              }}
              numberOfLines={1}
            >
              {g}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <OnboardingInput
        label="STREET ADDRESS"
        value={street}
        onChangeText={setStreet}
        placeholder="Enter your street address"
      />

      <OnboardingInput
        label="CITY"
        value={city}
        onChangeText={setCity}
        placeholder="Enter your city"
      />

      <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 6, letterSpacing: 0.5 }}>
        STATE
      </Text>
      <TouchableOpacity
        onPress={() => setShowStates(!showStates)}
        style={{
          backgroundColor: '#FFFFFF',
          borderWidth: 1.5,
          borderColor: '#E2E8F0',
          borderRadius: 12,
          paddingHorizontal: 16,
          paddingVertical: 14,
          marginBottom: showStates ? 0 : 16,
        }}
      >
        <Text style={{ fontSize: 15, color: state ? '#0F172A' : '#94A3B8' }}>
          {state || 'Select your state'}
        </Text>
      </TouchableOpacity>

      {showStates && (
        <View
          style={{
            backgroundColor: '#FFFFFF',
            borderWidth: 1,
            borderColor: '#E2E8F0',
            borderRadius: 12,
            maxHeight: 200,
            marginBottom: 16,
          }}
        >
          <ScrollView nestedScrollEnabled>
            {NIGERIAN_STATES.map((s) => (
              <TouchableOpacity
                key={s}
                onPress={() => {
                  setState(s);
                  setShowStates(false);
                }}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  borderBottomWidth: 1,
                  borderBottomColor: '#F1F5F9',
                  backgroundColor: state === s ? '#F0FDF4' : 'transparent',
                }}
              >
                <Text style={{ fontSize: 14, color: '#0F172A' }}>{s}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <Text style={{ fontSize: 11, color: '#94A3B8', lineHeight: 16, marginTop: 4 }}>
        This address may be used for compliance purposes if physical contact is required.
      </Text>
    </OnboardingShell>
  );
};

export default WorkerProfileScreen;
