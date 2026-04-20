import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import type { RootStackScreenProps } from '@/navigation/types';
import { useOnboarding } from '../../../context/OnboardingContext';
import { BowlHeader, CleanCard, CleanInput, RichButton } from '../../../components/ThemeComponents';

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

  const isFormValid = form.businessName.trim().length > 0;

  const handleContinue = useCallback(() => {
    updateData({
      ...form,
      businessName: form.businessName.trim(),
      tradingName: form.tradingName.trim(),
    });
    navigation.navigate('OnboardingCategory');
  }, [form, updateData, navigation]);

  const handleOwnershipChange = useCallback((opt: string) => {
    setForm((prev) => ({ ...prev, ownershipType: opt }));
  }, []);

  const handleRegistrationChange = useCallback((opt: string) => {
    setForm((prev) => ({ ...prev, registrationStatus: opt }));
  }, []);

  return (
    <View className="flex-1 bg-ventureroot-clean-background">
      <StatusBar barStyle="light-content" />

      <BowlHeader
        title="Business Information"
        subtitle="Provide your shop profile so we can tailor the rest of your onboarding." 
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
            Shop Profile
          </Text>

          <CleanCard>
            <CleanInput
              label="REGISTERED BUSINESS NAME"
              placeholder="e.g. Acme Retail Ventures"
              value={form.businessName}
              onChangeText={(val: string) => setForm((prev) => ({ ...prev, businessName: val }))}
            />

            <CleanInput
              label="TRADING NAME (IF DIFFERENT)"
              placeholder="e.g. Oga's Shop"
              value={form.tradingName}
              onChangeText={(val: string) => setForm((prev) => ({ ...prev, tradingName: val }))}
            />

            <CleanInput
              label="YEARS IN OPERATION"
              placeholder="0"
              value={form.yearsInOperation.toString()}
              onChangeText={(val: string) => setForm((prev) => ({ ...prev, yearsInOperation: parseInt(val) || 0 }))}
              keyboardType="number-pad"
            />

            <View className="mb-6">
              <Text className="text-ventureroot-clean-text font-semibold mb-2 ml-1">
                Ownership Type
              </Text>
              <View className="flex-row flex-wrap gap-3">
                {['Rented', 'Owned', 'Mobile'].map((option) => (
                  <TouchableOpacity
                    key={option}
                    onPress={() => handleOwnershipChange(option)}
                    className={`flex-1 py-4 rounded-xl items-center border-2 ${
                      form.ownershipType === option 
                      ? 'bg-ventureroot-green/5 border-ventureroot-green' 
                      : 'bg-white border-slate-100 shadow-sm'
                    }`}
                  >
                    <Text className={`text-sm font-semibold ${form.ownershipType === option ? 'text-ventureroot-green' : 'text-ventureroot-clean-text'}`}>
                      {option}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View>
              <Text className="text-ventureroot-clean-text font-semibold mb-2 ml-1">
                Registration Status
              </Text>
              <View className="flex-row flex-wrap gap-3">
                {['Registered', 'Not Registered'].map((option) => (
                  <TouchableOpacity
                    key={option}
                    onPress={() => handleRegistrationChange(option)}
                    className={`flex-1 py-4 rounded-xl items-center border-2 ${
                      form.registrationStatus === option 
                      ? 'bg-ventureroot-green/5 border-ventureroot-green' 
                      : 'bg-white border-slate-100 shadow-sm'
                    }`}
                  >
                    <Text className={`text-sm font-semibold ${form.registrationStatus === option ? 'text-ventureroot-green' : 'text-ventureroot-clean-text'}`}>
                      {option}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </CleanCard>

          <View className="mt-8">
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
