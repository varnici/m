import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StatusBar,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  Mic,
  X,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react-native';
import {
  useAudioRecorder,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from 'expo-audio';
import type { RootStackScreenProps } from '@/navigation/types';
import {
  createInventory,
  syncPendingInventory,
  uploadVoiceAndParse,
} from '../../services/inventoryApi';
import { VoiceTranscribeResponse } from '../../types/voice-inventory';
import Toast from 'react-native-toast-message';

interface HistoryItem {
  id: string;
  text: string;
  time: string;
  status: 'success' | 'error';
}

const VoiceStockScreen = ({
  navigation,
}: RootStackScreenProps<'VoiceStock'>) => {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusLine, setStatusLine] = useState('Hold the button and speak');
  const [parsedPreview, setParsedPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  useEffect(() => {
    syncPendingInventory().catch(() => undefined);
  }, []);

  const startRecording = async () => {
    try {
      setError(null);
      setParsedPreview(null);
      const { granted } = await requestRecordingPermissionsAsync();
      if (!granted) {
        throw new Error('Allow microphone access in Settings to use voice stock');
      }
      await setAudioModeAsync({ playsInSilentMode: true });
      recorder.record();
      setIsListening(true);
      setStatusLine('Listening… release when finished');
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (err: any) {
      setError(err.message);
      setIsListening(false);
    }
  };

  const stopRecording = async () => {
    if (!recorder.isRecording) return;
    try {
      setIsListening(false);
      setIsProcessing(true);
      setStatusLine('Understanding what you said…');

      await recorder.stop();
      const uri = recorder.uri;
      if (!uri) throw new Error('Recording failed — try again');

      const response = await fetch(uri);
      const audioBlob = await response.blob();
      if (audioBlob.size === 0) throw new Error('We did not hear anything — speak closer to the phone');

      const ext = uri.split('.').pop()?.toLowerCase() || 'm4a';
      const result: VoiceTranscribeResponse = await uploadVoiceAndParse(
        audioBlob,
        `voice-input.${ext}`
      );

      const { text, inventory } = result;
      setStatusLine(`Heard: “${text}”`);
      setParsedPreview(
        `${inventory.product_name} · qty ${inventory.quantity} · sell ₦${inventory.price}`
      );

      await createInventory(inventory);
      await syncPendingInventory();
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      const timeStr = new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
      setHistory((prev) => [
        {
          id: Date.now().toString(),
          text: `${inventory.product_name} — ${inventory.quantity} units`,
          time: timeStr,
          status: 'success',
        },
        ...prev,
      ]);
      Toast.show({
        type: 'success',
        text1: 'Stock recorded',
        text2: inventory.product_name,
      });
      setError(null);
    } catch (err: any) {
      const msg = err.message || 'Voice entry failed';
      setError(msg);
      setStatusLine('Hold the button and try again');
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setHistory((prev) => [
        {
          id: Date.now().toString(),
          text: msg,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: 'error',
        },
        ...prev,
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      <StatusBar barStyle="light-content" />

      <View className="px-4 pt-2 pb-4 flex-row items-center">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="p-3 bg-white/10 rounded-2xl"
          accessibilityLabel="Close voice entry"
        >
          <X color="white" size={22} />
        </TouchableOpacity>
        <View className="flex-1 items-center">
          <Text className="text-white text-lg font-bold">Voice stock</Text>
          <Text className="text-white/50 text-xs mt-0.5">Hands-free counting</Text>
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate('ProductList')}
          className="px-3 py-2 bg-white/10 rounded-xl"
        >
          <Text className="text-white/80 text-xs font-bold">Catalog</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1 px-6"
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
        showsVerticalScrollIndicator={false}
      >
        <View className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-6">
          <Text className="text-white/70 text-sm text-center leading-5">
            Example:{' '}
            <Text className="text-white font-medium">
              “I received 30 cartons of Peak milk, cost 4500, selling 5200”
            </Text>
          </Text>
          <Text className="text-white/40 text-[11px] text-center mt-2">
            English · Yoruba · Igbo · Hausa
          </Text>
        </View>

        {error ? (
          <View className="bg-red-500/15 border border-red-400/40 rounded-2xl p-4 mb-4 flex-row gap-2">
            <AlertCircle color="#fca5a5" size={20} />
            <Text className="text-red-200 flex-1 text-sm">{error}</Text>
          </View>
        ) : null}

        {parsedPreview && !isProcessing ? (
          <View className="bg-emerald-500/15 border border-emerald-400/40 rounded-2xl p-4 mb-6">
            <Text className="text-emerald-300 text-[10px] font-bold uppercase mb-1">
              Saved
            </Text>
            <Text className="text-white text-base font-semibold">{parsedPreview}</Text>
          </View>
        ) : null}

        <Text className="text-white/60 text-center text-sm mb-8 min-h-[40px]">
          {statusLine}
        </Text>

        <View className="items-center mb-8">
          <Pressable
            onPressIn={startRecording}
            onPressOut={() => {
              if (isListening) stopRecording();
            }}
            disabled={isProcessing}
            className={`w-36 h-36 rounded-full items-center justify-center border-4 ${
              isListening ? 'bg-emerald-500 border-emerald-300' : 'bg-white/10 border-white/20'
            }`}
            accessibilityRole="button"
            accessibilityLabel="Hold to record stock entry"
          >
            {isProcessing ? (
              <ActivityIndicator size="large" color="#fff" />
            ) : (
              <Mic size={48} color="#fff" strokeWidth={2} />
            )}
          </Pressable>
          <Text className="text-white font-bold text-sm mt-4">
            {isProcessing ? 'Processing…' : isListening ? 'Release to save' : 'Hold to speak'}
          </Text>
          <Text className="text-white/40 text-xs mt-1">Works offline — syncs later</Text>
        </View>
      </ScrollView>

      {history.length > 0 && (
        <View className="border-t border-white/10 px-4 py-4 max-h-36">
          <Text className="text-white/50 text-[10px] font-bold uppercase mb-2">
            Today
          </Text>
          <ScrollView>
            {history.slice(0, 5).map((item) => (
              <View key={item.id} className="flex-row items-center py-1.5 gap-2">
                {item.status === 'success' ? (
                  <CheckCircle2 size={14} color="#34D399" />
                ) : (
                  <AlertCircle size={14} color="#f87171" />
                )}
                <Text className="text-white/80 text-xs flex-1" numberOfLines={1}>
                  {item.text}
                </Text>
                <Text className="text-white/30 text-[10px]">{item.time}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}
    </SafeAreaView>
  );
};

export default VoiceStockScreen;
