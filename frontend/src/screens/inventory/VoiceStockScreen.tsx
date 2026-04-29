import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, StatusBar, TouchableOpacity, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// FIXED: Using relative paths to match your folder structure
import { 
  Mic, 
  X, 
  CheckCircle2, 
  History,
  Info,
  Waves,
  Zap,
  RotateCcw,
  AlertCircle
} from 'lucide-react-native';
import { Audio } from 'expo-av';

interface HistoryItem {
  id: string;
  text: string;
  time: string;
  status: 'success' | 'error';
}

const VoiceStockScreen = ({ navigation }: any) => {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([
    { id: '1', text: 'Added 50 units of Indomie 70g', time: '2m ago', status: 'success' },
    { id: '2', text: 'Marked 5 Peak Milk as damaged', time: '5m ago', status: 'success' },
  ]);
  
  const recordingRef = useRef<Audio.Recording | null>(null);

  // Clean up recording on unmount
  useEffect(() => {
    return () => {
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync();
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      setError(null);
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        throw new Error('Permission to access microphone was denied');
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      recordingRef.current = recording;
      setIsListening(true);
      setTranscript('Listening...');
    } catch (err: any) {
      setError(err.message);
      setIsListening(false);
    }
  };

  const stopRecording = async () => {
    if (!recordingRef.current) return;

    try {
      setIsListening(false);
      setIsProcessing(true);
      setTranscript('Processing audio...');

      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      
      // MOCK BACKEND CALL (Since you're developing locally)
      // Replace this with your actual fetch call when your backend is live
      setTimeout(() => {
        const mockResult = "Added 50 bags of flour";
        setTranscript(`Heard: "${mockResult}"`);
        setHistory(prev => [{
          id: Date.now().toString(),
          text: mockResult,
          time: 'Just now',
          status: 'success'
        }, ...prev]);
        setIsProcessing(false);
      }, 2000);

    } catch (err: any) {
      setError(err.message);
      setIsProcessing(false);
    } finally {
      recordingRef.current = null;
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View className="pt-6 pb-6 px-6 flex-row items-center justify-between">
         <TouchableOpacity onPress={() => navigation.goBack()} className="p-3 bg-white/10 rounded-2xl">
            <X color="white" size={24} />
         </TouchableOpacity>
         <View className="items-center">
            <Text className="text-white text-lg font-bold">Voice AI</Text>
         </View>
         <TouchableOpacity className="p-3 bg-white/10 rounded-2xl">
            <History color="white" size={20} />
         </TouchableOpacity>
      </View>

      <View className="flex-1 px-6 justify-center">
        {error && (
          <View className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 mb-4">
            <Text className="text-red-400 text-center">{error}</Text>
          </View>
        )}

        {/* Visualizer */}
        <View className="items-center justify-center mb-16 h-40">
           {isListening ? (
             <View className="flex-row items-center gap-1.5">
                {[1, 4, 2, 5, 8, 3, 2, 6, 4].map((h, i) => (
                   <View key={i} className="w-1.5 rounded-full bg-emerald-400" style={{ height: h * 10 }} />
                ))}
             </View>
           ) : isProcessing ? (
             <ActivityIndicator size="large" color="#10B981" />
           ) : (
             <Waves size={80} color="rgba(255,255,255,0.1)" />
           )}
        </View>

        {/* Transcript */}
        <View className="items-center mb-10">
           <Text className="text-white text-xl font-medium text-center">
              {transcript || (isListening ? 'Listening...' : 'Tap the mic to start')}
           </Text>
        </View>

        {/* Control */}
        <View className="items-center">
           <TouchableOpacity 
             onPress={isListening ? stopRecording : startRecording}
             disabled={isProcessing}
             className={`w-28 h-28 rounded-full items-center justify-center ${isListening ? 'bg-emerald-500' : 'bg-white/10'}`}
           >
              {isListening ? <Zap size={40} color="white" /> : <Mic size={40} color="white" />}
           </TouchableOpacity>
        </View>
      </View>

      {/* History */}
      <View className="bg-white/5 border-t border-white/10 p-6 rounded-t-[40px]">
         <Text className="text-white/60 mb-4 font-bold uppercase text-[10px]">Recent Activity</Text>
         <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {history.map((item) => (
              <View key={item.id} className="bg-white/10 p-4 rounded-2xl w-56 mr-4 border border-white/5">
                <Text className="text-white font-medium">{item.text}</Text>
                <Text className="text-white/40 text-[10px] mt-2">{item.time}</Text>
              </View>
            ))}
         </ScrollView>
      </View>
    </SafeAreaView>
  );
};

export default VoiceStockScreen;