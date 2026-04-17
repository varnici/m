import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import type { RootStackNavigation } from '@/navigation/types';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  navigation: RootStackNavigation;
  showBack?: boolean;
}

const ScreenHeader = ({ title, subtitle, navigation, showBack = true }: ScreenHeaderProps) => {
  return (
    <View className="bg-ventureroot-green pt-12 pb-6 px-4">
      <View className="flex-row items-center mb-4">
        {showBack ? (
          <TouchableOpacity onPress={navigation.goBack} className="mr-3">
            <ChevronLeft color="white" size={24} />
          </TouchableOpacity>
        ) : (
          <View className="w-9" />
        )}
        <View>
          {subtitle ? <Text className="text-white/70 text-xs font-medium uppercase tracking-wider">{subtitle}</Text> : null}
          <Text className="text-white text-2xl font-bold">{title}</Text>
        </View>
      </View>
    </View>
  );
};

export default ScreenHeader;
