import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import { useSecurityStore } from '@/store/securityStore';
import { useAuth } from '@/context/AuthContext';
import { View, ActivityIndicator, AppState, AppStateStatus } from 'react-native';
import { useEffect, useRef } from 'react';
import { colors } from '@/theme/colors';

import PINSetupScreen from '@/screens/auth/PINSetupScreen';
import PatternSetupScreen from '@/screens/auth/PatternSetupScreen';
import BiometricSetupScreen from '@/screens/auth/BiometricSetupScreen';
import LoanDashboardScreen from '@/screens/loans/LoanDashboardScreen';

// Navigators
import AuthNavigator from './AuthNavigator';
import OnboardingNavigator from './OnboardingNavigator';
import MainTabNavigator from './MainTabNavigator';

// Standalone Screens (Authenticated)
import SecurityLockScreen from '@/screens/auth/SecurityLockScreen';
import DashboardScreen from '@/screens/DashboardScreen';
import MoreScreen from '@/screens/more/MoreScreen';
import InventoryDashboardScreen from '@/screens/inventory/InventoryDashboardScreen';
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
import CreatePurchaseOrderScreen from '@/screens/inventory/CreatePurchaseOrderScreen';
import AddSupplierScreen from '@/screens/inventory/AddSupplierScreen';
import PurchaseOrderDetailScreen from '@/screens/inventory/PurchaseOrderDetailScreen';
import RecordSaleScreen from '@/screens/sales/RecordSaleScreen';
import ReceiptScreen from '@/screens/sales/ReceiptScreen';
import InventoryReconciliationScreen from '@/screens/inventory/InventoryReconciliationScreen';
import LowStockAlertsScreen from '@/screens/inventory/LowStockAlertsScreen';
import FileClaimScreen from '@/screens/budget_best/FileClaimScreen';
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
import ApplyLoanScreen from '@/screens/loans/ApplyLoanScreen';
import ContractViewerScreen from '@/screens/loans/ContractViewerScreen';
import SalesHistoryScreen from '@/screens/sales/SalesHistoryScreen';
import SalesVelocityScreen from '@/screens/sales/SalesVelocityScreen';

import CreditDashboardScreen from '@/screens/credit/CreditDashboardScreen';
import ClusterPickupScreen from '@/screens/pools/ClusterPickupScreen';
import PoolDetailScreen from '@/screens/pools/PoolDetailScreen';
import PoolListScreen from '@/screens/pools/PoolListScreen';
import ShopScreen from '@/screens/shop/ShopScreen';
import CartScreen from '@/screens/shop/CartScreen';
import CheckoutScreen from '@/screens/shop/CheckoutScreen';
import ShopProductDetailScreen from '@/screens/shop/ShopProductDetailScreen';
import SettingsScreen from '@/screens/more/SettingsScreen';
import ProfileScreen from '@/screens/more/ProfileScreen';
import SecuritySettingsScreen from '@/screens/more/SecuritySettingsScreen';
import VentureRouteScreen from '@/screens/VentureRouteScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

const RootNavigator = () => {
  const { session, isLoading: authLoading } = useAuth();
  const { isLocked, securityType, setIsLocked } = useSecurityStore();
  const appState = useRef(AppState.currentState);
  
  useEffect(() => {
    // Initial lock on mount if security is enabled
    if (securityType !== 'none') {
      setIsLocked(true);
    }

    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // App has come to the foreground
        if (securityType !== 'none') {
          setIsLocked(true);
        }
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [securityType, setIsLocked]);

  const showLock = isLocked && securityType !== 'none';

  if (authLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.ventureroot.green, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="white" size="large" />
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      {showLock ? (
        <Stack.Screen 
          name="SecurityLock" 
          component={SecurityLockScreen} 
          options={{ animation: 'fade' }}
        />
      ) : !session ? (
        <Stack.Screen name="Auth" component={AuthNavigator} />
      ) : (
        <>
          {/* Main App Entry Point */}
          <Stack.Screen name="Main" component={MainTabNavigator} />
          
          {/* Authenticated On-Top Screens */}
          <Stack.Screen name="Onboarding" component={OnboardingNavigator} />
          <Stack.Screen name="Dashboard" component={DashboardScreen} />
          <Stack.Screen name="More" component={MoreScreen} />
          <Stack.Screen name="InventoryDashboard" component={InventoryDashboardScreen} />
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
          <Stack.Screen name="RecordSale" component={RecordSaleScreen} />
          <Stack.Screen name="Receipt" component={ReceiptScreen} />
          <Stack.Screen name="InsuranceSummary" component={BudgetBestDashboard} />
          <Stack.Screen name="FileClaim" component={FileClaimScreen} />
          <Stack.Screen name="BudgetBestDashboard" component={BudgetBestDashboard} />
          <Stack.Screen name="BudgetBestDeposit" component={BudgetBestDeposit} />
          <Stack.Screen name="BudgetBestGoals" component={BudgetBestGoals} />
          <Stack.Screen name="BudgetBestGoalDetail" component={BudgetBestGoalDetail} />
          <Stack.Screen name="BudgetBestSettings" component={BudgetBestSettings} />
          <Stack.Screen name="BudgetBestPolicy" component={BudgetBestPolicy} />
          <Stack.Screen name="Repayment" component={RepaymentScreen} />
          <Stack.Screen name="Withdrawal" component={WithdrawalScreen} />
          <Stack.Screen name="SavingsGoals" component={SavingsGoalsScreen} />
          <Stack.Screen name="Wallet" component={WalletScreen} />
          <Stack.Screen name="LoanDashboard" component={LoanDashboardScreen} />
          <Stack.Screen name="ApplyLoan" component={ApplyLoanScreen} />
          <Stack.Screen name="ContractViewer" component={ContractViewerScreen} />
          <Stack.Screen name="SalesHistory" component={SalesHistoryScreen} />
          <Stack.Screen name="SalesVelocity" component={SalesVelocityScreen} />

          <Stack.Screen name="CreditDashboard" component={CreditDashboardScreen} />
          <Stack.Screen name="ClusterPickup" component={ClusterPickupScreen} />
          <Stack.Screen name="PoolDetail" component={PoolDetailScreen} />
          <Stack.Screen name="PoolList" component={PoolListScreen} />
          <Stack.Screen name="InventoryReconciliation" component={InventoryReconciliationScreen} />
          <Stack.Screen name="LowStockAlerts" component={LowStockAlertsScreen} />
          <Stack.Screen name="Shop" component={ShopScreen} />
          <Stack.Screen name="Cart" component={CartScreen} />
          <Stack.Screen name="Checkout" component={CheckoutScreen} />
          <Stack.Screen name="ShopProductDetail" component={ShopProductDetailScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="SecuritySettings" component={SecuritySettingsScreen} />
          <Stack.Screen name="VentureRoute" component={VentureRouteScreen} />
          <Stack.Screen name="PINSetup" component={PINSetupScreen} />
          <Stack.Screen name="PatternSetup" component={PatternSetupScreen} />
          <Stack.Screen name="BiometricSetup" component={BiometricSetupScreen} />
        </>
      )}
    </Stack.Navigator>
  );
};

export default RootNavigator;
