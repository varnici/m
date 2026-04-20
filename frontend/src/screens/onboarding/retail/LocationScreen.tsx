import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Store, Smartphone, ChevronLeft } from 'lucide-react-native';
import type { RootStackScreenProps } from '@/navigation/types';
import { useOnboarding } from '../../../context/OnboardingContext';
import { BowlHeader, IndustrialCard, CleanInput, RichButton } from '../../../components/ThemeComponents';

const LocationScreen = ({
  navigation,
}: RootStackScreenProps<'OnboardingLocation'>) => {
  const { data, updateData } = useOnboarding();
  const navigationRef = useRef(navigation);
  
  const [isPhysical, setIsPhysical] = useState(data.isPhysicalStore ?? true);

  const [form, setForm] = useState({
    state: data.state || '',
    lga: data.lga || '',
    address: data.address || '',
    landmark: data.landmark || '',
    serviceAreas: Array.isArray(data.serviceAreas) ? data.serviceAreas.join(', ') : data.serviceAreas || '',
  });

  const isFormValid =
    form.state.trim().length > 0 &&
    form.lga.trim().length > 0 &&
    form.address.trim().length > 0 &&
    (isPhysical || form.serviceAreas.trim().length > 0);

  const handleContinue = useCallback(() => {
    updateData({
      isPhysicalStore: isPhysical,
      state: form.state.trim(),
      lga: form.lga.trim(),
      address: form.address.trim(),
      landmark: isPhysical ? form.landmark.trim() : undefined,
      serviceAreas: isPhysical
        ? undefined
        : form.serviceAreas
            .split(',')
            .map((area) => area.trim())
            .filter(Boolean),
      gpsPin: data.gpsPin || { latitude: 6.5244, longitude: 3.3792 },
    });
    setTimeout(() => {
      navigationRef.current?.navigate('OnboardingKYC');
    }, 0);
  }, [isPhysical, form, updateData, data.gpsPin]);

  const handlePhysicalStoreToggle = useCallback(() => {
    setIsPhysical(true);
  }, []);

  const handleMobileToggle = useCallback(() => {
    setIsPhysical(false);
  }, []);

  return (
    <View className="flex-1 bg-ventureroot-industrial-background">
      <StatusBar barStyle="light-content" />
      <BowlHeader 
        title="Where do you operate?" 
        subtitle="This helps us connect you to the nearest distribution cluster."
      />
      
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <ScrollView 
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40 }}
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

          {/* Path Toggle - Tonal Shift Style */}
          <View className="flex-row bg-ventureroot-industrial-surfaceLow p-1.5 rounded-2xl mb-8">
            <TouchableOpacity 
              onPress={handlePhysicalStoreToggle}
              activeOpacity={0.7}
              className={`flex-1 flex-row items-center justify-center py-3 rounded-xl ${isPhysical ? 'bg-ventureroot-industrial-surfaceHigh shadow-lg' : ''}`}
            >
              <Store size={18} color={isPhysical ? '#88d982' : '#94A3B8'} />
              <Text className={`ml-2 text-[10px] font-black uppercase tracking-widest ${isPhysical ? 'text-ventureroot-industrial-primary' : 'text-slate-500'}`}>
                Physical Store
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={handleMobileToggle}
              activeOpacity={0.7}
              className={`flex-1 flex-row items-center justify-center py-3 rounded-xl ${!isPhysical ? 'bg-ventureroot-industrial-surfaceHigh shadow-lg' : ''}`}
            >
              <Smartphone size={18} color={!isPhysical ? '#88d982' : '#94A3B8'} />
              <Text className={`ml-2 text-[10px] font-black uppercase tracking-widest ${!isPhysical ? 'text-ventureroot-industrial-primary' : 'text-slate-500'}`}>
                Online / Mobile
              </Text>
            </TouchableOpacity>
          </View>

          <IndustrialCard className="mb-8">
            <View className="flex-row gap-4">
              <View className="flex-1">
                <CleanInput 
                  label="STATE"
                  placeholder="e.g. Lagos"
                  value={form.state}
                  onChangeText={(text: string) => setForm((prev) => ({ ...prev, state: text }))}
                />
              </View>
              <View className="flex-1">
                <CleanInput 
                  label="LGA"
                  placeholder="e.g. Ikeja"
                  value={form.lga}
                  onChangeText={(text: string) => setForm((prev) => ({ ...prev, lga: text }))}
                />
              </View>
            </View>

            <CleanInput 
              label={isPhysical ? "FULL STREET ADDRESS" : "WAREHOUSE / OFFICE ADDRESS"}
              placeholder="e.g. 24, Allen Avenue"
              value={form.address}
              onChangeText={(text: string) => setForm((prev) => ({ ...prev, address: text }))}
            />

            {isPhysical ? (
              <CleanInput
                label="NEAREST LANDMARK"
                placeholder="e.g. Opposite GTBank"
                value={form.landmark}
                onChangeText={(text: string) => setForm((prev) => ({ ...prev, landmark: text }))}
              />
            ) : (
              <CleanInput
                label="SERVICE AREAS"
                placeholder="e.g. Ikeja, Alimosho, Oshodi"
                value={form.serviceAreas}
                onChangeText={(text: string) => setForm((prev) => ({ ...prev, serviceAreas: text }))}
              />
            )}
          </IndustrialCard>

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
