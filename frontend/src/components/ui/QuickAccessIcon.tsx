import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { LucideIcon } from 'lucide-react-native';

interface QuickAccessIconProps {
  icon: LucideIcon;
  label: string;
  iconColor?: string;
  bgColor?: string;
  onPress?: () => void;
}

const QuickAccessIcon = ({
  icon: Icon,
  label,
  iconColor = '#004D2C',
  bgColor = '#D1FAE5',
  onPress,
}: QuickAccessIconProps) => {
  return (
    <TouchableOpacity
      className="items-center w-[72px]"
      onPress={onPress}
      accessible={true}
      accessibilityLabel={label}
      accessibilityRole="button"
    >
      <View
        className="w-14 h-14 rounded-2xl items-center justify-center mb-2"
        style={{ backgroundColor: bgColor }}
      >
        <Icon size={24} color={iconColor} />
      </View>
      <Text className="text-gray-700 text-xs text-center" numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
  );
};

export default QuickAccessIcon;
