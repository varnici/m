/**
 * Budget_Best Navigation Configuration
 * Navigation stack setup for all Budget_Best screens
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { PiggyBank } from 'lucide-react-native';

// Import screens
import BudgetBestDashboard from '../screens/budget_best/BudgetBestDashboard';
import BudgetBestDeposit from '../screens/budget_best/BudgetBestDeposit';
import BudgetBestGoals from '../screens/budget_best/BudgetBestGoals';
import BudgetBestGoalDetail from '../screens/budget_best/BudgetBestGoalDetail';
import BudgetBestSettings from '../screens/budget_best/BudgetBestSettings';
import BudgetBestPolicy from '../screens/budget_best/BudgetBestPolicy';

export type BudgetBestNavigatorParamList = {
  BudgetBestDashboard: undefined;
  BudgetBestDeposit: { goalId?: string };
  BudgetBestGoals: undefined;
  BudgetBestGoalDetail: { goalId: string };
  BudgetBestSettings: undefined;
  BudgetBestPolicy: undefined;
};

const Stack = createNativeStackNavigator<BudgetBestNavigatorParamList>();

export function BudgetBestNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animationEnabled: true,
        cardStyle: { backgroundColor: '#0F172A' },
        cardOverlayEnabled: true,
        transitionSpec: {
          open: {
            animation: 'timing',
            config: { duration: 300 },
          },
          close: {
            animation: 'timing',
            config: { duration: 300 },
          },
        },
      }}
    >
      {/* Main Dashboard */}
      <Stack.Screen
        name="BudgetBestDashboard"
        component={BudgetBestDashboard}
        options={{
          animationTypeForReplace: 'pop',
        }}
      />

      {/* Deposit Flow */}
      <Stack.Screen
        name="BudgetBestDeposit"
        component={BudgetBestDeposit}
        options={{
          animationEnabled: true,
          gestureEnabled: true,
        }}
      />

      {/* Goals Management */}
      <Stack.Screen
        name="BudgetBestGoals"
        component={BudgetBestGoals}
        options={{
          animationEnabled: true,
        }}
      />

      {/* Goal Detail */}
      <Stack.Screen
        name="BudgetBestGoalDetail"
        component={BudgetBestGoalDetail}
        options={{
          animationEnabled: true,
          gestureEnabled: true,
        }}
      />

      {/* Settings & Reminders */}
      <Stack.Screen
        name="BudgetBestSettings"
        component={BudgetBestSettings}
        options={{
          animationEnabled: true,
        }}
      />

      {/* Policy & Consent */}
      <Stack.Screen
        name="BudgetBestPolicy"
        component={BudgetBestPolicy}
        options={{
          animationEnabled: true,
          gestureEnabled: false,
        }}
      />
    </Stack.Navigator>
  );
}

export function getBudgetBestTabConfig() {
  return {
    name: 'BudgetBest',
    component: BudgetBestNavigator,
    options: {
      tabBarLabel: 'Save',
      tabBarIcon: ({ color, size }: { color: string; size: number }) => (
        <PiggyBank color={color} size={size} />
      ),
      headerShown: false,
    },
  };
}

export default {
  BudgetBestNavigator,
  getBudgetBestTabConfig,
};
