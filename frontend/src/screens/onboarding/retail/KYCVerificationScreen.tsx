import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, SafeAreaView, StatusBar, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ShieldCheck, ShieldAlert, ChevronRight, FingerprintPattern } from 'lucide-react-native';
import { useOnboarding } from '../../../context/OnboardingContext';

const ID_TYPES = [
  { label: 'National ID (NIN)', value: 'NIN', hint: 'INSTITUTIONAL STANDARD' },
  { label: "Voter’s Card", value: 'VOTER', hint: 'GOVERNMENT ISSUED' },
  { label: 'International Passport', value: 'PASSPORT', hint: 'GLOBAL BIOMETRIC' },
  { label: "Driver’s License", value: 'DL', hint: 'MUNICIPAL REGULATION' },
];

const KYCVerificationScreen = () => {
  const navigation = useNavigation<any>();
  const { data, updateData } = useOnboarding();
  
  const [form, setForm] = useState({
    idType: data.idType || 'NIN',
    idNumber: data.idNumber || '',
  });

  const handleContinue = () => {
    updateData(form);
    navigation.navigate('OnboardingFaceVerification');
  };

  const isFormValid = form.idNumber.length >= 8;

  return (
    <SafeAreaView className="flex-1 bg-ventureroot-industrial-background">
      <StatusBar barStyle="light-content" />
      
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <ScrollView contentContainerStyle={{ paddingHorizontal: 32, paddingTop: 60, paddingBottom: 40 }}>
          
          {/* Industrial Header */}
          <View className="mb-12">
            <Text className="text-ventureroot-industrial-primary text-[10px] font-black tracking-[4px] mb-3 uppercase">
              Compliance Layer
            </Text>
            <Text className="text-ventureroot-industrial-onSurface text-5xl font-black leading-[54px] tracking-tighter">
              IDENTITY{"\n"}ANCHOR
            </Text>
            <View className="w-16 h-1.5 bg-ventureroot-industrial-primary mt-8" />
          </View>

          {/* Compliance Tonal Block */}
          <View className="bg-ventureroot-industrial-surfaceLow p-8 mb-12 relative overflow-hidden">
             <View className="absolute right-[-20] top-[-20] opacity-5">
                <ShieldAlert size={120} color="#CFBFA6" />
             </View>
             <View className="flex-row items-center mb-4">
                <FingerprintPattern size={20} color="#27AE60" />
                <Text className="text-ventureroot-industrial-onSurface font-black text-[10px] tracking-[3px] uppercase ml-4">Registry Protocols</Text>
             </View>
             <Text className="text-ventureroot-industrial-onSurface text-xs leading-5 opacity-50 font-medium">
               Select your primary identification anchor. All data is processed through institutional encryption layers.
             </Text>
          </View>

          <Text className="text-ventureroot-industrial-onSurface text-[10px] font-black uppercase tracking-[3px] mb-6 opacity-40">
            Document Selection
          </Text>

          {/* Selection Stack */}
          <View className="mb-12">
            {ID_TYPES.map((type) => (
              <TouchableOpacity
                key={type.value}
                onPress={() => setForm({ ...form, idType: type.value })}
                activeOpacity={0.8}
                className={`p-6 mb-4 flex-row items-center transition-all ${
                  form.idType === type.value 
                  ? 'bg-ventureroot-industrial-surfaceHighest' 
                  : 'bg-ventureroot-industrial-surfaceLow'
                }`}
              >
                <View className={`w-6 h-6 rounded-full border-4 items-center justify-center mr-6 ${
                  form.idType === type.value ? 'border-ventureroot-industrial-primary' : 'border-ventureroot-industrial-surfaceHigh'
                }`}>
                  {form.idType === type.value && <View className="w-2 h-2 rounded-full bg-ventureroot-industrial-primary" />}
                </View>
                <View className="flex-1">
                  <Text className={`font-black text-sm uppercase tracking-tight ${form.idType === type.value ? 'text-ventureroot-industrial-onSurface' : 'text-ventureroot-industrial-onSurface opacity-40'}`}>
                    {type.label}
                  </Text>
                  <Text className="text-ventureroot-industrial-primary text-[9px] font-black tracking-widest mt-1">{type.hint}</Text>
                </View>
                <ChevronRight size={18} color={form.idType === type.value ? '#27AE60' : '#2A2A2A'} />
              </TouchableOpacity>
            ))}
          </View>

          {/* Input Block */}
          <View className="bg-ventureroot-industrial-surfaceLow p-8 mb-12">
            <Text className="text-ventureroot-industrial-onSurface text-[10px] font-black uppercase tracking-[3px] mb-4 opacity-40">
              Identity Number
            </Text>
            <View className="bg-ventureroot-industrial-surfaceHigh h-16 justify-center px-6">
                <Text className="bg-transparent text-ventureroot-industrial-onSurface text-xl font-black tracking-widest"
                      style={{ color: isFormValid ? '#FFFFFF' : '#666666' }}>
                   {form.idNumber || 'XXXX-XXXX-XXXX'}
                </Text>
                {/* Simplified input for logic - in real app we'd use a masked input or custom TextInput */}
                <Text className="hidden">{form.idNumber}</Text> 
            </View>
            {/* Real Input Overlay (Transparent) */}
            <View className="mt-[-64] h-16 opacity-0">
               <TouchableOpacity className="flex-1" onPress={() => {/* Trigger input modal or focus */}} />
            </View>
          </View>

          {/* Security Tier */}
          <View className="flex-row items-start mb-16 opacity-60">
            <ShieldCheck size={20} color="#27AE60" />
            <View className="ml-5 flex-1">
              <Text className="text-ventureroot-industrial-onSurface font-black text-[9px] tracking-[2px] uppercase mb-1">Encryption Tier 4</Text>
              <Text className="text-ventureroot-industrial-onSurface text-[10px] leading-4 font-medium">
                Identity data is verified via real-time biometric handshake. No local storage of sensitive identifiers.
              </Text>
            </View>
          </View>

          {/* High Stakes Buttons */}
          <TouchableOpacity 
            onPress={handleContinue}
            disabled={!isFormValid}
            activeOpacity={0.8}
            style={{ 
              height: 72, 
              backgroundColor: isFormValid ? colors.ventureroot.industrial.primary : 'rgba(255,255,255,0.05)',
              flexDirection: 'row', 
              alignItems: 'center', 
              justifyContent: 'center',
              marginBottom: 16
            }}
          >
            <IndustrialText style={{ 
              color: isFormValid ? '#131313' : 'rgba(255,255,255,0.2)', 
              fontWeight: '900', 
              letterSpacing: -0.5,
              fontSize: 16,
              marginRight: 10
            }}>
              ID VERIFICATION SCAN
            </IndustrialText>
            <ChevronRight size={20} color={isFormValid ? "#131313" : "rgba(255,255,255,0.1)"} />
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => navigation.navigate('OnboardingFaceVerification')}
            activeOpacity={0.7}
            style={{ 
              height: 56, 
              borderWidth: 1, 
              borderColor: 'rgba(255,255,255,0.1)',
              alignItems: 'center', 
              justifyContent: 'center'
            }}
          >
            <IndustrialText variant="label" style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, letterSpacing: 2 }}>
              COMPLETE_KYC_LATER
            </IndustrialText>
          </TouchableOpacity>


        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default KYCVerificationScreen;
