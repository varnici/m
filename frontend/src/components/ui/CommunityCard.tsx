import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

interface CommunityCardProps {
  platform: string;
  icon: React.ReactNode;
  description?: string;
  memberCount?: string;
  isOfficial?: boolean;
  bgColor?: string;
  onFollow?: () => void;
}

const CommunityCard = ({
  platform,
  icon,
  description,
  memberCount,
  isOfficial = false,
  bgColor = '#D1FAE5',
  onFollow,
}: CommunityCardProps) => {
  return (
    <TouchableOpacity
      className="bg-white rounded-2xl p-4 mx-4 mb-4 border border-gray-100 shadow-sm"
      onPress={onFollow}
      accessible={true}
      accessibilityLabel={`${platform} community. ${memberCount || ''} members.`}
      accessibilityRole="button"
    >
      <View className="flex-row items-center">
        {/* Platform Icon */}
        <View
          className="w-12 h-12 rounded-full items-center justify-center mr-3"
          style={{ backgroundColor: bgColor }}
        >
          {icon}
        </View>

        {/* Info */}
        <View className="flex-1">
          <View className="flex-row items-center mb-0.5">
            <Text className="text-gray-900 font-bold text-sm mr-2">
              {platform}
            </Text>
            {isOfficial && (
              <View className="bg-ventureroot-green rounded px-1.5 py-0.5">
                <Text className="text-white text-xs font-medium">OFFICIAL</Text>
              </View>
            )}
          </View>
          {description && (
            <Text className="text-gray-500 text-xs" numberOfLines={1}>
              {description}
            </Text>
          )}
          {memberCount && (
            <Text className="text-gray-400 text-xs mt-0.5">
              {memberCount} members
            </Text>
          )}
        </View>

        {/* Follow Button */}
        <TouchableOpacity
          className="bg-ventureroot-green rounded-lg px-4 py-2"
          onPress={onFollow}
          accessible={true}
          accessibilityLabel={`Follow on ${platform}`}
          accessibilityRole="button"
        >
          <Text className="text-white text-xs font-bold">Follow</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

export default CommunityCard;
