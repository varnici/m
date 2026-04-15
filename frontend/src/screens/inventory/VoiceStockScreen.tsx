import React, { useState } from 'react';
import { View, Text, SafeAreaView, StatusBar, TouchableOpacity } from 'react-native';
import type { RootStackScreenProps } from '@/navigation/types';
import { ChevronLeft, Mic, X, Circle } from 'lucide-react-native';
import { colors } from '@/theme/colors';

const VoiceStockScreen = ({
  navigation,
}: RootStackScreenProps<'VoiceStock'>) => {
  const [isListening, setIsListening] = useState(false);

  return (
    <SafeAreaView className="flex-1 bg-slate-900">
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View className="pt-12 pb-6 px-4 flex-row items-center justify-between">
         <TouchableOpacity onPress={() => navigation.goBack()} className="p-2 bg-white/10 rounded-full">
            <X color="white" size={24} />
         </TouchableOpacity>
         <Text className="text-white text-lg font-bold">Voice Restock</Text>
         <View className="w-10" /> {/* Spacer */}
      </View>

      <View className="flex-1 items-center justify-center px-10">
         {/* Waveform Visualization Mock */}
         <View className="flex-row items-center justify-center gap-1 mb-20 h-20">
            {[1, 2, 3, 4, 3, 2, 1, 3, 5, 4, 3, 2, 6, 8, 4, 2, 1].map((h, i) => (
               <View 
                 key={i} 
                 className={`w-1 rounded-full ${isListening ? 'bg-emerald-400' : 'bg-white/20'}`} 
                 style={{ height: isListening ? h * 8 : 4 }} 
               />
            ))}
         </View>

         {/* Transcription View */}
         <View className="items-center mb-10">
            <Text className="text-white/40 text-xs font-bold uppercase tracking-widest mb-4">Listening for command...</Text>
            <Text className="text-white text-2xl font-medium text-center leading-10">
               {isListening ? '"Add 40 cartons of Indomie 70g to main warehouse..."' : '"Tap mic to start speaking"'}
            </Text>
         </View>

         {/* Mic Trigger */}
         <TouchableOpacity 
           onPress={() => setIsListening(!isListening)}
           className={`w-24 h-24 rounded-full items-center justify-center ${isListening ? 'bg-emerald-500 shadow-emerald-500/50' : 'bg-white/10 border border-white/20'}`}
           style={{ shadowColor: '#10B981', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 20 }}
         >
            <Mic size={40} color="white" fill={isListening ? 'white' : 'transparent'} />
         </TouchableOpacity>

         {/* Instruction Tags */}
         <View className="flex-row flex-wrap justify-center gap-2 mt-20">
            {['"Sold 2 cartons"', '"Damaged stock"', '"New delivery"'].map((tag) => (
               <View key={tag} className="bg-white/5 border border-white/10 px-4 py-2 rounded-full">
                  <Text className="text-white/50 text-[10px] font-bold italic">{tag}</Text>
               </View>
            ))}
         </View>
      </View>

      {/* Footer Branding */}
      <View className="pb-10 items-center">
         <View className="flex-row items-center bg-white/5 px-3 py-1.5 rounded-full">
            <Text className="text-white/40 text-[10px] font-bold">VentureRoot Voice AI · v1.4</Text>
         </View>
      </View>
    </SafeAreaView>
  );
};

export default VoiceStockScreen;
