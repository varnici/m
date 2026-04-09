import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, SafeAreaView, StatusBar, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MapPin, Camera, Navigation, ArrowRight, LocateFixed, Store, Smartphone, CheckCircle2 } from 'lucide-react-native';
import { useOnboarding } from '../../../context/OnboardingContext';
import { BowlHeader, CleanCard, CleanInput, IndustrialButton, IndustrialCard } from '../../../components/ThemeComponents';


const LocationScreen = () => {
  const navigation = useNavigation<any>();
  const { data, updateData } = useOnboarding();
  
  const [isPhysical, setIsPhysical] = useState(data.isPhysicalStore ?? true);
  const [form, setForm] = useState({
    state: data.state || '',
    lga: data.lga || '',
    address: data.address || '',
    landmark: data.landmark || '',
    serviceAreas: data.serviceAreas || '',
    gpsPin: data.gpsPin || { latitude: 6.5244, longitude: 3.3792 },
  });

  const handleContinue = () => {
    updateData({ ...form, isPhysicalStore: isPhysical });
    navigation.navigate('OnboardingKYC');
  };

  const isFormValid = form.state && form.lga && form.address;

  return (
    <SafeAreaView className="flex-1 bg-ventureroot-industrial-background">
      <StatusBar barStyle="light-content" />
      <BowlHeader 
        title="Where do you operate?" 
        subtitle="This helps us connect you to the nearest distribution cluster."
      />
      
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40 }}>
          
          {/* Path Toggle - Tonal Shift Style */}
          <View className="flex-row bg-ventureroot-industrial-surfaceLow p-1.5 rounded-2xl mb-8">
            <TouchableOpacity 
              onPress={() => setIsPhysical(true)}
              activeOpacity={0.7}
              className={`flex-1 flex-row items-center justify-center py-3 rounded-xl ${isPhysical ? 'bg-ventureroot-industrial-surfaceHigh shadow-lg' : ''}`}
            >
              <Store size={18} color={isPhysical ? '#88d982' : '#94A3B8'} />
              <Text className={`ml-2 text-[10px] font-black uppercase tracking-widest ${isPhysical ? 'text-ventureroot-industrial-primary' : 'text-slate-500'}`}>
                Physical Store
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={() => setIsPhysical(false)}
              activeOpacity={0.7}
              className={`flex-1 flex-row items-center justify-center py-3 rounded-xl ${!isPhysical ? 'bg-ventureroot-industrial-surfaceHigh shadow-lg' : ''}`}
            >
              <Smartphone size={18} color={!isPhysical ? '#88d982' : '#94A3B8'} />
              <Text className={`ml-2 text-[10px] font-black uppercase tracking-widest ${!isPhysical ? 'text-ventureroot-industrial-primary' : 'text-slate-500'}`}>
                Online / Mobile
              </Text>
            </TouchableOpacity>
          </View>

          <Text className="text-ventureroot-industrial-primary text-[10px] font-black uppercase tracking-[2px] mb-4 ml-1">
            {isPhysical ? 'STORE LOCATION' : 'OPERATING BASE'}
          </Text>

          <IndustrialCard className="mb-8">
            <View className="flex-row gap-4">
              <View className="flex-1">
                <CleanInput 
                  label="STATE"
                  placeholder="e.g. Lagos"
                  value={form.state}
                  onChangeText={(text: string) => setForm({ ...form, state: text })}
                />
              </View>
              <View className="flex-1">
                <CleanInput 
                  label="LGA"
                  placeholder="e.g. Ikeja"
                  value={form.lga}
                  onChangeText={(text: string) => setForm({ ...form, lga: text })}
                />
              </View>
            </View>

            <CleanInput 
              label={isPhysical ? "FULL STREET ADDRESS" : "WAREHOUSE / OFFICE ADDRESS"}
              placeholder="e.g. 24, Allen Avenue"
              value={form.address}
              onChangeText={(text: string) => setForm({ ...form, address: text })}
            />

            {isPhysical ? (
              <CleanInput 
                label="NEAREST LANDMARK"
                placeholder="e.g. Opposite GTBank"
                value={form.landmark}
                onChangeText={(text: string) => setForm({ ...form, landmark: text })}
              />
            ) : (
              <CleanInput 
                label="SERVICE AREAS"
                placeholder="e.g. Ikeja, Alimosho, Oshodi"
                value={form.serviceAreas}
                onChangeText={(text: string) => setForm({ ...form, serviceAreas: text })}
              />
            )}
          </IndustrialCard>

          {/* Visual Verification - Industrial Style */}
          <Text className="text-ventureroot-industrial-onSurface text-[10px] font-black uppercase tracking-[2px] mb-4 ml-1 opacity-50">
            VISUAL VERIFICATION
          </Text>
          
          <TouchableOpacity 
            activeOpacity={0.8}
            className="border border-ventureroot-industrial-outline/20 border-dashed p-10 rounded-3xl items-center justify-center bg-ventureroot-industrial-surfaceLow mb-8"
          >
            <View className="w-16 h-16 bg-ventureroot-industrial-surfaceHigh rounded-full items-center justify-center mb-4">
              <Camera size={32} color="#88d982" />
            </View>
            <Text className="text-ventureroot-white font-bold text-center">
              {isPhysical ? 'Upload Shop Front Photo' : 'Upload Proof of Stock'}
            </Text>
            <Text className="text-ventureroot-industrial-onSurface opacity-50 text-xs text-center mt-2 px-4 italic">
              {isPhysical 
                ? 'Ensure signpost or shop contents are clearly visible' 
                : 'Take a clear photo of your stock or digital storefront'}
            </Text>
          </TouchableOpacity>

          {/* Global GPS Mapping - Monolith Style */}
          <View className="bg-ventureroot-industrial-surfaceHighest p-6 rounded-3xl mb-10 overflow-hidden relative">
            <View className="absolute top-0 right-0 p-4">
               <MapPin size={120} color="#88d982" opacity={0.05} />
            </View>
            
            <View className="flex-row items-center z-10">
              <View className="w-12 h-12 bg-ventureroot-industrial-background rounded-xl items-center justify-center border border-ventureroot-industrial-outline/30">
                <LocateFixed size={24} color="#88d982" />
              </View>
              <View className="ml-4 flex-1">
                <Text className="text-ventureroot-white font-bold text-lg">Verification GPS Pin</Text>
                <Text className="text-ventureroot-industrial-onSurface opacity-60 text-[11px] mt-1 leading-4">
                  Automatically capturing coordinates for node validation.
                </Text>
              </View>
              <TouchableOpacity className="bg-ventureroot-industrial-primary/10 p-2 rounded-lg">
                <ArrowRight size={20} color="#88d982" />
              </TouchableOpacity>
            </View>
          </View>

          <IndustrialButton 
            title="Continue to KYC" 
            onPress={handleContinue}
            disabled={!isFormValid}
          />

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default LocationScreen;
