import React from 'react';
import { View, Text } from 'react-native';
import { Trophy } from 'lucide-react-native';

interface SalesStreakCardProps {
  streakDays?: number;
  totalDays?: number;
  pointsEarned?: number;
  nextReward?: string;
}

const SalesStreakCard = ({
  streakDays = 5,
  totalDays = 7,
  pointsEarned = 50,
  nextReward = 'Silver',
}: SalesStreakCardProps) => {
  const dots = Array.from({ length: totalDays }, (_, i) => i < streakDays);

  return (
    <View
      className="bg-white rounded-2xl p-4 mx-4"
      accessible={true}
      accessibilityLabel={`${streakDays}-Day Sales Streak. ${pointsEarned} points earned.`}
      accessibilityRole="summary"
    >
      <View className="flex-row items-center">
        {/* Trophy Icon */}
        <View className="w-10 h-10 rounded-full bg-amber-100 items-center justify-center mr-3">
          <Trophy size={20} color="#F59E0B" />
        </View>

        {/* Streak Info */}
        <View className="flex-1">
          <Text className="text-gray-900 font-bold text-base">
            {streakDays}-Day{'\n'}Sales{'\n'}Streak!
          </Text>
          <Text className="text-emerald-500 text-xs mt-1">
            +{pointsEarned} pts earned
          </Text>
          <Text className="text-gray-400 text-xs">
            Keep going to{'\n'}unlock {nextReward} rewards
          </Text>
        </View>

        {/* Streak Dots */}
        <View className="flex-row items-center flex-wrap gap-1.5 shrink max-w-[50%]">
          {dots.map((filled, index) => (
            <View
              key={index}
              className={`w-3.5 h-3.5 rounded-full ${
                filled ? 'bg-ventureroot-green' : 'bg-gray-200'
              }`}
            />
          ))}
        </View>
      </View>
    </View>
  );
};

export default SalesStreakCard;
