import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RootStackScreenProps } from '@/navigation/types';
import { useOnboarding } from '../../../context/OnboardingContext';

const ID_TYPES = [
  { label: 'National ID (NIN)', value: 'NIN' },
  { label: "Voter's Card", value: 'VOTER' },
  { label: 'International Passport', value: 'PASSPORT' },
  { label: "Driver's License", value: 'DL' },
];

const KYCVerificationScreen = ({
  navigation,
}: RootStackScreenProps<'OnboardingKYC'>) => {
  const { data, updateData } = useOnboarding();
  const [idType, setIdType] = useState(data.idType || 'NIN');
  const [idNumber, setIdNumber] = useState(data.idNumber || '');

  const isFormValid = idNumber.trim().length >= 8;

  const handleContinue = () => {
    updateData({ idType, idNumber: idNumber.trim() });
    navigation.navigate('OnboardingFaceVerification');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={{ fontSize: 24, fontWeight: '700', marginBottom: 6 }}>
            KYC Verification
          </Text>
          <Text style={{ color: '#475569', marginBottom: 20 }}>
            Provide a valid identity document.
          </Text>

          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{
              backgroundColor: '#E2E8F0',
              paddingHorizontal: 12,
              paddingVertical: 10,
              borderRadius: 8,
              alignSelf: 'flex-start',
              marginBottom: 16,
            }}
          >
            <Text style={{ fontWeight: '600' }}>Back</Text>
          </TouchableOpacity>

          <Text style={{ marginBottom: 8, fontWeight: '600' }}>ID Type</Text>
          <View style={{ gap: 8, marginBottom: 16 }}>
            {ID_TYPES.map((item) => (
              <TouchableOpacity
                key={item.value}
                onPress={() => setIdType(item.value)}
                style={{
                  paddingVertical: 12,
                  paddingHorizontal: 12,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: idType === item.value ? '#16A34A' : '#CBD5E1',
                  backgroundColor: idType === item.value ? '#DCFCE7' : 'white',
                }}
              >
                <Text style={{ fontWeight: '600' }}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={{ marginBottom: 8, fontWeight: '600' }}>ID Number</Text>
          <TextInput
            value={idNumber}
            onChangeText={setIdNumber}
            placeholder="Enter ID number"
            style={{
              backgroundColor: 'white',
              borderWidth: 1,
              borderColor: '#CBD5E1',
              borderRadius: 10,
              paddingHorizontal: 12,
              paddingVertical: 12,
            }}
          />

          <TouchableOpacity
            onPress={handleContinue}
            disabled={!isFormValid}
            style={{
              marginTop: 24,
              paddingVertical: 14,
              borderRadius: 10,
              alignItems: 'center',
              backgroundColor: isFormValid ? '#16A34A' : '#94A3B8',
            }}
          >
            <Text style={{ color: 'white', fontWeight: '700' }}>Continue to Face Verification</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate('OnboardingFaceVerification')}
            style={{
              marginTop: 12,
              paddingVertical: 12,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: '#CBD5E1',
              alignItems: 'center',
              backgroundColor: 'white',
            }}
          >
            <Text style={{ color: '#334155', fontWeight: '600' }}>Complete KYC Later</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default KYCVerificationScreen;
