import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import type { RootStackScreenProps } from '@/navigation/types';
import { useOnboarding } from '../../../context/OnboardingContext';
import { BowlHeader, CleanCard, CleanInput, RichButton } from '../../../components/ThemeComponents';
import { ChevronLeft } from 'lucide-react-native';

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

  const isFormValid =
    stateValue.trim().length > 0 &&
    lga.trim().length > 0 &&
    address.trim().length > 0 &&
    (isPhysical || serviceAreas.trim().length > 0);

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
    <View className="flex-1 bg-ventureroot-clean-background">
      <StatusBar barStyle="light-content" />

      <BowlHeader
        title="Location Details"
        subtitle="Share where you operate so we can configure your shop correctly."
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 30, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="w-10 h-10 rounded-full bg-slate-100 items-center justify-center mb-6"
          >
            <ChevronLeft color="#1E293B" size={24} />
          </TouchableOpacity>

          <Text className="text-ventureroot-clean-textLight text-sm font-bold tracking-widest uppercase mb-6 ml-1">
            Location Setup
          </Text>

          <CleanCard>
            <View className="flex-row gap-3 mb-6">
              <TouchableOpacity
                onPress={() => setIsPhysical(true)}
                className={`flex-1 rounded-2xl px-4 py-3 border ${
                  isPhysical ? 'border-ventureroot-green bg-ventureroot-green/10' : 'border-slate-200 bg-white'
                }`}
              >
                <Text className={`text-center font-semibold ${isPhysical ? 'text-ventureroot-green' : 'text-ventureroot-clean-text'}`}>
                  Physical Store
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setIsPhysical(false)}
                className={`flex-1 rounded-2xl px-4 py-3 border ${
                  !isPhysical ? 'border-ventureroot-green bg-ventureroot-green/10' : 'border-slate-200 bg-white'
                }`}
              >
                <Text className={`text-center font-semibold ${!isPhysical ? 'text-ventureroot-green' : 'text-ventureroot-clean-text'}`}>
                  Online / Mobile
                </Text>
              </TouchableOpacity>
            </View>

            <CleanInput
              label="State"
              placeholder="e.g. Lagos"
              value={stateValue}
              onChangeText={setStateValue}
            />

            <CleanInput
              label="LGA"
              placeholder="e.g. Ikeja"
              value={lga}
              onChangeText={setLga}
            />

            <CleanInput
              label={isPhysical ? 'Full Street Address' : 'Warehouse / Office Address'}
              placeholder="e.g. 24 Allen Avenue"
              value={address}
              onChangeText={setAddress}
            />

            {isPhysical ? (
              <CleanInput
                label="Nearest Landmark"
                placeholder="e.g. Opposite GTBank"
                value={landmark}
                onChangeText={setLandmark}
              />
            ) : (
              <CleanInput
                label="Service Areas"
                placeholder="e.g. Ikeja, Alimosho, Oshodi"
                value={serviceAreas}
                onChangeText={setServiceAreas}
              />
            )}
          </CleanCard>

          <View className="mt-8">
            <RichButton
              title="Continue to KYC"
              onPress={handleContinue}
              disabled={!isFormValid}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

export default LocationScreen;
