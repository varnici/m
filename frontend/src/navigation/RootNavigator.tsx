import { createStackNavigator } from '@react-navigation/stack';
import { RootStackParamList } from './types';
import WelcomeScreen from '@/screens/auth/WelcomeScreen';
import LoginScreen from '@/screens/auth/LoginScreen';
import RoleSelectionScreen from '@/screens/auth/RoleSelectionScreen';
import BVNVerificationScreen from '@/screens/auth/BVNVerificationScreen';
import PINSetupScreen from '@/screens/auth/PINSetupScreen';
import BiometricSetupScreen from '@/screens/auth/BiometricSetupScreen';
import DashboardScreen from '@/screens/DashboardScreen';
import WalletScreen from '@/screens/wallet/WalletScreen';
import LoanDashboardScreen from '@/screens/loans/LoanDashboardScreen';
import SalesDashboardScreen from '@/screens/sales/SalesDashboardScreen';
import MoreScreen from '@/screens/more/MoreScreen';
import InventoryDashboardScreen from '@/screens/inventory/InventoryDashboardScreen';
import StockLodgerScreen from '@/screens/inventory/StockLodgerScreen';
import VoiceStockScreen from '@/screens/inventory/VoiceStockScreen';
import ScanShelveScreen from '@/screens/inventory/ScanShelveScreen';
import RecordSaleScreen from '@/screens/sales/RecordSaleScreen';
import InsuranceSummaryScreen from '@/screens/insurance/InsuranceSummaryScreen';
import FileClaimScreen from '@/screens/insurance/FileClaimScreen';
import RepaymentScreen from '@/screens/wallet/RepaymentScreen';
import WithdrawalScreen from '@/screens/wallet/WithdrawalScreen';
import SavingsGoalsScreen from '@/screens/wallet/SavingsGoalsScreen';
import ApplyLoanScreen from '@/screens/loans/ApplyLoanScreen';
import ContractViewerScreen from '@/screens/loans/ContractViewerScreen';
import SalesHistoryScreen from '@/screens/sales/SalesHistoryScreen';
import SalesVelocityScreen from '@/screens/sales/SalesVelocityScreen';
import ClaimHistoryScreen from '@/screens/insurance/ClaimHistoryScreen';
import CreditDashboardScreen from '@/screens/credit/CreditDashboardScreen';
import ClusterPickupScreen from '@/screens/pools/ClusterPickupScreen';
import PoolDetailScreen from '@/screens/pools/PoolDetailScreen';
import PoolListScreen from '@/screens/pools/PoolListScreen';

// Onboarding Retail Screens
import AccountTypeScreen from '@/screens/onboarding/retail/AccountTypeScreen';
import PhoneRegistrationScreen from '@/screens/onboarding/retail/PhoneRegistrationScreen';
import BasicInfoScreen from '@/screens/onboarding/retail/BasicInfoScreen';
import ShopInformationScreen from '@/screens/onboarding/retail/ShopInformationScreen';
import BusinessCategoryScreen from '@/screens/onboarding/retail/BusinessCategoryScreen';
import LocationScreen from '@/screens/onboarding/retail/LocationScreen';
import KYCVerificationScreen from '@/screens/onboarding/retail/KYCVerificationScreen';
import TaxComplianceScreen from '@/screens/onboarding/retail/TaxComplianceScreen';
import TermsScreen from '@/screens/onboarding/retail/TermsScreen';
import FaceVerificationScreen from '@/screens/onboarding/retail/FaceVerificationScreen';
import ActivationScreen from '@/screens/onboarding/retail/ActivationScreen';
import OnboardingReviewScreen from '@/screens/onboarding/retail/OnboardingReviewScreen';
import BankLinkScreen from '@/screens/onboarding/retail/BankLinkScreen';
import InventorySnapshotScreen from '@/screens/onboarding/retail/InventorySnapshotScreen';
import SalesEstimationScreen from '@/screens/onboarding/retail/SalesEstimationScreen';

// Definition moved to ./types.ts

const Stack = createStackNavigator<RootStackParamList>();

const RootNavigator = () => {
  return (
    <Stack.Navigator
        initialRouteName="Welcome"
        screenOptions={{
          headerShown: false,
        }}
      >
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
      <Stack.Screen name="BVNVerification" component={BVNVerificationScreen} />
      <Stack.Screen name="PINSetup" component={PINSetupScreen} />
      <Stack.Screen name="BiometricSetup" component={BiometricSetupScreen} />
      <Stack.Screen name="Dashboard" component={DashboardScreen} />
      <Stack.Screen name="Wallet" component={WalletScreen} />
      <Stack.Screen name="LoanDashboard" component={LoanDashboardScreen} />
      <Stack.Screen name="SalesDashboard" component={SalesDashboardScreen} />
      <Stack.Screen name="More" component={MoreScreen} />
      <Stack.Screen name="InventoryDashboard" component={InventoryDashboardScreen} />
      <Stack.Screen name="StockLodger" component={StockLodgerScreen} />
      <Stack.Screen name="VoiceStock" component={VoiceStockScreen} />
      <Stack.Screen name="ScanShelve" component={ScanShelveScreen} />
      <Stack.Screen name="RecordSale" component={RecordSaleScreen} />
      <Stack.Screen name="InsuranceSummary" component={InsuranceSummaryScreen} />
      <Stack.Screen name="FileClaim" component={FileClaimScreen} />
      <Stack.Screen name="Repayment" component={RepaymentScreen} />
      <Stack.Screen name="Withdrawal" component={WithdrawalScreen} />
      <Stack.Screen name="SavingsGoals" component={SavingsGoalsScreen} />
      <Stack.Screen name="ApplyLoan" component={ApplyLoanScreen} />
      <Stack.Screen name="ContractViewer" component={ContractViewerScreen} />
      <Stack.Screen name="SalesHistory" component={SalesHistoryScreen} />
      <Stack.Screen name="SalesVelocity" component={SalesVelocityScreen} />
      <Stack.Screen name="ClaimHistory" component={ClaimHistoryScreen} />
      <Stack.Screen name="CreditDashboard" component={CreditDashboardScreen} />
      <Stack.Screen name="ClusterPickup" component={ClusterPickupScreen} />
      <Stack.Screen name="PoolDetail" component={PoolDetailScreen} />
      <Stack.Screen name="PoolList" component={PoolListScreen} />

      {/* Onboarding Retail */}
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

export default RootNavigator;
