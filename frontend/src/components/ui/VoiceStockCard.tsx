import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Mic } from 'lucide-react-native';

interface VoiceStockCardProps {
  onTapToSpeak?: () => void;
}

const VoiceStockCard = ({
  onTapToSpeak,
}: VoiceStockCardProps) => {
  return (
    <View
      className="bg-emerald-50 rounded-2xl p-4 mx-4"
      accessible={true}
      accessibilityLabel="Voice Stock Entry. Tap to speak to add inventory."
      accessibilityRole="button"
    >
      <View className="flex-row items-start">
        {/* Mic Icon */}
        <View className="w-12 h-12 rounded-full bg-red-100 items-center justify-center mr-3">
          <Mic size={24} color="#EF4444" />
        </View>

        {/* Content */}
        <View className="flex-1">
          <Text className="text-gray-900 font-bold text-sm mb-1">
            🎙 Voice Stock Entry
          </Text>
          <Text className="text-gray-600 text-xs leading-4 mb-3">
            Say "Add 50 bags of flour" to update inventory hands-free
          </Text>

          <View className="flex-row items-center">
            <TouchableOpacity
              className="bg-red-500 rounded-full px-4 py-2 flex-row items-center mr-3"
              onPress={onTapToSpeak}
              accessible={true}
              accessibilityLabel="Tap to speak"
              accessibilityRole="button"
            >
              <Mic size={14} color="white" />
              <Text className="text-white text-xs font-medium ml-1.5">
                Tap to speak
              </Text>
            </TouchableOpacity>

            <Text className="text-gray-400 text-xs flex-1">
              Works in Yoruba, Igbo,{'\n'}Hausa & English
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

export default VoiceStockCard;
