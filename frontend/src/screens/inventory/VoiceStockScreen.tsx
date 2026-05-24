// @ts-nocheck
import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, StatusBar, TouchableOpacity, ActivityIndicator,
  ScrollView, Alert, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Mic, X, CheckCircle2, Waves, Zap, AlertCircle, RefreshCw, Package,
} from 'lucide-react-native';
import { Audio } from 'expo-av';
import {
  createInventory, listInventory, syncPendingInventory,
  uploadVoiceAndParse, getSummary,
} from '../../services/inventoryApi';
import { InventoryRecord, InventorySummary, VoiceTranscribeResponse } from '../../types/voice-inventory';

interface HistoryItem {
  id: string;
  text: string;
  time: string;
  status: 'success' | 'error';
  source?: 'claude' | 'offline';
}

interface TableData {
  inventory: InventoryRecord[];
  summary: InventorySummary | null;
}

const VoiceStockScreen = ({ navigation }: any) => {
  const [isListening, setIsListening]     = useState(false);
  const [isProcessing, setIsProcessing]   = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [transcript, setTranscript]       = useState('');
  const [parsedPreview, setParsedPreview] = useState<string | null>(null);
  const [error, setError]                 = useState<string | null>(null);
  const [showTable, setShowTable]         = useState(false);
  const [tableData, setTableData]         = useState<TableData>({ inventory: [], summary: null });
  const [history, setHistory]             = useState<HistoryItem[]>([]);

  const recordingRef = useRef<Audio.Recording | null>(null);

  useEffect(() => {
    syncPendingInventory().catch(() => undefined);
    loadInventoryData();
    return () => { recordingRef.current?.stopAndUnloadAsync(); };
  }, []);

  const loadInventoryData = async () => {
    try {
      setIsLoadingData(true);
      const [inventory, summary] = await Promise.all([listInventory(), getSummary()]);
      setTableData({ inventory: inventory || [], summary: summary || null });
      setError(null);
    } catch (err: any) {
      setError(`Failed to load inventory: ${err.message}`);
    } finally {
      setIsLoadingData(false);
    }
  };

  const startRecording = async () => {
    try {
      setError(null);
      setParsedPreview(null);
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') throw new Error('Microphone permission denied');

      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
      setIsListening(true);
      setTranscript('Listening… speak naturally');
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
      setTranscript('Processing with AI…');

      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      if (!uri) throw new Error('Failed to get recording URI');

      const response = await fetch(uri);
      const audioBlob = await response.blob();
      if (audioBlob.size === 0) throw new Error('Recording is empty');

      // Detect actual file extension from URI for proper MIME matching
      const ext = uri.split('.').pop()?.toLowerCase() || 'm4a';
      const fileName = `voice-input.${ext}`;

      // One call → transcription + AI field extraction
      const result: VoiceTranscribeResponse = await uploadVoiceAndParse(audioBlob, fileName);

      const { text, inventory, _source } = result;
      setTranscript(`"${text}"`);

      // Show what AI extracted before saving
      const preview = [
        `📦 ${inventory.product_name}`,
        `📊 Qty: ${inventory.quantity}`,
        `💰 Cost: ${inventory.product_cost} → Price: ${inventory.price}`,
        `👤 ${inventory.customer_id}`,
        `🤖 via ${_source === 'claude' ? 'Claude AI' : 'Offline AI'}`,
      ].join('\n');
      setParsedPreview(preview);

      // Save to inventory (offline-safe)
      await createInventory(inventory);
      await syncPendingInventory();
      await loadInventoryData();

      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setHistory(prev => [{
        id: Date.now().toString(),
        text: `${inventory.product_name} — qty ${inventory.quantity}`,
        time: timeStr,
        status: 'success',
        source: _source as 'claude' | 'offline',
      }, ...prev]);

      setError(null);
    } catch (err: any) {
      const msg = err.message || 'Failed to process voice input';
      setError(msg);
      setTranscript('');
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setHistory(prev => [{
        id: Date.now().toString(),
        text: `Error: ${msg}`,
        time: timeStr,
        status: 'error',
      }, ...prev]);
    } finally {
      recordingRef.current = null;
      setIsProcessing(false);
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
          <Text className="text-white/40 text-[10px]">Speak naturally — AI understands</Text>
        </View>
        <TouchableOpacity onPress={() => setShowTable(!showTable)} className="p-3 bg-white/10 rounded-2xl">
          {showTable ? <Mic color="white" size={20} /> : <Package color="white" size={20} />}
        </TouchableOpacity>
      </View>

      {showTable ? (
        // ── TABLE VIEW ──────────────────────────────────────────────────────
        <ScrollView className="flex-1 px-6 py-4" showsVerticalScrollIndicator={false}>
          {tableData.summary && (
            <View className="mb-6">
              <View className="flex-row gap-3 mb-4">
                <View className="flex-1 bg-emerald-500/20 border border-emerald-500/30 rounded-2xl p-4">
                  <Text className="text-emerald-400 text-[10px] font-bold uppercase">Revenue</Text>
                  <Text className="text-white text-xl font-bold mt-2">
                    ${parseFloat(tableData.summary.total_revenue.toString()).toFixed(2)}
                  </Text>
                </View>
                <View className="flex-1 bg-blue-500/20 border border-blue-500/30 rounded-2xl p-4">
                  <Text className="text-blue-400 text-[10px] font-bold uppercase">Profit</Text>
                  <Text className="text-white text-xl font-bold mt-2">
                    ${parseFloat(tableData.summary.total_profit.toString()).toFixed(2)}
                  </Text>
                </View>
              </View>
              <View className="flex-row gap-3">
                <View className="flex-1 bg-purple-500/20 border border-purple-500/30 rounded-2xl p-4">
                  <Text className="text-purple-400 text-[10px] font-bold uppercase">Items</Text>
                  <Text className="text-white text-xl font-bold mt-2">{tableData.summary.total_items}</Text>
                </View>
                <View className="flex-1 bg-orange-500/20 border border-orange-500/30 rounded-2xl p-4">
                  <Text className="text-orange-400 text-[10px] font-bold uppercase">Sold</Text>
                  <Text className="text-white text-xl font-bold mt-2">{tableData.summary.total_sold}</Text>
                </View>
              </View>
            </View>
          )}

          <View className="mb-6">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-white font-bold text-lg">Inventory</Text>
              <TouchableOpacity onPress={loadInventoryData} disabled={isLoadingData}>
                <RefreshCw color={isLoadingData ? '#888' : 'white'} size={20} />
              </TouchableOpacity>
            </View>

            {isLoadingData ? (
              <View className="h-40 justify-center items-center">
                <ActivityIndicator size="large" color="#10B981" />
              </View>
            ) : tableData.inventory.length === 0 ? (
              <View className="bg-white/5 border border-white/10 rounded-2xl p-4 items-center">
                <Text className="text-white/60">No inventory items yet</Text>
              </View>
            ) : (
              <View className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                <View className="bg-white/10 p-3 flex-row border-b border-white/10">
                  <Text className="text-white/60 font-bold text-[11px] flex-1">Product</Text>
                  <Text className="text-white/60 font-bold text-[11px] w-16">Qty</Text>
                  <Text className="text-white/60 font-bold text-[11px] w-16">Price</Text>
                  <Text className="text-white/60 font-bold text-[11px] w-16">Profit</Text>
                </View>
                {tableData.inventory.slice(0, 10).map((item, idx) => (
                  <View
                    key={item.id}
                    className={`flex-row p-3 border-b ${idx === tableData.inventory.length - 1 ? 'border-white/0' : 'border-white/5'}`}
                  >
                    <Text className="text-white text-[12px] flex-1" numberOfLines={2}>{item.product_name}</Text>
                    <Text className="text-white/80 text-[12px] w-16 text-center">{item.quantity}</Text>
                    <Text className="text-white/80 text-[12px] w-16 text-center">${parseFloat(item.price.toString()).toFixed(2)}</Text>
                    <Text className="text-emerald-400 text-[12px] w-16 text-center font-semibold">${parseFloat(item.profit.toString()).toFixed(2)}</Text>
                  </View>
                ))}
                {tableData.inventory.length > 10 && (
                  <View className="p-3 items-center border-t border-white/10">
                    <Text className="text-white/60 text-[12px]">+{tableData.inventory.length - 10} more items</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </ScrollView>
      ) : (
        // ── VOICE VIEW ──────────────────────────────────────────────────────
        <View className="flex-1 px-6 justify-center">

          {/* Example hint */}
          {!isListening && !isProcessing && !transcript && (
            <View className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-6">
              <Text className="text-white/40 text-[11px] text-center">
                Say something like:{'\n'}
                <Text className="text-white/60 italic">"50 bags of rice, cost 500, selling at 700 for Emeka"</Text>
              </Text>
            </View>
          )}

          {/* Error */}
          {error && (
            <View className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 mb-4">
              <View className="flex-row gap-2">
                <AlertCircle color="#f87171" size={20} />
                <Text className="text-red-400 flex-1">{error}</Text>
              </View>
            </View>
          )}

          {/* Waveform / spinner */}
          <View className="items-center justify-center mb-10 h-32">
            {isListening ? (
              <View className="flex-row items-center gap-1.5">
                {[1, 4, 2, 5, 8, 3, 2, 6, 4].map((h, i) => (
                  <View key={i} className="w-1.5 rounded-full bg-emerald-400" style={{ height: h * 10 }} />
                ))}
              </View>
            ) : isProcessing ? (
              <ActivityIndicator size="large" color="#10B981" />
            ) : (
              <Waves size={72} color="rgba(255,255,255,0.08)" />
            )}
          </View>

          {/* Transcript */}
          {transcript ? (
            <View className="items-center mb-4">
              <Text className="text-white/60 text-[11px] uppercase mb-1">Heard</Text>
              <Text className="text-white text-base font-medium text-center">{transcript}</Text>
            </View>
          ) : null}

          {/* AI parsed preview */}
          {parsedPreview && !isProcessing ? (
            <View className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 mb-6">
              <Text className="text-emerald-400 text-[10px] font-bold uppercase mb-2">AI Extracted</Text>
              <Text className="text-white/80 text-[12px]">{parsedPreview}</Text>
            </View>
          ) : null}

          {/* Mic button */}
          <View className="items-center mt-4">
            <TouchableOpacity
              onPress={isListening ? stopRecording : startRecording}
              disabled={isProcessing}
              className={`w-28 h-28 rounded-full items-center justify-center ${
                isListening ? 'bg-emerald-500' : 'bg-white/10'
              }`}
            >
              {isListening ? <Zap size={40} color="white" /> : <Mic size={40} color="white" />}
            </TouchableOpacity>
            <Text className="text-white/30 text-[10px] mt-3">
              {isListening ? 'Tap to stop' : isProcessing ? 'AI processing…' : 'Tap to record'}
            </Text>
          </View>
        </View>
      )}

      {/* History */}
      <View className="bg-white/5 border-t border-white/10 p-6 rounded-t-[40px] max-h-44">
        <Text className="text-white/60 mb-4 font-bold uppercase text-[10px]">Recent Activity</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {history.length === 0 ? (
            <Text className="text-white/40 text-[12px]">No activity yet</Text>
          ) : (
            history.map(item => (
              <View
                key={item.id}
                className={`p-4 rounded-2xl w-56 mr-4 border flex-row gap-2 ${
                  item.status === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/30'
                    : 'bg-red-500/10 border-red-500/30'
                }`}
              >
                {item.status === 'success'
                  ? <CheckCircle2 color="#10B981" size={16} />
                  : <AlertCircle color="#f87171" size={16} />}
                <View className="flex-1">
                  <Text className="text-white font-medium text-[12px]" numberOfLines={2}>{item.text}</Text>
                  <Text className="text-white/40 text-[10px] mt-1">
                    {item.time}{item.source ? ` · ${item.source === 'claude' ? '🤖 Claude' : '📡 Offline'}` : ''}
                  </Text>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

export default VoiceStockScreen;
// @ts-nocheck
