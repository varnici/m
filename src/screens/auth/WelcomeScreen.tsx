import React from 'react';
import { View, Text, TouchableOpacity, Image, SafeAreaView, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors } from '@/theme/colors';

const WelcomeScreen = () => {
  const navigation = useNavigation<any>();

  return (
    <SafeAreaView className="flex-1 bg-ventureroot-green">
      <StatusBar barStyle="light-content" />
      
      {/* Background Decorative Element (Optional wavy pattern from design) */}
      <View className="absolute bottom-0 left-0 right-0 h-1/3">
        {/* Simple wave representation or just solid green as per design Vibe */}
      </View>

      <View className="flex-1 items-center justify-center px-6">
        {/* Logo Section */}
        <View className="w-20 h-20 bg-white rounded-2xl items-center justify-center mb-6 shadow-lg">
          <View className="w-12 h-12 bg-ventureroot-green rounded-lg justify-center items-center">
             <View className="w-6 h-6 border-4 border-white rounded-sm rotate-45" />
          </View>
        </View>

        <Text className="text-white text-3xl font-bold mb-1 tracking-tight">VentureRoot</Text>
        <Text className="text-white/60 text-xs font-medium tracking-widest uppercase mb-12">Nigeria · Africa</Text>

        <View className="items-center mb-16">
          <Text className="text-white text-2xl font-bold text-center leading-9">
            Your Business,{"\n"}Funded & Growing
          </Text>
          <Text className="text-emerald-300 text-sm mt-4 font-medium">
            Inventory loans · Sales tracking · Group buying
          </Text>
        </View>

        {/* Action Buttons */}
        <View className="w-full gap-4">
          <TouchableOpacity
            className="bg-white py-4 rounded-xl items-center shadow-md active:opacity-90"
            onPress={() => navigation.navigate('RoleSelection')}
            accessible={true}
            accessibilityLabel="Get Started"
            accessibilityRole="button"
          >
            <Text className="text-ventureroot-green font-bold text-base">Get Started</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="border border-white/30 py-4 rounded-xl items-center active:bg-white/5"
            onPress={() => navigation.navigate('Login')}
            accessible={true}
            accessibilityLabel="I already have an account"
            accessibilityRole="button"
          >
            <Text className="text-white font-bold text-base">I already have an account</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Footer Indicators */}
      <View className="flex-row justify-center pb-8 gap-3">
        <View className="w-12 h-1.5 bg-white rounded-full" />
        <View className="w-12 h-1.5 bg-white/20 rounded-full" />
      </View>
    </SafeAreaView>
  );
};

export default WelcomeScreen;
