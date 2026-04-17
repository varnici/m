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

const ShopInformationScreen = ({
  navigation,
}: RootStackScreenProps<'OnboardingShopInfo'>) => {
  const { data, updateData } = useOnboarding();

  const [businessName, setBusinessName] = useState(data.businessName || '');
  const [tradingName, setTradingName] = useState(data.tradingName || '');
  const [yearsInOperation, setYearsInOperation] = useState(
    String(data.yearsInOperation ?? 0),
  );
  const [ownershipType, setOwnershipType] = useState(data.ownershipType || 'Rented');
  const [registrationStatus, setRegistrationStatus] = useState(
    data.registrationStatus || 'Not Registered',
  );

  const isFormValid = businessName.trim().length > 0;

  const handleContinue = () => {
    updateData({
      businessName: businessName.trim(),
      tradingName: tradingName.trim(),
      yearsInOperation: Number.parseInt(yearsInOperation, 10) || 0,
      ownershipType,
      registrationStatus,
    });
    navigation.navigate('OnboardingCategory');
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
            Business Information
          </Text>
          <Text style={{ color: '#475569', marginBottom: 20 }}>
            Tell us about your shop to continue onboarding.
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

          <View style={{ gap: 12 }}>
            <View>
              <Text style={{ marginBottom: 6, fontWeight: '600' }}>Business Name</Text>
              <TextInput
                value={businessName}
                onChangeText={setBusinessName}
                placeholder="Acme Retail Ventures"
                style={{
                  backgroundColor: 'white',
                  borderWidth: 1,
                  borderColor: '#CBD5E1',
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  paddingVertical: 12,
                }}
              />
            </View>

            <View>
              <Text style={{ marginBottom: 6, fontWeight: '600' }}>Trading Name</Text>
              <TextInput
                value={tradingName}
                onChangeText={setTradingName}
                placeholder="Oga's Shop"
                style={{
                  backgroundColor: 'white',
                  borderWidth: 1,
                  borderColor: '#CBD5E1',
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  paddingVertical: 12,
                }}
              />
            </View>

            <View>
              <Text style={{ marginBottom: 6, fontWeight: '600' }}>Years In Operation</Text>
              <TextInput
                value={yearsInOperation}
                onChangeText={setYearsInOperation}
                keyboardType="number-pad"
                placeholder="0"
                style={{
                  backgroundColor: 'white',
                  borderWidth: 1,
                  borderColor: '#CBD5E1',
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  paddingVertical: 12,
                }}
              />
            </View>

            <View>
              <Text style={{ marginBottom: 6, fontWeight: '600' }}>Ownership Type</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {['Rented', 'Owned', 'Mobile'].map((option) => (
                  <TouchableOpacity
                    key={option}
                    onPress={() => setOwnershipType(option)}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: ownershipType === option ? '#16A34A' : '#CBD5E1',
                      backgroundColor: ownershipType === option ? '#DCFCE7' : 'white',
                    }}
                  >
                    <Text>{option}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View>
              <Text style={{ marginBottom: 6, fontWeight: '600' }}>Registration Status</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {['Registered', 'Not Registered'].map((option) => (
                  <TouchableOpacity
                    key={option}
                    onPress={() => setRegistrationStatus(option)}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor:
                        registrationStatus === option ? '#16A34A' : '#CBD5E1',
                      backgroundColor:
                        registrationStatus === option ? '#DCFCE7' : 'white',
                    }}
                  >
                    <Text>{option}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

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
            <Text style={{ color: 'white', fontWeight: '700' }}>Next: Business Category</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default ShopInformationScreen;
