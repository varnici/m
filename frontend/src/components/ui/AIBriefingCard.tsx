import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Sparkles, ArrowRight } from 'lucide-react-native';

interface BriefingInsight {
  emoji: string;
  text: string;
}

interface BriefingMetric {
  label: string;
  value: string;
}

interface AIBriefingCardProps {
  insights?: BriefingInsight[];
  metrics?: BriefingMetric[];
  updatedAt?: string;
  onFullReport?: () => void;
}

const AIBriefingCard = ({
  insights = [
    {
      emoji: '🚀',
      text: 'Restock Indomie — 3 days to stockout. Dangote flour is 8% cheaper. A Group Pool in Lekki closes in 2 days. CBN rates unchanged — your loan costs stay flat.',
    },
  ],
  metrics = [
    { label: 'Top product', value: 'Indomie 70g' },
    { label: 'Loan limit', value: '↑ ₦280K' },
    { label: 'Margin risk', value: 'Electronics' },
  ],
  updatedAt = 'Today 7:00 AM',
  onFullReport,
}: AIBriefingCardProps) => {
  return (
    <View
      className="bg-ventureroot-green rounded-2xl p-4 mx-4"
      accessible={true}
      accessibilityLabel="VR AI Daily Briefing"
      accessibilityRole="summary"
    >
      {/* Header Row */}
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center flex-1">
          <View className="w-8 h-8 rounded-full bg-white/20 items-center justify-center mr-2">
            <Sparkles size={16} color="#FFCC00" />
          </View>
          <View className="flex-1">
            <Text className="text-white font-bold text-sm">
              VR AI · Daily Briefing
            </Text>
            <Text className="text-white/60 text-xs">
              Auto-updated · {updatedAt}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          className="bg-white/20 rounded-lg px-3 py-1.5 flex-row items-center"
          onPress={onFullReport}
          accessible={true}
          accessibilityLabel="View full report"
          accessibilityRole="button"
        >
          <Text className="text-white text-xs font-medium mr-1">Full Report</Text>
          <ArrowRight size={12} color="white" />
        </TouchableOpacity>
      </View>

      {/* Insights */}
      {insights.map((insight, index) => (
        <Text key={index} className="text-white/90 text-sm leading-5 mb-3">
          {insight.emoji} {insight.text}
        </Text>
      ))}

      {/* Metrics Row */}
      {metrics && metrics.length > 0 && (
        <View className="flex-row border-t border-white/10 pt-3">
          {metrics.map((metric, index) => (
            <View key={index} className="flex-1">
              <Text className="text-white/60 text-xs mb-1">
                {metric.label}
              </Text>
              <Text className="text-white font-bold text-xs">
                {metric.value}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

export default AIBriefingCard;
