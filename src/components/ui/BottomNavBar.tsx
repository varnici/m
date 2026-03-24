import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Home, DollarSign, TrendingUp, Wallet, MoreHorizontal } from 'lucide-react-native';
import { colors } from '@/theme/colors';

interface BottomNavBarProps {
  activeScreen: 'Dashboard' | 'LoanDashboard' | 'SalesDashboard' | 'Wallet' | 'More';
}

const BottomNavBar = ({ activeScreen }: BottomNavBarProps) => {
  const navigation = useNavigation<any>();

  const tabs = [
    { icon: Home, label: 'Home', screen: 'Dashboard' },
    { icon: DollarSign, label: 'Loans', screen: 'LoanDashboard' },
    { icon: TrendingUp, label: 'Sales', screen: 'SalesDashboard' },
    { icon: Wallet, label: 'Wallet', screen: 'Wallet' },
    { icon: MoreHorizontal, label: 'More', screen: 'More' },
  ];

  return (
    <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex-row py-2 pb-6 px-4">
      {tabs.map((tab, index) => {
        const isActive = tab.screen === activeScreen;
        return (
          <TouchableOpacity
            key={index}
            className="flex-1 items-center"
            onPress={() => navigation.navigate(tab.screen)}
            accessible={true}
            accessibilityLabel={tab.label}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
          >
            <tab.icon
              size={22}
              color={isActive ? colors.ventureroot.green : '#9CA3AF'}
            />
            <Text
              className={`text-xs mt-1 ${
                isActive ? 'text-ventureroot-green font-medium' : 'text-gray-400'
              }`}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

export default BottomNavBar;
