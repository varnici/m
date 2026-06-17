import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LayoutGrid, TrendingUp, MoreHorizontal, Wallet, PiggyBank } from 'lucide-react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { useNavigation } from '@react-navigation/native';
import type { RootStackNavigation } from './types';
import WorkerDashboardScreen from '@/screens/worker/WorkerDashboardScreen';
import InvestmentMarketplaceScreen from '@/screens/worker/InvestmentMarketplaceScreen';
import SavingsLaunchpadScreen from '@/screens/worker/SavingsLaunchpadScreen';
import WalletScreen from '@/screens/wallet/WalletScreen';
import MoreScreen from '@/screens/more/MoreScreen';

export type WorkerTabParamList = {
  WorkerHome: undefined;
  WorkerMarketplace: undefined;
  WorkerSavings: undefined;
  Wallet: undefined;
  More: undefined;
};

const Tab = createBottomTabNavigator<WorkerTabParamList>();

const WorkerCustomTabBar = ({ state, descriptors, navigation }: any) => {
  const insets = useSafeAreaInsets();

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
        {state.routes.map((route: any, index: number) => {
          const { options } = descriptors[route.key];
          const label = options.tabBarLabel ?? options.title ?? route.name;
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          let Icon = LayoutGrid;
          if (route.name === 'WorkerMarketplace') Icon = TrendingUp;
          if (route.name === 'WorkerSavings') Icon = PiggyBank;
          if (route.name === 'Wallet') Icon = Wallet;
          if (route.name === 'More') Icon = MoreHorizontal;

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              className="items-center justify-center py-2"
              activeOpacity={0.7}
              style={{ flex: 1 }}
            >
              <View className={`w-14 h-14 items-center justify-center rounded-2xl ${isFocused ? 'bg-violet-500/10' : ''}`}>
                <Icon
                  size={isFocused ? 24 : 22}
                  color={isFocused ? '#7C3AED' : '#94a3b8'}
                  strokeWidth={isFocused ? 2.5 : 2}
                />
                {isFocused && (
                  <Animated.View
                    entering={FadeIn.duration(300)}
                    exiting={FadeOut.duration(300)}
                    style={{
                      position: 'absolute',
                      bottom: 2,
                      width: 4,
                      height: 4,
                      borderRadius: 2,
                      backgroundColor: '#7C3AED',
                    }}
                  />
                )}
              </View>
              {isFocused && (
                <Animated.Text
                  entering={FadeIn.duration(300)}
                  className="text-[10px] mt-1 font-black uppercase tracking-widest text-violet-600"
                >
                  {label}
                </Animated.Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const WorkerTabNavigator = () => {
  return (
    <Tab.Navigator
      tabBar={(props) => <WorkerCustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="WorkerHome" component={WorkerDashboardScreen as any} options={{ tabBarLabel: 'Home' }} />
      <Tab.Screen name="WorkerMarketplace" component={InvestmentMarketplaceScreen as any} options={{ tabBarLabel: 'Invest' }} />
      <Tab.Screen name="WorkerSavings" component={SavingsLaunchpadScreen as any} options={{ tabBarLabel: 'Save' }} />
      <Tab.Screen name="Wallet" component={WalletScreen} />
      <Tab.Screen name="More" component={MoreScreen} />
    </Tab.Navigator>
  );
};

export default WorkerTabNavigator;
