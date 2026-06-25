import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { useAppNavigationStore } from '@/store/appNavigationStore';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  navigation?: any;
}

const ScreenHeader = ({ title, subtitle, showBack = true, onBack, navigation }: ScreenHeaderProps) => {
  const storeGoBack = useAppNavigationStore((s) => s.goBack);
  const handleBack = onBack || (navigation ? () => navigation.goBack() : storeGoBack);

  return (
    <View className="bg-ventureroot-green pt-12 pb-6 px-4">
      <View className="flex-row items-center mb-4">
        {showBack ? (
          <TouchableOpacity
            onPress={handleBack}
            className="mr-3"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
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
