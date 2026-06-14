import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Mic, ScanLine } from 'lucide-react-native';

interface VoiceStockCardProps {
  onVoice?: () => void;
  onScan?: () => void;
}

const VoiceStockCard = ({ onVoice, onScan }: VoiceStockCardProps) => {
  return (
    <View className="mx-4 mb-4">
      <Text className="text-gray-900 font-bold text-base mb-2">Quick stock update</Text>
      <View className="flex-row gap-3">
        <TouchableOpacity
          className="flex-1 bg-indigo-600 rounded-2xl p-4 flex-row items-center"
          onPress={onScan}
          accessibilityRole="button"
          accessibilityLabel="Scan barcode"
        >
          <ScanLine size={22} color="#fff" />
          <View className="ml-3 flex-1">
            <Text className="text-white font-bold text-sm">Scan</Text>
            <Text className="text-white/80 text-[10px]">Barcode on pack</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          className="flex-1 rounded-2xl p-4 flex-row items-center bg-ventureroot-green"
          onPress={onVoice}
          accessibilityRole="button"
          accessibilityLabel="Voice stock entry"
        >
          <Mic size={22} color="#fff" />
          <View className="ml-3 flex-1">
            <Text className="text-white font-bold text-sm">Voice</Text>
            <Text className="text-white/80 text-[10px]">Hold & speak</Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default VoiceStockCard;
