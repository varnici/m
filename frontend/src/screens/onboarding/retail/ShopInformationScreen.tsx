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

const ShopInformationScreen = ({
  navigation,
}: RootStackScreenProps<'OnboardingShopInfo'>) => {
  const { data, updateData } = useOnboarding();

  const [businessName, setBusinessName] = useState(data.businessName || '');
  const [tradingName, setTradingName] = useState(data.tradingName || '');
  const [yearsInOperation, setYearsInOperation] = useState(
    String(data.yearsInOperation ?? ''),
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
              label="Business Name"
              placeholder="Acme Retail Ventures"
              value={businessName}
              onChangeText={setBusinessName}
            />

            <CleanInput
              label="Trading Name"
              placeholder="Oga's Shop"
              value={tradingName}
              onChangeText={setTradingName}
            />

            <CleanInput
              label="Years in Operation"
              placeholder="e.g. 3"
              value={yearsInOperation}
              onChangeText={setYearsInOperation}
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
                    onPress={() => setOwnershipType(option)}
                    className={`rounded-2xl px-4 py-3 border ${
                      ownershipType === option
                        ? 'border-ventureroot-green bg-ventureroot-green/10'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <Text className={`text-sm font-semibold ${ownershipType === option ? 'text-ventureroot-green' : 'text-ventureroot-clean-text'}`}>
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
                    onPress={() => setRegistrationStatus(option)}
                    className={`rounded-2xl px-4 py-3 border ${
                      registrationStatus === option
                        ? 'border-ventureroot-green bg-ventureroot-green/10'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <Text className={`text-sm font-semibold ${registrationStatus === option ? 'text-ventureroot-green' : 'text-ventureroot-clean-text'}`}>
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
