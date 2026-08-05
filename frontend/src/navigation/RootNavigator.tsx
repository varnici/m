import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, AppState, AppStateStatus, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import { useSecurityStore } from '@/store/securityStore';
import { useUserProfileStore } from '@/store/userProfileStore';
import { useOnboardingStore } from '@/store/onboardingStore';
import { useAuth } from '@/context/AuthContext';
import { usePushNotificationRegistration } from '@/hooks/usePushNotificationRegistration';
import { colors } from '@/theme/colors';

import AuthNavigator from './AuthNavigator';
import ResetPasswordScreen from '@/screens/auth/ResetPasswordScreen';
import MainTabNavigator from './MainTabNavigator';
import WorkerTabNavigator from './WorkerTabNavigator';
import DistributorTabNavigator from './DistributorTabNavigator';
import DistributorDashboardScreen from '@/screens/distributor/DistributorDashboardScreen';
import DistributorOrdersScreen from '@/screens/distributor/DistributorOrdersScreen';
import DistributorListScreen from '@/screens/distributor/DistributorListScreen';
import DistributorCatalogScreen from '@/screens/distributor/DistributorCatalogScreen';
import FundTransferReceiptScreen from '@/screens/distributor/FundTransferReceiptScreen';
import ComingSoonScreen from '@/screens/ComingSoonScreen';
import RoleSelectionScreen from '@/screens/auth/RoleSelectionScreen';

import SecurityLockScreen from '@/screens/auth/SecurityLockScreen';
import PINSetupScreen from '@/screens/auth/PINSetupScreen';
import PatternSetupScreen from '@/screens/auth/PatternSetupScreen';
import BiometricSetupScreen from '@/screens/auth/BiometricSetupScreen';
import DashboardScreen from '@/screens/DashboardScreen';
import MoreScreen from '@/screens/more/MoreScreen';
import SettingsScreen from '@/screens/more/SettingsScreen';
import ProfileScreen from '@/screens/more/ProfileScreen';
import SecuritySettingsScreen from '@/screens/more/SecuritySettingsScreen';
import SupportScreen from '@/screens/more/SupportScreen';
import NotificationsScreen from '@/screens/more/NotificationsScreen';
import AccountDetailsScreen from '@/screens/more/AccountDetailsScreen';

import InventoryDashboardScreen from '@/screens/inventory/InventoryDashboardScreen';
import InventoryManagerScreen from '@/screens/inventory/InventoryManagerScreen';
import StockLodgerScreen from '@/screens/inventory/StockLodgerScreen';
import VoiceStockScreen from '@/screens/inventory/VoiceStockScreen';
import ScanShelveScreen from '@/screens/inventory/ScanShelveScreen';
import { ProductListScreen } from '@/screens/inventory/ProductListScreen';
import AddProductScreen from '@/screens/inventory/AddProductScreen';
import EditProductScreen from '@/screens/inventory/EditProductScreen';
import StockAdjustmentScreen from '@/screens/inventory/StockAdjustmentScreen';
import { ProductDetailScreen } from '@/screens/inventory/ProductDetailScreen';
import { PurchaseOrderScreen } from '@/screens/inventory/PurchaseOrderScreen';
import { AIInsightsScreen } from '@/screens/inventory/AIInsightsScreen';
import AIAssistantScreen from '@/screens/inventory/AIAssistantScreen';
import CreatePurchaseOrderScreen from '@/screens/inventory/CreatePurchaseOrderScreen';
import AddSupplierScreen from '@/screens/inventory/AddSupplierScreen';
import PurchaseOrderDetailScreen from '@/screens/inventory/PurchaseOrderDetailScreen';
import InventoryReconciliationScreen from '@/screens/inventory/InventoryReconciliationScreen';
import TradeOrderScreen from '@/screens/inventory/TradeOrderScreen';
import RetailPOSScreen from '@/screens/inventory/RetailPOSScreen';
import LowStockAlertsScreen from '@/screens/inventory/LowStockAlertsScreen';
import StaffActivityScreen from '@/screens/inventory/StaffActivityScreen';
import CategoriesScreen from '@/screens/inventory/CategoriesScreen';
import BusinessTypeSetupScreen from '@/screens/inventory/BusinessTypeSetupScreen';
import ReceiveStockScreen from '@/screens/inventory/ReceiveStockScreen';
import IssueStockScreen from '@/screens/inventory/IssueStockScreen';
import DailyReportScreen from '@/screens/inventory/DailyReportScreen';
import InventoryRegisterScreen from '@/screens/inventory/InventoryRegisterScreen';

