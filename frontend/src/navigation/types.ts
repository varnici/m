export type RootStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
  RoleSelection: undefined;
  BVNVerification: undefined;
  PINSetup: undefined;
  BiometricSetup: undefined;
  Dashboard: undefined;
  Wallet: undefined;
  LoanDashboard: undefined;
  SalesDashboard: undefined;
  More: undefined;
  InventoryDashboard: undefined;
  StockLodger: undefined;
  VoiceStock: undefined;
  ScanShelve: undefined;
  StockAdjustment: {
    productId?: string;
    storeId?: string;
  };
  ProductList: undefined;
  ProductDetail: { productId: string };
  AddProduct: undefined;
  PurchaseOrders: undefined;
  AddPurchaseOrder: undefined;
  PurchaseOrderDetail: { poId: string };
  AIInsights: undefined;
  RecordSale: undefined;
  InsuranceSummary: undefined;
  FileClaim: undefined;
  Repayment: undefined;
  Withdrawal: undefined;
  SavingsGoals: undefined;
  ApplyLoan: undefined;
  ContractViewer: undefined;
  SalesHistory: undefined;
  SalesVelocity: undefined;
  ClaimHistory: undefined;
  CreditDashboard: undefined;
  ClusterPickup: undefined;
  PoolDetail: { poolId: number };
  PoolList: undefined;
  
  // Onboarding Retail
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

type NavigateFn = <RouteName extends keyof RootStackParamList>(
  name: RouteName,
  ...args: RootStackParamList[RouteName] extends undefined
    ? []
    : [params: RootStackParamList[RouteName]]
) => void;

import type { NavigationProp } from '@react-navigation/native';
import type {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';

export type RootStackNavigation = NavigationProp<RootStackParamList>;

export type RootStackNavigationProp<
  RouteName extends keyof RootStackParamList,
> = NativeStackNavigationProp<RootStackParamList, RouteName>;

export type RootStackScreenProps<
  RouteName extends keyof RootStackParamList,
> = NativeStackScreenProps<RootStackParamList, RouteName>;
