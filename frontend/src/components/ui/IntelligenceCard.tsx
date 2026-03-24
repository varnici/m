import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ArrowRight } from 'lucide-react-native';

interface IntelligenceCardProps {
  category: string;
  categoryColor?: string;
  source: string;
  timeAgo: string;
  headline: string;
  subtitle?: string;
  icon?: React.ReactNode;
  onPress?: () => void;
}

const categoryColors: Record<string, string> = {
  'Trade Alert': 'bg-red-100 text-red-600',
  'CBN Update': 'bg-blue-100 text-blue-600',
  'For You': 'bg-ventureroot-gold/20 text-amber-700',
  'Sports': 'bg-emerald-100 text-emerald-700',
  'News': 'bg-gray-100 text-gray-600',
  'Stocks': 'bg-purple-100 text-purple-600',
};

const IntelligenceCard = ({
  category,
  source,
  timeAgo,
  headline,
  subtitle,
  icon,
  onPress,
}: IntelligenceCardProps) => {
  const colorClass = categoryColors[category] || 'bg-gray-100 text-gray-600';
  const [bgClass, textColorClass] = colorClass.split(' ');

  return (
    <TouchableOpacity
      className="bg-white rounded-2xl p-4 mx-4 mb-4 border border-gray-100 shadow-sm"
      onPress={onPress}
      accessible={true}
      accessibilityLabel={`${category}: ${headline}`}
      accessibilityRole="button"
    >
      <View className="flex-row items-start">
        {/* Icon */}
        {icon && (
          <View className="mr-3 mt-0.5">
            {icon}
          </View>
        )}

        <View className="flex-1">
          {/* Category + Meta */}
          <View className="flex-row items-center mb-2">
            <View className={`${bgClass} rounded px-2 py-0.5 mr-2`}>
              <Text className={`${textColorClass} text-xs font-medium`}>
                {category}
              </Text>
            </View>
            <Text className="text-gray-400 text-xs">
              {timeAgo} · {source}
            </Text>
          </View>

          {/* Headline */}
          <Text className="text-gray-900 text-sm font-semibold leading-5 mb-1">
            {headline}
          </Text>

          {/* Subtitle */}
          {subtitle && (
            <Text className="text-emerald-600 text-xs mb-2">
              {subtitle}
            </Text>
          )}
        </View>

        {/* Read Arrow */}
        <View className="flex-row items-center ml-2">
          <Text className="text-ventureroot-green text-xs font-medium mr-1">Read</Text>
          <ArrowRight size={12} color="#004D2C" />
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default IntelligenceCard;
