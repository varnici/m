import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { OnboardingStackParamList } from './types';

import AccountTypeScreen from '@/screens/onboarding/retail/AccountTypeScreen';
import PhoneRegistrationScreen from '@/screens/onboarding/retail/PhoneRegistrationScreen';
import BasicInfoScreen from '@/screens/onboarding/retail/BasicInfoScreen';
import ShopInformationScreen from '@/screens/onboarding/retail/ShopInformationScreen';
import BusinessCategoryScreen from '@/screens/onboarding/retail/BusinessCategoryScreen';
import LocationScreen from '@/screens/onboarding/retail/LocationScreen';
import KYCVerificationScreen from '@/screens/onboarding/retail/KYCVerificationScreen';
import FaceVerificationScreen from '@/screens/onboarding/retail/FaceVerificationScreen';
import BankLinkScreen from '@/screens/onboarding/retail/BankLinkScreen';
import InventorySnapshotScreen from '@/screens/onboarding/retail/InventorySnapshotScreen';
import SalesEstimationScreen from '@/screens/onboarding/retail/SalesEstimationScreen';
import TaxComplianceScreen from '@/screens/onboarding/retail/TaxComplianceScreen';
import TermsScreen from '@/screens/onboarding/retail/TermsScreen';
import ActivationScreen from '@/screens/onboarding/retail/ActivationScreen';
import OnboardingReviewScreen from '@/screens/onboarding/retail/OnboardingReviewScreen';

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

const OnboardingNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_bottom',
      }}
    >
      <Stack.Screen name="OnboardingAccountType" component={AccountTypeScreen} />
      <Stack.Screen name="OnboardingPhone" component={PhoneRegistrationScreen} />
      <Stack.Screen name="OnboardingBasicInfo" component={BasicInfoScreen} />
      <Stack.Screen name="OnboardingShopInfo" component={ShopInformationScreen} />
      <Stack.Screen name="OnboardingCategory" component={BusinessCategoryScreen} />
      <Stack.Screen name="OnboardingLocation" component={LocationScreen} />
      <Stack.Screen name="OnboardingKYC" component={KYCVerificationScreen} />
      <Stack.Screen name="OnboardingFaceVerification" component={FaceVerificationScreen} />
      <Stack.Screen name="OnboardingBankLink" component={BankLinkScreen} />
      <Stack.Screen name="OnboardingInventory" component={InventorySnapshotScreen} />
      <Stack.Screen name="OnboardingSalesEstimation" component={SalesEstimationScreen} />
      <Stack.Screen name="OnboardingTaxCompliance" component={TaxComplianceScreen} />
      <Stack.Screen name="OnboardingTerms" component={TermsScreen} />
      <Stack.Screen name="OnboardingActivation" component={ActivationScreen} />
      <Stack.Screen name="OnboardingReview" component={OnboardingReviewScreen} />
    </Stack.Navigator>
  );
};

export default OnboardingNavigator;