import BudgetBestDashboard from '@/screens/budget_best/BudgetBestDashboard';
import BudgetBestDeposit from '@/screens/budget_best/BudgetBestDeposit';
import BudgetBestGoals from '@/screens/budget_best/BudgetBestGoals';
import BudgetBestGoalDetail from '@/screens/budget_best/BudgetBestGoalDetail';
import BudgetBestSettings from '@/screens/budget_best/BudgetBestSettings';
import BudgetBestPolicy from '@/screens/budget_best/BudgetBestPolicy';

import RepaymentScreen from '@/screens/wallet/RepaymentScreen';
import WithdrawalScreen from '@/screens/wallet/WithdrawalScreen';
import SavingsGoalsScreen from '@/screens/wallet/SavingsGoalsScreen';
import WalletScreen from '@/screens/wallet/WalletScreen';
import TransactionHistoryScreen from '@/screens/wallet/TransactionHistoryScreen';

import LoanDashboardScreen from '@/screens/loans/LoanDashboardScreen';
import ActiveLoanScreen from '@/screens/loans/ActiveLoanScreen';
import ApplyLoanScreen from '@/screens/loans/ApplyLoanScreen';
import ContractViewerScreen from '@/screens/loans/ContractViewerScreen';

import SalesDashboardScreen from '@/screens/sales/SalesDashboardScreen';
import RecordSaleScreen from '@/screens/sales/RecordSaleScreen';
import ReceiptScreen from '@/screens/sales/ReceiptScreen';
import SalesHistoryScreen from '@/screens/sales/SalesHistoryScreen';
import SalesVelocityScreen from '@/screens/sales/SalesVelocityScreen';
import AdminMetricsDashboard from '@/screens/admin/AdminMetricsDashboard';

import ClusterPickupScreen from '@/screens/pools/ClusterPickupScreen';
import PoolDetailScreen from '@/screens/pools/PoolDetailScreen';
import PoolListScreen from '@/screens/pools/PoolListScreen';
import ShopScreen from '@/screens/shop/ShopScreen';
import CartScreen from '@/screens/shop/CartScreen';
import CheckoutScreen from '@/screens/shop/CheckoutScreen';
import ShopProductDetailScreen from '@/screens/shop/ShopProductDetailScreen';
import VentureRouteScreen from '@/screens/VentureRouteScreen';
import ShopfrontScreen from '@/screens/shopfront/ShopfrontScreen';
import ProductSavingsScreen from '@/screens/savings/ProductSavingsScreen';
import FinancialLedgerScreen from '@/screens/worker/FinancialLedgerScreen';
import Worker95BusinessDetailScreen from '@/screens/worker/Worker95BusinessDetailScreen';
import Worker95InvestConfirmScreen from '@/screens/worker/Worker95InvestConfirmScreen';
import Worker95ProfileScreen from '@/screens/worker/Worker95ProfileScreen';
import Worker95DividendsScreen from '@/screens/worker/Worker95DividendsScreen';
import InvestmentPortfolioScreen from '@/screens/worker/InvestmentPortfolioScreen';
import InvestmentDetailScreen from '@/screens/worker/InvestmentDetailScreen';

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

import WorkerEmailScreen from '@/screens/onboarding/worker/WorkerEmailScreen';
import WorkerPhoneScreen from '@/screens/onboarding/worker/WorkerPhoneScreen';
import WorkerPasswordScreen from '@/screens/onboarding/worker/WorkerPasswordScreen';
import WorkerOTPScreen from '@/screens/onboarding/worker/WorkerOTPScreen';
import WorkerProfileOnboardingScreen from '@/screens/onboarding/worker/WorkerProfileScreen';
import WorkerEmploymentScreen from '@/screens/onboarding/worker/WorkerEmploymentScreen';
import WorkerIdentityScreen from '@/screens/onboarding/worker/WorkerIdentityScreen';
import WorkerVerificationPendingScreen from '@/screens/onboarding/worker/WorkerVerificationPendingScreen';
import WorkerRiskAssessmentScreen from '@/screens/onboarding/worker/WorkerRiskAssessmentScreen';
import WorkerPINSetupScreen from '@/screens/onboarding/worker/WorkerPINSetupScreen';
import WorkerCompletionScreen from '@/screens/onboarding/worker/WorkerCompletionScreen';

