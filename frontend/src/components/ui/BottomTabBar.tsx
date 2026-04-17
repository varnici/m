import React from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import type { RootStackNavigation } from '@/navigation/types';

const TABS = [
  { label: 'Home', screen: 'Dashboard' },
  { label: 'Loans', screen: 'LoanDashboard' },
  { label: 'Sales', screen: 'SalesDashboard' },
  { label: 'Wallet', screen: 'Wallet' },
  { label: 'More', screen: 'More' },
] as const;

type TabName = (typeof TABS)[number]['screen'];

interface BottomTabBarProps {
  navigation: RootStackNavigation;
  activeRoute?: TabName;
}

const BottomTabBar = ({ navigation, activeRoute }: BottomTabBarProps) => {
  return (
    <View className="absolute bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-100 flex-row items-center justify-around px-4">
      {TABS.map((tab) => {
        const isActive = tab.screen === activeRoute;
        return (
          <TouchableOpacity
            key={tab.screen}
            onPress={() => navigation.navigate(tab.screen)}
            className="items-center"
            accessible={true}
            accessibilityLabel={tab.label}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
          >
            <Text className={`${isActive ? 'text-ventureroot-green font-bold' : 'text-gray-400'} text-[10px]`}> 
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

export default BottomTabBar;
