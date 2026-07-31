import { NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import type { NavigationProp } from '@react-navigation/native';

export type AuthStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  ResetPassword: undefined;
  EmailEntry: undefined;
  PhoneEntry: undefined;
  OtpEntry: { channel: 'email' | 'phone'; target: string; display?: string };
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
  OnboardingMarketAssociation: undefined;
  OnboardingLocation: undefined;
  OnboardingStoreVerification: undefined;
  OnboardingKYC: undefined;
  OnboardingFaceVerification: undefined;
  OnboardingPOSRegistration: undefined;
  OnboardingBankLink: undefined;
  OnboardingInventory: undefined;
  OnboardingSalesEstimation: undefined;
  OnboardingTaxCompliance: undefined;
  OnboardingTerms: undefined;
  OnboardingActivation: undefined;
  OnboardingReview: undefined;

  // Distributor onboarding
  DistributorCompany: undefined;
  DistributorOperations: undefined;
  DistributorDirector: undefined;
  DistributorBank: undefined;
  DistributorTerms: undefined;

  // Logistics onboarding
  LogisticsCompany: undefined;
  LogisticsFleet: undefined;
  LogisticsDriver: undefined;
  LogisticsInsurance: undefined;
  LogisticsTerms: undefined;
};

export type MainTabParamList = {
  Dashboard: undefined;
  LoanDashboard: undefined;
  SalesDashboard: undefined;
  Wallet: undefined;
  More: undefined;
};

export type WorkerTabParamList = {
  WorkerHome: undefined;
  WorkerMarketplace: undefined;
  WorkerSavings: undefined;
  Wallet: undefined;
  More: undefined;
};

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Onboarding: NavigatorScreenParams<OnboardingStackParamList>;
  // "Main" resolves to MainTabNavigator (retail) or WorkerTabNavigator (nine_to_five)
  // depending on account type — accept either tab's params for nested navigation.
  Main: NavigatorScreenParams<MainTabParamList> | NavigatorScreenParams<WorkerTabParamList>;

  // Nested navigator screen names are listed here because many screens use the
  // root navigation prop for cross-stack shortcuts.
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  ResetPassword: undefined;
  EmailEntry: undefined;
  PhoneEntry: undefined;
  OtpEntry: { channel: 'email' | 'phone'; target: string; display?: string };
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
  Categories: undefined;
  BusinessTypeSetup: undefined;
  ReceiveStock: { storeId?: string } | undefined;
  IssueStock: { storeId?: string } | undefined;
  DailyReport: { storeId?: string } | undefined;
  InventoryRegister: undefined;
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
  AdminMetrics: undefined;
  ClusterPickup: undefined;
  PoolDetail: { poolId: number };
  PoolList: undefined;
  InventoryReconciliation: { storeId: string };
  TradeOrder: { storeId?: string };
  RetailPOS: { storeId?: string };
  Shop: undefined;
  Cart: undefined;
  Checkout: { totalKobo: number };
  ShopProductDetail: { product: any };
  Shopfront: undefined;
  ProductSavings: undefined;
  Settings: undefined;
  Profile: undefined;
  SecuritySettings: undefined;
  SecurityLock: undefined;
  VentureRoute: undefined;
  Support: undefined;
  Notifications: undefined;
  AccountDetails: undefined;
  TransactionHistory: undefined;
  StaffActivity: undefined;

  // Worker95 detail screens (pushed from WorkerTabNavigator)
  Worker95BusinessDetail: { item: any };
  Worker95InvestConfirm: { item: any };
  Worker95Portfolio: undefined;
  Worker95InvestmentDetail: { investmentId: string };
  Worker95Ledger: undefined;
  Worker95Profile: undefined;
  Worker95Dividends: undefined;

  // SME Onboarding Screens (additional)
  OnboardingMarketAssociation: undefined;
  OnboardingStoreVerification: undefined;
  OnboardingPOSRegistration: undefined;

  // Worker Onboarding Screens
  WorkerEmail: undefined;
  WorkerPhone: undefined;
  WorkerPassword: undefined;
  WorkerOTP: { type: 'email' | 'phone' };
  WorkerProfile: undefined;
  WorkerEmployment: undefined;
  WorkerIdentity: undefined;
  WorkerVerificationPending: undefined;
  WorkerRiskAssessment: undefined;
  WorkerPINSetup: undefined;
  WorkerCompletion: undefined;

  // Distributor Onboarding Screens
  DistributorCompany: undefined;
  DistributorOperations: undefined;
  DistributorDirector: undefined;
  DistributorBank: undefined;
  DistributorTerms: undefined;

  // Logistics Onboarding Screens
  LogisticsCompany: undefined;
  LogisticsFleet: undefined;
  LogisticsDriver: undefined;
  LogisticsInsurance: undefined;
  LogisticsTerms: undefined;
};

export type RootStackNavigation = NavigationProp<RootStackParamList>;

export type RootStackNavigationProp<
  RouteName extends keyof RootStackParamList,
> = NativeStackNavigationProp<RootStackParamList, RouteName>;

export type RootStackScreenProps<
  RouteName extends keyof RootStackParamList,
> = NativeStackScreenProps<RootStackParamList, RouteName>;
