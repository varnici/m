import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StatusBar, KeyboardAvoidingView, Platform, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RootStackScreenProps } from '@/navigation/types';
import { ShieldCheck, ArrowRight, Info, HelpCircle, FileText } from 'lucide-react-native';
import { useOnboarding } from '../../../context/OnboardingContext';

const TaxComplianceScreen = ({
  navigation,
}: RootStackScreenProps<'OnboardingTaxCompliance'>) => {
  const { data, updateData } = useOnboarding();
  
  const [form, setForm] = useState({
    tin: data.tin || '',
    vatRegistered: data.vatRegistered || false,
    willingToRegister: data.willingToRegister || false,
  });

  const handleContinue = () => {
    updateData(form);
    navigation.navigate('OnboardingReview');
  };

  return (
    <SafeAreaView className="flex-1 bg-ventureroot-industrial-background">
      <StatusBar barStyle="light-content" />
      
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <ScrollView contentContainerStyle={{ paddingHorizontal: 32, paddingTop: 60, paddingBottom: 40 }}>
          
          {/* Industrial Header */}
          <View className="mb-12">
            <Text className="text-ventureroot-industrial-primary text-[10px] font-black tracking-[4px] mb-3 uppercase">
              Regulatory Layer
            </Text>
            <Text className="text-ventureroot-industrial-onSurface text-5xl font-black leading-[54px] tracking-tighter">
              TAX &{"\n"}COMPLIANCE
            </Text>
            <View className="w-16 h-1.5 bg-ventureroot-industrial-primary mt-8" />
          </View>

          {/* Institutional Alert */}
          <View className="bg-ventureroot-industrial-surfaceLow p-8 mb-12 flex-row items-center relative overflow-hidden">
             <View className="absolute right-[-10] top-[-10] opacity-5">
                <FileText size={100} color="#CFBFA6" />
             </View>
             <Info size={18} color="#27AE60" />
             <Text className="text-ventureroot-industrial-onSurface text-[11px] leading-5 ml-4 flex-1 font-medium opacity-60">
               Formalized businesses qualify for institutional trade lines and government MSME development grants.
             </Text>
          </View>

          {/* Input Block */}
          <View className="mb-12">
            <Text className="text-ventureroot-industrial-onSurface text-[10px] font-black uppercase tracking-[3px] mb-4 opacity-40">
              Tax Identification Number (TIN)
            </Text>
            <View className="bg-ventureroot-industrial-surfaceLow h-20 justify-center px-8">
                <TextInput 
                  placeholder="00000000-0001"
                  placeholderTextColor="#353535"
                  value={form.tin}
                  onChangeText={(text) => setForm({ ...form, tin: text })}
                  keyboardType="number-pad"
                  className="text-ventureroot-industrial-onSurface text-2xl font-black tracking-widest"
                />
            </View>
            <Text className="text-ventureroot-industrial-primary text-[9px] font-black tracking-widest mt-4 uppercase opacity-40">
              Handshake with FIRS Registry optional at this stage
            </Text>
          </View>

          <Text className="text-ventureroot-industrial-onSurface text-[10px] font-black uppercase tracking-[3px] mb-6 opacity-40">
            Compliance Status
          </Text>

          {/* Toggle Stack */}
          <View className="mb-12">
            <TouchableOpacity
              onPress={() => setForm({ ...form, vatRegistered: !form.vatRegistered })}
              activeOpacity={0.8}
              className={`p-6 mb-4 flex-row items-center ${
                form.vatRegistered ? 'bg-ventureroot-industrial-surfaceHighest' : 'bg-ventureroot-industrial-surfaceLow'
              }`}
            >
              <View className={`w-6 h-6 rounded-full border-4 items-center justify-center mr-6 ${
                form.vatRegistered ? 'border-ventureroot-industrial-primary' : 'border-ventureroot-industrial-surfaceHigh'
              }`}>
                 {form.vatRegistered && <View className="w-2 h-2 rounded-full bg-ventureroot-industrial-primary" />}
              </View>
              <View className="flex-1">
                <Text className={`font-black text-sm uppercase tracking-tight ${form.vatRegistered ? 'text-ventureroot-industrial-onSurface' : 'text-ventureroot-industrial-onSurface opacity-40'}`}>
                   VAT Registered Entity
                </Text>
                <Text className="text-ventureroot-industrial-primary text-[9px] font-black tracking-widest mt-1 uppercase">Value Added Tax Protocol Enabled</Text>
              </View>
            </TouchableOpacity>

            {!form.tin && (
              <TouchableOpacity
                onPress={() => setForm({ ...form, willingToRegister: !form.willingToRegister })}
                activeOpacity={0.8}
                className={`p-6 flex-row items-center ${
                  form.willingToRegister ? 'bg-ventureroot-industrial-surfaceHighest' : 'bg-ventureroot-industrial-surfaceLow'
                }`}
              >
                <View className={`w-6 h-6 rounded-full border-4 items-center justify-center mr-6 ${
                  form.willingToRegister ? 'border-ventureroot-industrial-primary' : 'border-ventureroot-industrial-surfaceHigh'
                }`}>
                   {form.willingToRegister && <View className="w-2 h-2 rounded-full bg-ventureroot-industrial-primary" />}
                </View>
                <View className="flex-1">
                  <Text className={`font-black text-sm uppercase tracking-tight ${form.willingToRegister ? 'text-ventureroot-industrial-onSurface' : 'text-ventureroot-industrial-onSurface opacity-40'}`}>
                     Assist with CAC/FIRS Registration
                  </Text>
                  <Text className="text-ventureroot-industrial-primary text-[9px] font-black tracking-widest mt-1 uppercase">Institutional Support Requested</Text>
                </View>
                <HelpCircle size={18} color={form.willingToRegister ? "#27AE60" : "#2A2A2A"} />
              </TouchableOpacity>
            )}
          </View>

          {/* Security Tier */}
          <View className="flex-row items-start mb-16 opacity-60">
            <ShieldCheck size={20} color="#27AE60" />
            <View className="ml-5 flex-1">
              <Text className="text-ventureroot-industrial-onSurface font-black text-[9px] tracking-[2px] uppercase mb-1">Audit Trail Active</Text>
              <Text className="text-ventureroot-industrial-onSurface text-[10px] leading-4 font-medium">
                Tax identifiers are encrypted via sovereign digital signatures. Compliance metadata is strictly restricted to regulatory APIs.
              </Text>
            </View>
          </View>

          {/* High Stakes Button */}
          <TouchableOpacity 
            onPress={handleContinue}
            activeOpacity={0.8}
            className="h-20 bg-ventureroot-industrial-primary flex-row items-center justify-center px-10"
          >
            <Text className="text-ventureroot-industrial-background font-black text-lg mr-4 uppercase tracking-tighter">
              Commit & Continue
            </Text>
            <ArrowRight size={26} color="#131313" />
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => navigation.navigate('OnboardingTerms')}
            activeOpacity={0.7}
            className="mt-6 h-14 border border-white/10 items-center justify-center"
          >
            <Text className="text-white/40 font-black text-[10px] tracking-[3px] uppercase">Skip_Compliance_For_Now</Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default TaxComplianceScreen;
