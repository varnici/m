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

export type RootStackNavigation = {
  navigate: NavigateFn;
  goBack: () => void;
  replace: NavigateFn;
  reset: (state: {
    index: number;
    routes: Array<{
      name: keyof RootStackParamList;
      params?: RootStackParamList[keyof RootStackParamList];
    }>;
  }) => void;
};

export type RootStackNavigationProp<
  RouteName extends keyof RootStackParamList,
> = RootStackNavigation;

export type RootStackScreenProps<
  RouteName extends keyof RootStackParamList,
> = {
  navigation: RootStackNavigation;
  route: {
    key: string;
    name: RouteName;
    params: RootStackParamList[RouteName];
  };
};
