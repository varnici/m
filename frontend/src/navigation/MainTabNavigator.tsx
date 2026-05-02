import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MainTabParamList } from './types';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LayoutGrid, TrendingUp, PiggyBank, MoreHorizontal, Box } from 'lucide-react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import DashboardScreen from '@/screens/DashboardScreen';
import InventoryDashboardScreen from '@/screens/inventory/InventoryDashboardScreen';
import SalesDashboardScreen from '@/screens/sales/SalesDashboardScreen';
import BudgetBestDashboard from '@/screens/budget_best/BudgetBestDashboard';
import MoreScreen from '@/screens/more/MoreScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();

const CustomTabBar = ({ state, descriptors, navigation }: any) => {
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
          const label = options.tabBarLabel !== undefined ? options.tabBarLabel : options.title !== undefined ? options.title : route.name;
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
          if (route.name === 'InventoryDashboard') Icon = Box;
          if (route.name === 'SalesDashboard') Icon = TrendingUp;
          if (route.name === 'BudgetBest') Icon = PiggyBank;
          if (route.name === 'More') Icon = MoreHorizontal;

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              className="items-center justify-center py-2"
              activeOpacity={0.7}
              style={{ flex: 1 }}
            >
              <View className={`w-14 h-14 items-center justify-center rounded-2xl ${isFocused ? 'bg-emerald-500/10' : ''}`}>
                <Icon
                  size={isFocused ? 24 : 22}
                  color={isFocused ? '#10b981' : '#94a3b8'}
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
                      backgroundColor: '#10b981',
                    }}
                  />
                )}
              </View>
              {isFocused && (
                <Animated.Text
                  entering={FadeIn.duration(300)}
                  className="text-[10px] mt-1 font-black uppercase tracking-widest text-emerald-500"
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

const MainTabNavigator = () => {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ tabBarLabel: 'Home' }} />
      <Tab.Screen name="InventoryDashboard" component={InventoryDashboardScreen} options={{ tabBarLabel: 'Stock' }} />
      <Tab.Screen name="SalesDashboard" component={SalesDashboardScreen} options={{ tabBarLabel: 'Sales' }} />
      <Tab.Screen name="BudgetBest" component={BudgetBestDashboard} options={{ tabBarLabel: 'Budget' }} />
      <Tab.Screen name="More" component={MoreScreen} />
    </Tab.Navigator>
  );
};

export default MainTabNavigator;
