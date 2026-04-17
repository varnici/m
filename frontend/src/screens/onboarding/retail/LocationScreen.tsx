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

const inputStyle = {
  backgroundColor: 'white',
  borderWidth: 1,
  borderColor: '#CBD5E1',
  borderRadius: 10,
  paddingHorizontal: 12,
  paddingVertical: 12,
};

const LocationScreen = ({
  navigation,
}: RootStackScreenProps<'OnboardingLocation'>) => {
  const { data, updateData } = useOnboarding();
  const [isPhysical, setIsPhysical] = useState(data.isPhysicalStore ?? true);

  const [stateValue, setStateValue] = useState(data.state || '');
  const [lga, setLga] = useState(data.lga || '');
  const [address, setAddress] = useState(data.address || '');
  const [landmark, setLandmark] = useState(data.landmark || '');
  const [serviceAreas, setServiceAreas] = useState(
    Array.isArray(data.serviceAreas) ? data.serviceAreas.join(', ') : data.serviceAreas || '',
  );

  const isFormValid = stateValue.trim() && lga.trim() && address.trim();

  const handleContinue = () => {
    updateData({
      isPhysicalStore: isPhysical,
      state: stateValue.trim(),
      lga: lga.trim(),
      address: address.trim(),
      landmark: isPhysical ? landmark.trim() : undefined,
      serviceAreas: isPhysical
        ? undefined
        : serviceAreas
            .split(',')
            .map((area) => area.trim())
            .filter(Boolean),
      gpsPin: data.gpsPin || { latitude: 6.5244, longitude: 3.3792 },
    });
    navigation.navigate('OnboardingKYC');
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
            Location Details
          </Text>
          <Text style={{ color: '#475569', marginBottom: 20 }}>
            Tell us where you operate.
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

          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
            <TouchableOpacity
              onPress={() => setIsPhysical(true)}
              style={{
                flex: 1,
                paddingVertical: 12,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: isPhysical ? '#16A34A' : '#CBD5E1',
                backgroundColor: isPhysical ? '#DCFCE7' : 'white',
                alignItems: 'center',
              }}
            >
              <Text style={{ fontWeight: '600' }}>Physical Store</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setIsPhysical(false)}
              style={{
                flex: 1,
                paddingVertical: 12,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: !isPhysical ? '#16A34A' : '#CBD5E1',
                backgroundColor: !isPhysical ? '#DCFCE7' : 'white',
                alignItems: 'center',
              }}
            >
              <Text style={{ fontWeight: '600' }}>Online / Mobile</Text>
            </TouchableOpacity>
          </View>

          <View style={{ gap: 12 }}>
            <View>
              <Text style={{ marginBottom: 6, fontWeight: '600' }}>State</Text>
              <TextInput
                value={stateValue}
                onChangeText={setStateValue}
                placeholder="e.g. Lagos"
                style={inputStyle}
              />
            </View>

            <View>
              <Text style={{ marginBottom: 6, fontWeight: '600' }}>LGA</Text>
              <TextInput
                value={lga}
                onChangeText={setLga}
                placeholder="e.g. Ikeja"
                style={inputStyle}
              />
            </View>

            <View>
              <Text style={{ marginBottom: 6, fontWeight: '600' }}>
                {isPhysical ? 'Full Street Address' : 'Warehouse / Office Address'}
              </Text>
              <TextInput
                value={address}
                onChangeText={setAddress}
                placeholder="e.g. 24 Allen Avenue"
                style={inputStyle}
              />
            </View>

            {isPhysical ? (
              <View>
                <Text style={{ marginBottom: 6, fontWeight: '600' }}>
                  Nearest Landmark
                </Text>
                <TextInput
                  value={landmark}
                  onChangeText={setLandmark}
                  placeholder="e.g. Opposite GTBank"
                  style={inputStyle}
                />
              </View>
            ) : (
              <View>
                <Text style={{ marginBottom: 6, fontWeight: '600' }}>
                  Service Areas
                </Text>
                <TextInput
                  value={serviceAreas}
                  onChangeText={setServiceAreas}
                  placeholder="e.g. Ikeja, Alimosho, Oshodi"
                  style={inputStyle}
                />
              </View>
            )}
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
            <Text style={{ color: 'white', fontWeight: '700' }}>Continue to KYC</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default LocationScreen;
