import React from 'react';
import { View, TouchableOpacity, Text, Platform, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LayoutGrid, TrendingUp, Wallet, MoreHorizontal, Banknote } from 'lucide-react-native';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  withSpring
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import type { RootStackNavigation, RootStackParamList } from '@/navigation/types';
import { colors } from '@/theme/colors';

const TABS = [
  { label: 'Home', screen: 'Dashboard', icon: LayoutGrid },
  { label: 'Loans', screen: 'LoanDashboard', icon: Banknote },
  { label: 'Sales', screen: 'SalesDashboard', icon: TrendingUp },
  { label: 'Wallet', screen: 'Wallet', icon: Wallet },
  { label: 'More', screen: 'More', icon: MoreHorizontal },
] as const;

type TabName = keyof RootStackParamList;

interface BottomTabBarProps {
  navigation: RootStackNavigation;
  activeRoute?: TabName;
}

const BottomTabBar = ({ navigation, activeRoute }: BottomTabBarProps) => {
  const insets = useSafeAreaInsets();

  // Floating Tab Bar Design - Clean Glass Premium
  return (
    <View
      style={{
        position: 'absolute',
        bottom: Platform.OS === 'ios' ? insets.bottom + 12 : 24,
        left: 20,
        right: 20,
        height: 80,
        borderRadius: 32,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
        overflow: 'hidden',
        borderWidth: 1.5,
        borderColor: 'rgba(255, 255, 255, 0.5)',
      }}
    >
      <BlurView intensity={50} tint="light" style={StyleSheet.absoluteFill} />

      <View className="flex-1 flex-row items-center justify-around px-2">
        {TABS.map((tab) => {
          const isActive = tab.screen === activeRoute;
          const Icon = tab.icon;

          return (
            <TouchableOpacity
              key={tab.screen}
              onPress={() => navigation.navigate(tab.screen as any)}
              className="items-center justify-center py-2"
              activeOpacity={0.7}
              style={{ flex: 1 }}
            >
              <View className={`w-14 h-14 items-center justify-center rounded-2xl ${isActive ? 'bg-emerald-500/10' : ''}`}>
                <Icon
                  size={isActive ? 24 : 22}
                  color={isActive ? '#10b981' : '#94a3b8'}
                  strokeWidth={isActive ? 2.5 : 2}
                />

                {isActive && (
                  <Animated.View
                    entering={FadeIn.duration(300)}
                    exiting={FadeOut.duration(300)}
                    style={{
                      position: 'absolute',
                      bottom: 2,
                      width: 4,
                      height: 4,
                      borderRadius: 2,
                      backgroundColor: '#10b981',
                      shadowColor: '#10b981',
                      shadowOffset: { width: 0, height: 0 },
                      shadowOpacity: 0.8,
                      shadowRadius: 4,
                    }}
                  />
                )}
              </View>
              {isActive && (
                <Animated.Text
                  entering={FadeIn.duration(300)}
                  className="text-[10px] mt-1 font-black uppercase tracking-widest text-emerald-500"
                >
                  {tab.label}
                </Animated.Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

export default BottomTabBar;
