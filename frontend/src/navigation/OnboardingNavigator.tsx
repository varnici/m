import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { OnboardingStackParamList } from './types';

import AccountTypeScreen from '@/screens/onboarding/retail/AccountTypeScreen';
import PhoneRegistrationScreen from '@/screens/onboarding/retail/PhoneRegistrationScreen';
import BasicInfoScreen from '@/screens/onboarding/retail/BasicInfoScreen';
import ShopInformationScreen from '@/screens/onboarding/retail/ShopInformationScreen';
import BusinessCategoryScreen from '@/screens/onboarding/retail/BusinessCategoryScreen';
import MarketAssociationScreen from '@/screens/onboarding/retail/MarketAssociationScreen';
import LocationScreen from '@/screens/onboarding/retail/LocationScreen';
import StoreVerificationScreen from '@/screens/onboarding/retail/StoreVerificationScreen';
import KYCVerificationScreen from '@/screens/onboarding/retail/KYCVerificationScreen';
import FaceVerificationScreen from '@/screens/onboarding/retail/FaceVerificationScreen';
import POSRegistrationScreen from '@/screens/onboarding/retail/POSRegistrationScreen';
import BankLinkScreen from '@/screens/onboarding/retail/BankLinkScreen';
import InventorySnapshotScreen from '@/screens/onboarding/retail/InventorySnapshotScreen';
import SalesEstimationScreen from '@/screens/onboarding/retail/SalesEstimationScreen';
import TaxComplianceScreen from '@/screens/onboarding/retail/TaxComplianceScreen';
import TermsScreen from '@/screens/onboarding/retail/TermsScreen';
import ActivationScreen from '@/screens/onboarding/retail/ActivationScreen';
import OnboardingReviewScreen from '@/screens/onboarding/retail/OnboardingReviewScreen';

// Distributor onboarding screens
import DistributorCompanyScreen from '@/screens/onboarding/distributor/DistributorCompanyScreen';
import DistributorOperationsScreen from '@/screens/onboarding/distributor/DistributorOperationsScreen';
import DistributorDirectorScreen from '@/screens/onboarding/distributor/DistributorDirectorScreen';
import DistributorBankScreen from '@/screens/onboarding/distributor/DistributorBankScreen';
import DistributorTermsScreen from '@/screens/onboarding/distributor/DistributorTermsScreen';

// Logistics onboarding screens
import LogisticsCompanyScreen from '@/screens/onboarding/logistics/LogisticsCompanyScreen';
import LogisticsFleetScreen from '@/screens/onboarding/logistics/LogisticsFleetScreen';
import LogisticsDriverScreen from '@/screens/onboarding/logistics/LogisticsDriverScreen';
import LogisticsInsuranceScreen from '@/screens/onboarding/logistics/LogisticsInsuranceScreen';
import LogisticsTermsScreen from '@/screens/onboarding/logistics/LogisticsTermsScreen';

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
      <Stack.Screen name="OnboardingMarketAssociation" component={MarketAssociationScreen} />
      <Stack.Screen name="OnboardingLocation" component={LocationScreen} />
      <Stack.Screen name="OnboardingStoreVerification" component={StoreVerificationScreen} />
      <Stack.Screen name="OnboardingKYC" component={KYCVerificationScreen} />
      <Stack.Screen name="OnboardingFaceVerification" component={FaceVerificationScreen} />
      <Stack.Screen name="OnboardingPOSRegistration" component={POSRegistrationScreen} />
      <Stack.Screen name="OnboardingBankLink" component={BankLinkScreen} />
      <Stack.Screen name="OnboardingInventory" component={InventorySnapshotScreen} />
      <Stack.Screen name="OnboardingSalesEstimation" component={SalesEstimationScreen} />
      <Stack.Screen name="OnboardingTaxCompliance" component={TaxComplianceScreen} />
      <Stack.Screen name="OnboardingTerms" component={TermsScreen} />
      <Stack.Screen name="OnboardingActivation" component={ActivationScreen} />
      <Stack.Screen name="OnboardingReview" component={OnboardingReviewScreen} />

      {/* Distributor onboarding */}
      <Stack.Screen name="DistributorCompany" component={DistributorCompanyScreen} />
      <Stack.Screen name="DistributorOperations" component={DistributorOperationsScreen} />
      <Stack.Screen name="DistributorDirector" component={DistributorDirectorScreen} />
      <Stack.Screen name="DistributorBank" component={DistributorBankScreen} />
      <Stack.Screen name="DistributorTerms" component={DistributorTermsScreen} />

      {/* Logistics onboarding */}
      <Stack.Screen name="LogisticsCompany" component={LogisticsCompanyScreen} />
      <Stack.Screen name="LogisticsFleet" component={LogisticsFleetScreen} />
      <Stack.Screen name="LogisticsDriver" component={LogisticsDriverScreen} />
      <Stack.Screen name="LogisticsInsurance" component={LogisticsInsuranceScreen} />
      <Stack.Screen name="LogisticsTerms" component={LogisticsTermsScreen} />
    </Stack.Navigator>
  );
};

export default OnboardingNavigator;
