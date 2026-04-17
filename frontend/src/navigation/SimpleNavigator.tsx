import React, { useEffect, useMemo, useState } from 'react';
import type { RootStackNavigation, RootStackParamList } from './types';
import { setCurrentRouteName } from '@/lib/errorLogger';
import WelcomeScreen from '@/screens/auth/WelcomeScreen';
import LoginScreen from '@/screens/auth/LoginScreen';
import RegisterScreen from '@/screens/auth/RegisterScreen';
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

type RouteName = keyof RootStackParamList;
type RouteEntry = {
  name: RouteName;
  params?: RootStackParamList[RouteName];
};

const SCREEN_MAP: Record<RouteName, React.ComponentType<any>> = {
  Welcome: WelcomeScreen,
  Login: LoginScreen,
  Register: RegisterScreen,
  RoleSelection: RoleSelectionScreen,
  BVNVerification: BVNVerificationScreen,
  PINSetup: PINSetupScreen,
  BiometricSetup: BiometricSetupScreen,
  Dashboard: DashboardScreen,
  Wallet: WalletScreen,
  LoanDashboard: LoanDashboardScreen,
  SalesDashboard: SalesDashboardScreen,
  More: MoreScreen,
  InventoryDashboard: InventoryDashboardScreen,
  StockLodger: StockLodgerScreen,
  VoiceStock: VoiceStockScreen,
  ScanShelve: ScanShelveScreen,
  RecordSale: RecordSaleScreen,
  InsuranceSummary: InsuranceSummaryScreen,
  FileClaim: FileClaimScreen,
  Repayment: RepaymentScreen,
  Withdrawal: WithdrawalScreen,
  SavingsGoals: SavingsGoalsScreen,
  ApplyLoan: ApplyLoanScreen,
  ContractViewer: ContractViewerScreen,
  SalesHistory: SalesHistoryScreen,
  SalesVelocity: SalesVelocityScreen,
  ClaimHistory: ClaimHistoryScreen,
  CreditDashboard: CreditDashboardScreen,
  ClusterPickup: ClusterPickupScreen,
  PoolDetail: PoolDetailScreen,
  PoolList: PoolListScreen,
  OnboardingAccountType: AccountTypeScreen,
  OnboardingPhone: PhoneRegistrationScreen,
  OnboardingBasicInfo: BasicInfoScreen,
  OnboardingShopInfo: ShopInformationScreen,
  OnboardingCategory: BusinessCategoryScreen,
  OnboardingLocation: LocationScreen,
  OnboardingKYC: KYCVerificationScreen,
  OnboardingFaceVerification: FaceVerificationScreen,
  OnboardingBankLink: BankLinkScreen,
  OnboardingInventory: InventorySnapshotScreen,
  OnboardingSalesEstimation: SalesEstimationScreen,
  OnboardingTaxCompliance: TaxComplianceScreen,
  OnboardingTerms: TermsScreen,
  OnboardingActivation: ActivationScreen,
  OnboardingReview: OnboardingReviewScreen,
};

const SimpleNavigator = () => {
  const [stack, setStack] = useState<RouteEntry[]>([{ name: 'Welcome' }]);

  const navigation: RootStackNavigation = useMemo(
    () => ({
      navigate: (name, ...args) => {
        const params = args[0] as RootStackParamList[typeof name] | undefined;
        setStack((prev) => [...prev, { name, params }]);
      },
      goBack: () => {
        setStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
      },
      replace: (name, ...args) => {
        const params = args[0] as RootStackParamList[typeof name] | undefined;
        setStack((prev) => [...prev.slice(0, -1), { name, params }]);
      },
      reset: (state) => {
        if (!state.routes.length) return;
        const next = state.routes.map((route) => ({
          name: route.name,
          params: route.params,
        })) as RouteEntry[];
        setStack(next);
      },
    }),
    [],
  );

  const current = stack[stack.length - 1];
  const ActiveScreen = SCREEN_MAP[current.name];

  useEffect(() => {
    setCurrentRouteName(current.name);
    console.log(`[NavTrace] route=${current.name} depth=${stack.length}`);
  }, [current.name, stack.length]);

  return (
    <ActiveScreen
      navigation={navigation}
      route={{
        key: `${current.name}-${stack.length - 1}`,
        name: current.name,
        params: current.params,
      }}
    />
  );
};

export default SimpleNavigator;
