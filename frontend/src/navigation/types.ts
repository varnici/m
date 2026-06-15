import { NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import type { NavigationProp } from '@react-navigation/native';

export type AuthStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
  RoleSelection: undefined;
  BVNVerification: undefined;
  PINSetup: undefined;
  PatternSetup: undefined;
  BiometricSetup: undefined;
};

export type OnboardingStackParamList = {
  OnboardingAccountType: undefined;
  OnboardingPhone: undefined;
  OnboardingBasicInfo: undefined;
  OnboardingShopInfo: undefined;
  OnboardingCategory: undefined;
  OnboardingLocation: undefined;
  OnboardingKYC: undefined;
  OnboardingFaceVerification: undefined;
  OnboardingBankLink: undefined;
  OnboardingInventory: undefined;
  OnboardingSalesEstimation: undefined;
  OnboardingTaxCompliance: undefined;
  OnboardingTerms: undefined;
  OnboardingActivation: undefined;
  OnboardingReview: undefined;
};

export type MainTabParamList = {
  Dashboard: undefined;
  LoanDashboard: undefined;
  SalesDashboard: undefined;
  Wallet: undefined;
  More: undefined;
};

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Onboarding: NavigatorScreenParams<OnboardingStackParamList>;
  Main: NavigatorScreenParams<MainTabParamList>;

  // Nested navigator screen names are listed here because many screens use the
  // root navigation prop for cross-stack shortcuts.
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
  RoleSelection: undefined;
  BVNVerification: undefined;
  PINSetup: undefined;
  PatternSetup: undefined;
  BiometricSetup: undefined;
  OnboardingAccountType: undefined;
  OnboardingPhone: undefined;
  OnboardingBasicInfo: undefined;
  OnboardingShopInfo: undefined;
  OnboardingCategory: undefined;
  OnboardingLocation: undefined;
  OnboardingKYC: undefined;
  OnboardingFaceVerification: undefined;
  OnboardingBankLink: undefined;
  OnboardingInventory: undefined;
  OnboardingSalesEstimation: undefined;
  OnboardingTaxCompliance: undefined;
  OnboardingTerms: undefined;
  OnboardingActivation: undefined;
  OnboardingReview: undefined;
  Dashboard: undefined;
  SalesDashboard: undefined;
  More: undefined;
  
  // App Stack Screens (Accessible after onboarding)
  InventoryDashboard: undefined;
  InventoryManager: undefined;
  StockLodger: undefined;
  VoiceStock: undefined;
  ScanShelve: undefined;
  StockAdjustment: {
    productId?: string;
    storeId?: string;
    prefillDrift?: number;
  };
  ProductList: undefined;
  LowStockAlerts: { storeId?: string };
  ProductDetail: { productId: string };
  AddProduct: { barcode?: string } | undefined;
  EditProduct: { productId: string };
  PurchaseOrders: undefined;
  AddPurchaseOrder: { productId?: string; qty?: number };
  AddSupplier: undefined;
  PurchaseOrderDetail: { poId: string };
  AIInsights: undefined;
  AIAssistant: undefined;
  RecordSale: { saleId?: string };
  Receipt: { saleId: string };
  InsuranceSummary: undefined; // Backward-compatible route alias
  FileClaim: undefined; // Backward-compatible route alias
  ClaimHistory: undefined; // Backward-compatible route alias
  BudgetBestDashboard: undefined;
  BudgetBestDeposit: { goalId?: string; amount?: number };
  BudgetBestGoals: undefined;
  BudgetBestGoalDetail: { goalId: string };
  BudgetBestSettings: undefined;
  BudgetBestPolicy: undefined;
  Repayment: undefined;
  Withdrawal: undefined;
  SavingsGoals: undefined;
  Wallet: undefined;
  LoanDashboard: undefined;
  ActiveLoan: undefined;
  ApplyLoan: undefined;
  ContractViewer: { amount: number; purpose: string };
  SalesHistory: undefined;
  SalesVelocity: undefined;
  CreditDashboard: undefined;
  CreditBreakdown: undefined;
  ClusterPickup: undefined;
  PoolDetail: { poolId: number };
  PoolList: undefined;
  InventoryReconciliation: { storeId: string };
  Shop: undefined;
  Cart: undefined;
  Checkout: { totalKobo: number };
  ShopProductDetail: { product: any };
  Settings: undefined;
  Profile: undefined;
  SecuritySettings: undefined;
  SecurityLock: undefined;
  VentureRoute: undefined;
  Support: undefined;
  Notifications: undefined;
  AccountDetails: undefined;
  TransactionHistory: undefined;

  // Layer 1 — 9-5 Worker Module
  Worker95Module: undefined;
  Worker95Welcome: undefined;
  Worker95Onboarding: undefined;
  Worker95Dashboard: undefined;
  Worker95Marketplace: undefined;
  Worker95BusinessDetail: { item: any };
  Worker95InvestConfirm: { item: any };
  Worker95Savings: undefined;
  Worker95SalaryConfig: undefined;
  Worker95Ledger: undefined;
  Worker95Profile: undefined;
  Worker95Dividends: undefined;
};

export type RootStackNavigation = NavigationProp<RootStackParamList>;

export type RootStackNavigationProp<
  RouteName extends keyof RootStackParamList,
> = NativeStackNavigationProp<RootStackParamList, RouteName>;

export type RootStackScreenProps<
  RouteName extends keyof RootStackParamList,
> = NativeStackScreenProps<RootStackParamList, RouteName>;