import DistributorCompanyScreen from '@/screens/onboarding/distributor/DistributorCompanyScreen';
import DistributorOperationsScreen from '@/screens/onboarding/distributor/DistributorOperationsScreen';
import DistributorDirectorScreen from '@/screens/onboarding/distributor/DistributorDirectorScreen';
import DistributorBankScreen from '@/screens/onboarding/distributor/DistributorBankScreen';
import DistributorTermsScreen from '@/screens/onboarding/distributor/DistributorTermsScreen';

import LogisticsCompanyScreen from '@/screens/onboarding/logistics/LogisticsCompanyScreen';
import LogisticsFleetScreen from '@/screens/onboarding/logistics/LogisticsFleetScreen';
import LogisticsDriverScreen from '@/screens/onboarding/logistics/LogisticsDriverScreen';
import LogisticsInsuranceScreen from '@/screens/onboarding/logistics/LogisticsInsuranceScreen';
import LogisticsTermsScreen from '@/screens/onboarding/logistics/LogisticsTermsScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

function resolveMainScreen(accountType: string | null) {
  switch (accountType) {
    case 'retail':
      return MainTabNavigator;
    case 'nine_to_five':
      return WorkerTabNavigator;
    case 'distributor':
      return DistributorTabNavigator;
    default:
      return MainTabNavigator;
  }
}

const ONBOARDING_SCREENS = {
  // Retail onboarding
  OnboardingAccountType: AccountTypeScreen,
  OnboardingPhone: PhoneRegistrationScreen,
  OnboardingBasicInfo: BasicInfoScreen,
  OnboardingShopInfo: ShopInformationScreen,
  OnboardingCategory: BusinessCategoryScreen,
  OnboardingMarketAssociation: MarketAssociationScreen,
  OnboardingLocation: LocationScreen,
  OnboardingStoreVerification: StoreVerificationScreen,
  OnboardingKYC: KYCVerificationScreen,
  OnboardingFaceVerification: FaceVerificationScreen,
  OnboardingPOSRegistration: POSRegistrationScreen,
  OnboardingBankLink: BankLinkScreen,
  OnboardingInventory: InventorySnapshotScreen,
  OnboardingSalesEstimation: SalesEstimationScreen,
  OnboardingTaxCompliance: TaxComplianceScreen,
  OnboardingTerms: TermsScreen,
  OnboardingActivation: ActivationScreen,
  OnboardingReview: OnboardingReviewScreen,
  // Worker onboarding
  WorkerEmail: WorkerEmailScreen,
  WorkerPhone: WorkerPhoneScreen,
  WorkerPassword: WorkerPasswordScreen,
  WorkerOTP: WorkerOTPScreen,
  WorkerProfile: WorkerProfileOnboardingScreen,
  WorkerEmployment: WorkerEmploymentScreen,
  WorkerIdentity: WorkerIdentityScreen,
  WorkerVerificationPending: WorkerVerificationPendingScreen,
  WorkerRiskAssessment: WorkerRiskAssessmentScreen,
  WorkerPINSetup: WorkerPINSetupScreen,
  WorkerCompletion: WorkerCompletionScreen,
  DistributorCompany: DistributorCompanyScreen,
  DistributorOperations: DistributorOperationsScreen,
  DistributorDirector: DistributorDirectorScreen,
  DistributorBank: DistributorBankScreen,
  DistributorTerms: DistributorTermsScreen,
  LogisticsCompany: LogisticsCompanyScreen,
  LogisticsFleet: LogisticsFleetScreen,
  LogisticsDriver: LogisticsDriverScreen,
  LogisticsInsurance: LogisticsInsuranceScreen,
  LogisticsTerms: LogisticsTermsScreen,
} as const;

const SESSION_BACKGROUND_TIMEOUT = 30 * 60 * 1000; // 30 minutes

