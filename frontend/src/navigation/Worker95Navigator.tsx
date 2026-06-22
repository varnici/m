import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import Worker95WelcomeScreen from '@/screens/worker/Worker95WelcomeScreen';
import Worker95OnboardingScreen from '@/screens/worker/Worker95OnboardingScreen';
import WorkerDashboardScreen from '@/screens/worker/WorkerDashboardScreen';
import InvestmentMarketplaceScreen from '@/screens/worker/InvestmentMarketplaceScreen';
import Worker95BusinessDetailScreen from '@/screens/worker/Worker95BusinessDetailScreen';
import Worker95InvestConfirmScreen from '@/screens/worker/Worker95InvestConfirmScreen';
import InvestmentPortfolioScreen from '@/screens/worker/InvestmentPortfolioScreen';
import InvestmentDetailScreen from '@/screens/worker/InvestmentDetailScreen';
import SavingsLaunchpadScreen from '@/screens/worker/SavingsLaunchpadScreen';
import Worker95SalaryConfigScreen from '@/screens/worker/Worker95SalaryConfigScreen';
import FinancialLedgerScreen from '@/screens/worker/FinancialLedgerScreen';
import Worker95ProfileScreen from '@/screens/worker/Worker95ProfileScreen';
import Worker95DividendsScreen from '@/screens/worker/Worker95DividendsScreen';

export type Worker95StackParamList = {
  Worker95Welcome: undefined;
  Worker95Onboarding: undefined;
  Worker95Dashboard: undefined;
  Worker95Marketplace: undefined;
  Worker95BusinessDetail: { item: any };
  Worker95InvestConfirm: { item: any };
  Worker95Portfolio: undefined;
  Worker95InvestmentDetail: { investmentId: string };
  Worker95Savings: undefined;
  Worker95SalaryConfig: undefined;
  Worker95Ledger: undefined;
  Worker95Profile: undefined;
  Worker95Dividends: undefined;
};

const Stack = createNativeStackNavigator<Worker95StackParamList>();

export default function Worker95Navigator() {
  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName="Worker95Welcome"
    >
      <Stack.Screen name="Worker95Welcome" component={Worker95WelcomeScreen} />
      <Stack.Screen name="Worker95Onboarding" component={Worker95OnboardingScreen} />
      <Stack.Screen name="Worker95Dashboard" component={WorkerDashboardScreen} />
      <Stack.Screen name="Worker95Marketplace" component={InvestmentMarketplaceScreen} />
      <Stack.Screen name="Worker95BusinessDetail" component={Worker95BusinessDetailScreen} />
      <Stack.Screen name="Worker95InvestConfirm" component={Worker95InvestConfirmScreen} />
      <Stack.Screen name="Worker95Portfolio" component={InvestmentPortfolioScreen} />
      <Stack.Screen name="Worker95InvestmentDetail" component={InvestmentDetailScreen} />
      <Stack.Screen name="Worker95Savings" component={SavingsLaunchpadScreen} />
      <Stack.Screen name="Worker95SalaryConfig" component={Worker95SalaryConfigScreen} />
      <Stack.Screen name="Worker95Ledger" component={FinancialLedgerScreen} />
      <Stack.Screen name="Worker95Profile" component={Worker95ProfileScreen} />
      <Stack.Screen name="Worker95Dividends" component={Worker95DividendsScreen} />
    </Stack.Navigator>
  );
}
