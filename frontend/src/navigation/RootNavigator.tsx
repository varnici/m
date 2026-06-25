import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, AppState, AppStateStatus, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import { useSecurityStore } from '@/store/securityStore';
import { useUserProfileStore } from '@/store/userProfileStore';
import { useOnboardingStore } from '@/store/onboardingStore';
import { useAuth } from '@/context/AuthContext';
import { colors } from '@/theme/colors';

import AuthNavigator from './AuthNavigator';
import OnboardingNavigator from './OnboardingNavigator';
import MainTabNavigator from './MainTabNavigator';
import WorkerTabNavigator from './WorkerTabNavigator';
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
import LowStockAlertsScreen from '@/screens/inventory/LowStockAlertsScreen';
import StaffActivityScreen from '@/screens/inventory/StaffActivityScreen';

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
import CreditDashboardScreen from '@/screens/credit/CreditDashboardScreen';
import CreditBreakdownScreen from '@/screens/credit/CreditBreakdownScreen';

import SalesDashboardScreen from '@/screens/sales/SalesDashboardScreen';
import RecordSaleScreen from '@/screens/sales/RecordSaleScreen';
import ReceiptScreen from '@/screens/sales/ReceiptScreen';
import SalesHistoryScreen from '@/screens/sales/SalesHistoryScreen';
import SalesVelocityScreen from '@/screens/sales/SalesVelocityScreen';

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
import Worker95Navigator from '@/navigation/Worker95Navigator';
import FinancialLedgerScreen from '@/screens/worker/FinancialLedgerScreen';
import Worker95BusinessDetailScreen from '@/screens/worker/Worker95BusinessDetailScreen';
import Worker95InvestConfirmScreen from '@/screens/worker/Worker95InvestConfirmScreen';
import Worker95SalaryConfigScreen from '@/screens/worker/Worker95SalaryConfigScreen';
import Worker95ProfileScreen from '@/screens/worker/Worker95ProfileScreen';
import Worker95DividendsScreen from '@/screens/worker/Worker95DividendsScreen';

import MarketAssociationScreen from '@/screens/onboarding/retail/MarketAssociationScreen';
import StoreVerificationScreen from '@/screens/onboarding/retail/StoreVerificationScreen';
import POSRegistrationScreen from '@/screens/onboarding/retail/POSRegistrationScreen';

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
    default:
      return MainTabNavigator;
  }
}

const ONBOARDING_SCREENS = {
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
  OnboardingMarketAssociation: MarketAssociationScreen,
  OnboardingStoreVerification: StoreVerificationScreen,
  OnboardingPOSRegistration: POSRegistrationScreen,
} as const;

const RootNavigator = () => {
  const { session, isLoading: authLoading } = useAuth();
  const { isLocked, securityType, setIsLocked } = useSecurityStore();
  const accountType = useUserProfileStore((s) => s.accountType);
  const onboardingComplete = useOnboardingStore((s) => s.isComplete);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    if (securityType !== 'none') {
      setIsLocked(true);
    }

    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        if (securityType !== 'none') {
          setIsLocked(true);
        }
      }
      appState.current = nextAppState;
    });

    return () => subscription.remove();
  }, [securityType, setIsLocked]);

  if (authLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.ventureroot.green, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="white" size="large" />
      </View>
    );
  }

  const showLock = isLocked && securityType !== 'none';
  const needsOnboarding = session && !accountType;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {showLock ? (
        <Stack.Screen name="SecurityLock" component={SecurityLockScreen} options={{ animation: 'fade' }} />
      ) : !session ? (
        <Stack.Screen name="Auth" component={AuthNavigator} />
      ) : needsOnboarding ? (
        <>
          <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />

          {/* All onboarding screens available from RoleSelection */}
          <Stack.Screen name="Onboarding" component={OnboardingNavigator} />
          {Object.entries(ONBOARDING_SCREENS).map(([name, component]) => (
            <Stack.Screen key={name} name={name as keyof RootStackParamList} component={component} />
          ))}

          <Stack.Screen name="Main" component={resolveMainScreen(accountType)} />
        </>
      ) : (
        <>
          <Stack.Screen name="Main" component={resolveMainScreen(accountType)} />
          <Stack.Screen name="Onboarding" component={OnboardingNavigator} />

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
          <Stack.Screen name="LowStockAlerts" component={LowStockAlertsScreen} />
          <Stack.Screen name="StaffActivity" component={StaffActivityScreen} />

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
          <Stack.Screen name="CreditDashboard" component={CreditDashboardScreen} />
          <Stack.Screen name="CreditBreakdown" component={CreditBreakdownScreen} />

          <Stack.Screen name="SalesDashboard" component={SalesDashboardScreen} />
          <Stack.Screen name="RecordSale" component={RecordSaleScreen} />
          <Stack.Screen name="Receipt" component={ReceiptScreen} />
          <Stack.Screen name="SalesHistory" component={SalesHistoryScreen} />
          <Stack.Screen name="SalesVelocity" component={SalesVelocityScreen} />

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

          <Stack.Screen name="Worker95Module" component={Worker95Navigator} />
          <Stack.Screen name="Worker95BusinessDetail" component={Worker95BusinessDetailScreen} />
          <Stack.Screen name="Worker95InvestConfirm" component={Worker95InvestConfirmScreen} />
          <Stack.Screen name="Worker95SalaryConfig" component={Worker95SalaryConfigScreen} />
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
