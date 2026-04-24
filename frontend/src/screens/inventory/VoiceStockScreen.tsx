import React, { useState } from 'react';
import { View, Text, StatusBar, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RootStackScreenProps } from '@/navigation/types';
import { 
  Mic, 
  X, 
  CheckCircle2, 
  History,
  Info,
  Waves,
  Zap,
  RotateCcw
} from 'lucide-react-native';
import { colors } from '@/theme/colors';

const VoiceStockScreen = ({
  navigation,
}: RootStackScreenProps<'VoiceStock'>) => {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [history, setHistory] = useState([
    { id: '1', text: 'Added 50 units of Indomie 70g', time: '2m ago', status: 'success' },
    { id: '2', text: 'Marked 5 Peak Milk as damaged', time: '5m ago', status: 'success' },
  ]);

  const toggleListening = () => {
    if (isListening) {
      setIsListening(false);
      setIsProcessing(true);
      setTranscript('Processing: "Restock 20 Milo 400g..."');
      
      // Simulate backend processing
      setTimeout(() => {
        setIsProcessing(false);
        setHistory([{ 
          id: Date.now().toString(), 
          text: 'Restocked 20 units of Milo 400g', 
          time: 'Just now', 
          status: 'success' 
        }, ...history]);
        setTranscript('');
      }, 2000);
    } else {
      setIsListening(true);
      setTranscript('Listening...');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View className="pt-12 pb-6 px-6 flex-row items-center justify-between">
         <TouchableOpacity onPress={() => navigation.goBack()} className="p-3 bg-white/10 rounded-2xl">
            <X color="white" size={24} />
         </TouchableOpacity>
         <View className="items-center">
            <Text className="text-white text-lg font-black">Voice AI</Text>
            <View className="flex-row items-center mt-1">
               <View className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2" />
               <Text className="text-white/40 text-[10px] font-black uppercase tracking-widest">Active System</Text>
            </View>
         </View>
         <TouchableOpacity className="p-3 bg-white/10 rounded-2xl">
            <History color="white" size={20} />
         </TouchableOpacity>
      </View>

      <View className="flex-1 px-6 justify-center">
        {/* Dynamic Visualizer */}
        <View className="items-center justify-center mb-16 h-40">
           {isListening ? (
             <View className="flex-row items-center gap-1.5">
                {[1, 2, 3, 4, 3, 2, 1, 3, 5, 4, 3, 2, 6, 8, 4, 2, 1].map((h, i) => (
                   <View 
                     key={i} 
                     className="w-1.5 rounded-full bg-emerald-400" 
                     style={{ height: h * 12 }} 
                   />
                ))}
             </View>
           ) : isProcessing ? (
             <ActivityIndicator size="large" color="#10B981" />
           ) : (
             <Waves size={80} color="rgba(255,255,255,0.1)" />
           )}
        </View>

        {/* Transcript Area */}
        <View className="items-center mb-20 min-h-[100px]">
           <Text className="text-white/30 text-[10px] font-black uppercase tracking-widest mb-6">Live Transcript</Text>
           <Text className="text-white text-2xl font-bold text-center leading-[44px]">
              {transcript || (isListening ? 'Listening...' : '"Tap the mic and tell me what you need to restock or move"')}
           </Text>
        </View>

        {/* Voice Control Cluster */}
        <View className="items-center">
           <TouchableOpacity 
             onPress={toggleListening}
             disabled={isProcessing}
             className={`w-32 h-32 rounded-full items-center justify-center ${isListening ? 'bg-emerald-500 shadow-emerald-500/50' : 'bg-white/5 border border-white/10'}`}
             style={{ 
               shadowColor: '#10B981', 
               shadowOffset: { width: 0, height: 10 }, 
               shadowOpacity: isListening ? 0.6 : 0, 
               shadowRadius: 20, 
               elevation: 20 
             }}
           >
              {isListening ? (
                 <Zap size={48} color="white" fill="white" />
              ) : (
                 <Mic size={48} color="white" opacity={0.8} />
              )}
           </TouchableOpacity>
        </View>
      </View>

      {/* History Slide-up (Simplified) */}
      <View className="bg-white/5 border-t border-white/10 pt-8 pb-12 px-6 rounded-t-[40px]">
         <View className="flex-row justify-between items-center mb-6">
            <Text className="text-white font-bold text-sm">Recent Actions</Text>
            <TouchableOpacity onPress={() => setHistory([])}>
               <RotateCcw size={16} color="rgba(255,255,255,0.4)" />
            </TouchableOpacity>
         </View>
         
         <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-4">
            {history.map((item) => (
              <View key={item.id} className="bg-white/10 p-4 rounded-3xl w-64 border border-white/5 mr-4">
                 <View className="flex-row items-center mb-2">
                    <CheckCircle2 size={14} color="#10B981" />
                    <Text className="text-white/40 text-[10px] font-bold ml-2">{item.time}</Text>
                 </View>
                 <Text className="text-white font-medium text-sm leading-6">{item.text}</Text>
              </View>
            ))}
            {history.length === 0 && (
              <Text className="text-white/20 text-xs italic py-4">No recent voice commands</Text>
            )}
         </ScrollView>
      </View>

      {/* Tips Overlay */}
      <View className="absolute bottom-4 left-0 right-0 items-center">
         <View className="flex-row items-center bg-emerald-500/10 px-4 py-2 rounded-full border border-emerald-500/20">
            <Info size={12} color="#10B981" />
            <Text className="text-emerald-500/80 text-[10px] font-bold ml-2">TIP: Say "Move 10 Peak Milk to Shelf B2"</Text>
         </View>
      </View>
    </SafeAreaView>
  );
};

export default VoiceStockScreen;