const RootNavigator = () => {
  const { session, isLoading: authLoading, signOut, needsPasswordReset } = useAuth();
  const { isLocked, securityType, setIsLocked, backgroundedAt, setBackgroundedAt } = useSecurityStore();
  const accountType = useUserProfileStore((s) => s.accountType);
  const onboardingComplete = useOnboardingStore((s) => s.isComplete);
  const appState = useRef(AppState.currentState);

  usePushNotificationRegistration(!!session);

  useEffect(() => {
    if (securityType !== 'none') {
      setIsLocked(true);
    }

    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      const wasBackground = appState.current.match(/inactive|background/);
      const comingToForeground = nextAppState === 'active';
      const goingToBackground = nextAppState.match(/inactive|background/);

      if (wasBackground && comingToForeground) {
        if (session && backgroundedAt && Date.now() - backgroundedAt > SESSION_BACKGROUND_TIMEOUT) {
          // Session idle too long — force full sign-out
          setBackgroundedAt(null);
          signOut();
        } else if (securityType !== 'none') {
          setIsLocked(true);
        }
      }

      if (goingToBackground) {
        setBackgroundedAt(Date.now());
      }

      appState.current = nextAppState;
    });

    return () => subscription.remove();
  }, [securityType, setIsLocked, session, backgroundedAt, setBackgroundedAt, signOut]);

  if (authLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.ventureroot.green, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="white" size="large" />
      </View>
    );
  }

  // Only gate with the lock when there is an active session — without one, show Auth
  const showLock = !!session && isLocked && securityType !== 'none';
  const needsOnboarding = session && !accountType;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {needsPasswordReset ? (
        <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} options={{ animation: 'fade' }} />
      ) : showLock ? (
        <Stack.Screen name="SecurityLock" component={SecurityLockScreen} options={{ animation: 'fade' }} />
      ) : !session ? (
        <Stack.Screen name="Auth" component={AuthNavigator} />
      ) : needsOnboarding ? (
        <>
          <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />

          {/* All onboarding screens available from RoleSelection */}
          {Object.entries(ONBOARDING_SCREENS).map(([name, component]) => (
            <Stack.Screen key={name} name={name as keyof RootStackParamList} component={component} />
          ))}

          <Stack.Screen name="Main" component={resolveMainScreen(accountType)} />
        </>
      ) : (
        <>
          <Stack.Screen name="Main" component={resolveMainScreen(accountType)} />

          <Stack.Screen name="Dashboard" component={DashboardScreen} />
          <Stack.Screen name="More" component={MoreScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="SecuritySettings" component={SecuritySettingsScreen} />
          <Stack.Screen name="Support" component={SupportScreen} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} />
          <Stack.Screen name="AccountDetails" component={AccountDetailsScreen} />

          <Stack.Screen name="InventoryDashboard" component={InventoryDashboardScreen} />
          <Stack.Screen name="InventoryManager" component={InventoryManagerScreen} />
          <Stack.Screen name="StockLodger" component={StockLodgerScreen} />
          <Stack.Screen name="VoiceStock" component={VoiceStockScreen} />
          <Stack.Screen name="ScanShelve" component={ScanShelveScreen} />
          <Stack.Screen name="ProductList" component={ProductListScreen} />
          <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
          <Stack.Screen name="AddProduct" component={AddProductScreen} />
          <Stack.Screen name="EditProduct" component={EditProductScreen} />
          <Stack.Screen name="StockAdjustment" component={StockAdjustmentScreen} />
          <Stack.Screen name="PurchaseOrders" component={PurchaseOrderScreen} />
          <Stack.Screen name="AddPurchaseOrder" component={CreatePurchaseOrderScreen} />
          <Stack.Screen name="AddSupplier" component={AddSupplierScreen} />
          <Stack.Screen name="PurchaseOrderDetail" component={PurchaseOrderDetailScreen} />
          <Stack.Screen name="AIInsights" component={AIInsightsScreen} />
          <Stack.Screen name="AIAssistant" component={AIAssistantScreen} />
          <Stack.Screen name="InventoryReconciliation" component={InventoryReconciliationScreen} />
          <Stack.Screen name="TradeOrder" component={TradeOrderScreen} />
          <Stack.Screen name="RetailPOS" component={RetailPOSScreen} />
          <Stack.Screen name="LowStockAlerts" component={LowStockAlertsScreen} />
          <Stack.Screen name="StaffActivity" component={StaffActivityScreen} />
          <Stack.Screen name="Categories" component={CategoriesScreen} />
          <Stack.Screen name="BusinessTypeSetup" component={BusinessTypeSetupScreen} />
          <Stack.Screen name="ReceiveStock" component={ReceiveStockScreen} />
          <Stack.Screen name="IssueStock" component={IssueStockScreen} />
          <Stack.Screen name="DailyReport" component={DailyReportScreen} />
          <Stack.Screen name="InventoryRegister" component={InventoryRegisterScreen} />
          <Stack.Screen name="DistributorHome" component={DistributorDashboardScreen} />
          <Stack.Screen name="DistributorOrders" component={DistributorOrdersScreen} />
          <Stack.Screen name="DistributorList" component={DistributorListScreen} />
          <Stack.Screen name="DistributorCatalog" component={DistributorCatalogScreen} />
          <Stack.Screen name="FundTransferReceipt" component={FundTransferReceiptScreen} />

          <Stack.Screen name="BudgetBestDashboard" component={BudgetBestDashboard} />
          <Stack.Screen name="BudgetBestDeposit" component={BudgetBestDeposit} />
          <Stack.Screen name="BudgetBestGoals" component={BudgetBestGoals} />
          <Stack.Screen name="BudgetBestGoalDetail" component={BudgetBestGoalDetail} />
          <Stack.Screen name="BudgetBestSettings" component={BudgetBestSettings} />
          <Stack.Screen name="BudgetBestPolicy" component={BudgetBestPolicy} />
          <Stack.Screen name="InsuranceSummary" component={BudgetBestDashboard} />
          <Stack.Screen name="FileClaim" component={BudgetBestDashboard} />
          <Stack.Screen name="ClaimHistory" component={BudgetBestDashboard} />

          <Stack.Screen name="Wallet" component={WalletScreen} />
          <Stack.Screen name="Repayment" component={RepaymentScreen} />
          <Stack.Screen name="Withdrawal" component={WithdrawalScreen} />
          <Stack.Screen name="SavingsGoals" component={SavingsGoalsScreen} />
          <Stack.Screen name="TransactionHistory" component={TransactionHistoryScreen} />

          <Stack.Screen name="LoanDashboard" component={LoanDashboardScreen} />
          <Stack.Screen name="ActiveLoan" component={ActiveLoanScreen} />
          <Stack.Screen name="ApplyLoan" component={ApplyLoanScreen} />
          <Stack.Screen name="ContractViewer" component={ContractViewerScreen} />

          <Stack.Screen name="SalesDashboard" component={SalesDashboardScreen} />
          <Stack.Screen name="RecordSale" component={RecordSaleScreen} />
          <Stack.Screen name="Receipt" component={ReceiptScreen} />
          <Stack.Screen name="SalesHistory" component={SalesHistoryScreen} />
          <Stack.Screen name="SalesVelocity" component={SalesVelocityScreen} />
          <Stack.Screen name="AdminMetrics" component={AdminMetricsDashboard} />

          <Stack.Screen name="ClusterPickup" component={ClusterPickupScreen} />
          <Stack.Screen name="PoolDetail" component={PoolDetailScreen} />
          <Stack.Screen name="PoolList" component={PoolListScreen} />
          <Stack.Screen name="Shop" component={ShopScreen} />
          <Stack.Screen name="Cart" component={CartScreen} />
          <Stack.Screen name="Checkout" component={CheckoutScreen} />
          <Stack.Screen name="ShopProductDetail" component={ShopProductDetailScreen} />
          <Stack.Screen name="VentureRoute" component={VentureRouteScreen} />
          <Stack.Screen name="Shopfront" component={ShopfrontScreen} />
          <Stack.Screen name="ProductSavings" component={ProductSavingsScreen} />

          <Stack.Screen name="Worker95BusinessDetail" component={Worker95BusinessDetailScreen} />
          <Stack.Screen name="Worker95InvestConfirm" component={Worker95InvestConfirmScreen} />
          <Stack.Screen name="Worker95Portfolio" component={InvestmentPortfolioScreen as any} />
          <Stack.Screen name="Worker95InvestmentDetail" component={InvestmentDetailScreen as any} />
          <Stack.Screen name="Worker95Ledger" component={FinancialLedgerScreen} />
          <Stack.Screen name="Worker95Profile" component={Worker95ProfileScreen} />
          <Stack.Screen name="Worker95Dividends" component={Worker95DividendsScreen} />

          <Stack.Screen name="PINSetup" component={PINSetupScreen} />
          <Stack.Screen name="PatternSetup" component={PatternSetupScreen} />
          <Stack.Screen name="BiometricSetup" component={BiometricSetupScreen} />

          {Object.entries(ONBOARDING_SCREENS).map(([name, component]) => (
            <Stack.Screen key={name} name={name as keyof RootStackParamList} component={component} />
          ))}
        </>
      )}
    </Stack.Navigator>
  );
};

export default RootNavigator;
