import React from 'react';
import { View, Text, TouchableOpacity, StatusBar, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RootStackScreenProps } from '@/navigation/types';

const WelcomeScreen = ({ navigation }: RootStackScreenProps<'Welcome'>) => {
  const { width, height } = useWindowDimensions();
  const isSmallScreen = height < 700;

  return (
    <SafeAreaView className="flex-1 bg-ventureroot-green">
      <StatusBar barStyle="light-content" />

      <View className="flex-1 items-center justify-center" style={{ paddingHorizontal: width * 0.08 }}>
        <View
          className="bg-white rounded-2xl items-center justify-center"
          style={{
            width: isSmallScreen ? 64 : 80,
            height: isSmallScreen ? 64 : 80,
            marginBottom: isSmallScreen ? 16 : 24,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 8,
            elevation: 8,
          }}
        >
          <View
            className="bg-ventureroot-green rounded-lg justify-center items-center"
            style={{ width: isSmallScreen ? 40 : 48, height: isSmallScreen ? 40 : 48 }}
          >
            <View
              className="border-4 border-white rounded-sm"
              style={{
                width: isSmallScreen ? 20 : 24,
                height: isSmallScreen ? 20 : 24,
                transform: [{ rotate: '45deg' }],
              }}
            />
          </View>
        </View>

        <Text
          className="text-white font-bold tracking-tight"
          style={{ fontSize: isSmallScreen ? 26 : 32, marginBottom: 4 }}
        >
          VentureRoot
        </Text>
        <Text
          className="font-medium tracking-widest uppercase"
          style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginBottom: isSmallScreen ? 32 : 48 }}
        >
          Nigeria · Africa
        </Text>

        <View className="items-center" style={{ marginBottom: isSmallScreen ? 32 : 64 }}>
          <Text
            className="text-white font-bold text-center"
            style={{ fontSize: isSmallScreen ? 22 : 26, lineHeight: isSmallScreen ? 30 : 36 }}
          >
            Your Business,{'\n'}Funded & Growing
          </Text>
          <Text className="text-emerald-300 font-medium" style={{ fontSize: 13, marginTop: 16 }}>
            Inventory loans · Sales tracking · Group buying
          </Text>
        </View>

        <View className="w-full" style={{ gap: 14 }}>
          <TouchableOpacity
            className="bg-white items-center"
            style={{
              paddingVertical: isSmallScreen ? 14 : 16,
              borderRadius: 12,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 4,
            }}
            onPress={() => navigation.navigate('Register')}
            accessible
            accessibilityLabel="Create an account"
            accessibilityRole="button"
          >
            <Text className="text-ventureroot-green font-bold" style={{ fontSize: 15 }}>
              Create an account
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="items-center"
            style={{
              paddingVertical: isSmallScreen ? 14 : 16,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.3)',
            }}
            onPress={() => navigation.navigate('Login')}
            accessible
            accessibilityLabel="I already have an account"
            accessibilityRole="button"
          >
            <Text className="text-white font-bold" style={{ fontSize: 15 }}>
              I already have an account
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View className="items-center" style={{ paddingBottom: isSmallScreen ? 16 : 32 }}>
        <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, textAlign: 'center' }}>
          CBN compliant · NDIC insured · Data protected by NDPR
        </Text>
      </View>
    </SafeAreaView>
  );
};

export default WelcomeScreen;
