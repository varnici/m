import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StatusBar, KeyboardAvoidingView, Platform } from 'react-native';
import type { RootStackScreenProps } from '@/navigation/types';
import { useOnboarding } from '../../../context/OnboardingContext';
import { BowlHeader, CleanInput, RichButton } from '../../../components/ThemeComponents';
import { Store, Briefcase, ChevronLeft, CloudUpload } from 'lucide-react-native';


const ShopInformationScreen = ({
  navigation,
}: RootStackScreenProps<'OnboardingShopInfo'>) => {
  const { data, updateData } = useOnboarding();
  
  const [form, setForm] = useState({
    businessName: data.businessName || '',
    tradingName: data.tradingName || '',
    yearsInOperation: data.yearsInOperation || 0,
    ownershipType: data.ownershipType || 'Rented',
    employee_count: data.employee_count || 0,
    registrationStatus: data.registrationStatus || 'Not Registered',
  });

  const handleContinue = () => {
    updateData(form);
    navigation.navigate('OnboardingCategory');
  };

  const isFormValid = form.businessName && form.yearsInOperation >= 0;

  const ownershipOptions = ['Rented', 'Owned', 'Mobile'];
  const registrationOptions = ['Registered', 'Not Registered'];

  return (
    <View className="flex-1 bg-ventureroot-clean-background">
      <StatusBar barStyle="light-content" />
      
      <BowlHeader 
        title="Business Identity" 
        subtitle="Tell us about your venture. This information helps us categorize your business for relevant financing."
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
            <ChevronLeft color="#b0b9c7ff" size={24} />
          </TouchableOpacity>

          <View className="gap-2">
            <CleanInput
              label="REGISTERED BUSINESS NAME"
              placeholder="e.g. Acme Retail Ventures"
              value={form.businessName}
              onChangeText={(businessName: string) => setForm({ ...form, businessName })}
            />

            <CleanInput
              label="TRADING NAME (IF DIFFERENT)"
              placeholder="e.g. Oga's Shop"
              value={form.tradingName}
              onChangeText={(tradingName: string) => setForm({ ...form, tradingName })}
            />

            <CleanInput
              label="YEARS IN OPERATION"
              placeholder="0"
              value={form.yearsInOperation.toString()}
              onChangeText={(val: string) => setForm({ ...form, yearsInOperation: parseInt(val) || 0 })}
              keyboardType="number-pad"
            />

            {/* Ownership Type */}
            <View className="mb-6">
              <Text className="text-ventureroot-clean-text font-semibold mb-3 ml-1">
                SHOP OWNERSHIP
              </Text>
              <View className="flex-row gap-3">
                {ownershipOptions.map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    onPress={() => setForm({ ...form, ownershipType: opt })}
                    className={`flex-1 py-4 rounded-xl items-center border-2 ${
                      form.ownershipType === opt 
                      ? 'bg-ventureroot-green/5 border-ventureroot-green' 
                      : 'bg-white border-slate-100 shadow-sm'
                    }`}
                  >
                    <Text className={`font-bold ${
                      form.ownershipType === opt ? 'text-ventureroot-green' : 'text-slate-400'
                    }`}>
                      {opt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Registration Status */}
            <View className="mb-6">
              <Text className="text-ventureroot-clean-text font-semibold mb-3 ml-1">
                BUSINESS REGISTRATION
              </Text>
              <View className="flex-row gap-3">
                {registrationOptions.map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    onPress={() => setForm({ ...form, registrationStatus: opt })}
                    className={`flex-1 py-4 rounded-xl items-center border-2 ${
                      form.registrationStatus === opt 
                      ? 'bg-ventureroot-green/5 border-ventureroot-green' 
                      : 'bg-white border-slate-100 shadow-sm'
                    }`}
                  >
                    <Text className={`font-bold ${
                      form.registrationStatus === opt ? 'text-ventureroot-green' : 'text-slate-400'
                    }`}>
                      {opt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* CAC Document placeholder */}
            {form.registrationStatus === 'Registered' && (
              <TouchableOpacity className="border-2 border-dashed border-slate-200 p-8 rounded-2xl items-center justify-center bg-slate-50 mb-6">
                <CloudUpload size={32} color="#64748B" opacity={0.5} />
                <Text className="text-slate-600 font-bold mt-4">
                  Upload CAC Certificate
                </Text>
                <Text className="text-slate-400 text-[10px] mt-1">
                  PDF or image (Max 5MB)
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <View className="mt-4">
            <RichButton
              title="Next: Business Category"
              onPress={handleContinue}
              disabled={!isFormValid}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

export default ShopInformationScreen;
