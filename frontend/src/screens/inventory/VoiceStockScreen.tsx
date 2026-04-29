import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, StatusBar, TouchableOpacity, ActivityIndicator, ScrollView, Alert, Dimensions, FlatList } from 'react-native';
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
  AlertCircle,
  RefreshCw,
  TrendingUp,
  Package
} from 'lucide-react-native';
import { Audio } from 'expo-av';
import { listInventory, uploadVoice, getSummary } from '../../services/inventoryApi';
import { InventoryRecord, InventorySummary, VoiceTranscribeResponse } from '../../types/voice-inventory';

interface HistoryItem {
  id: string;
  text: string;
  time: string;
  status: 'success' | 'error';
  transcription?: string;
}

interface TableData {
  inventory: InventoryRecord[];
  summary: InventorySummary | null;
}

const VoiceStockScreen = ({ navigation }: any) => {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showTable, setShowTable] = useState(false);
  const [tableData, setTableData] = useState<TableData>({
    inventory: [],
    summary: null,
  });
  const [history, setHistory] = useState<HistoryItem[]>([]);
  
  const recordingRef = useRef<Audio.Recording | null>(null);
  const windowHeight = Dimensions.get('window').height;

  // Load inventory data on mount
  useEffect(() => {
    loadInventoryData();
    return () => {
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync();
      }
    };
  }, []);

  const loadInventoryData = async () => {
    try {
      setIsLoadingData(true);
      const [inventory, summary] = await Promise.all([
        listInventory(),
        getSummary(),
      ]);
      setTableData({
        inventory: inventory || [],
        summary: summary || null,
      });
      setError(null);
    } catch (err: any) {
      console.error('Failed to load inventory:', err);
      setError(`Failed to load inventory: ${err.message}`);
    } finally {
      setIsLoadingData(false);
    }
  };

  const convertRecordingToBlob = async (uri: string): Promise<Blob> => {
    const response = await fetch(uri);
    return await response.blob();
  };

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
      
      if (!uri) {
        throw new Error('Failed to get recording URI');
      }

      // Convert recording to blob and upload
      const audioBlob = await convertRecordingToBlob(uri);
      
      if (audioBlob.size === 0) {
        throw new Error('Recording is empty');
      }

      // Upload to backend
      const response: VoiceTranscribeResponse = await uploadVoice(audioBlob);
      
      const resultText = response.text || 'Unknown command';
      setTranscript(`Heard: "${resultText}"`);
      
      // Add to history
      const timestamp = new Date();
      const timeStr = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      setHistory(prev => [{
        id: Date.now().toString(),
        text: resultText,
        time: timeStr,
        status: 'success',
        transcription: response.text
      }, ...prev]);

      // Reload inventory data to show updates
      await loadInventoryData();
      setError(null);
      setIsProcessing(false);

    } catch (err: any) {
      console.error('Recording error:', err);
      const errorMsg = err.message || 'Failed to process voice input';
      setError(errorMsg);
      setTranscript('');
      setIsProcessing(false);
      
      // Add error to history
      const timestamp = new Date();
      const timeStr = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setHistory(prev => [{
        id: Date.now().toString(),
        text: `Error: ${errorMsg}`,
        time: timeStr,
        status: 'error',
      }, ...prev]);
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
         <TouchableOpacity 
           onPress={() => setShowTable(!showTable)}
           className="p-3 bg-white/10 rounded-2xl"
         >
            <View className="flex-row items-center gap-2">
              {showTable ? <Mic color="white" size={20} /> : <Package color="white" size={20} />}
            </View>
         </TouchableOpacity>
      </View>

      {/* Main Content */}
      {showTable ? (
        // TABLE VIEW
        <ScrollView className="flex-1 px-6 py-4" showsVerticalScrollIndicator={false}>
          {/* Summary Cards */}
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

          {/* Inventory Table */}
          <View className="mb-6">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-white font-bold text-lg">Inventory</Text>
              <TouchableOpacity 
                onPress={loadInventoryData}
                disabled={isLoadingData}
              >
                <RefreshCw 
                  color={isLoadingData ? '#888' : 'white'} 
                  size={20} 
                  style={{ opacity: isLoadingData ? 0.5 : 1 }}
                />
              </TouchableOpacity>
            </View>

            {isLoadingData ? (
              <View className="h-40 justify-center items-center">
                <ActivityIndicator size="large" color="#10B981" />
              </View>
            ) : tableData.inventory.length === 0 ? (
              <View className="bg-white/5 border border-white/10 rounded-2xl p-4 items-center">
                <Text className="text-white/60">No inventory items</Text>
              </View>
            ) : (
              <View className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                {/* Table Header */}
                <View className="bg-white/10 p-3 flex-row border-b border-white/10">
                  <Text className="text-white/60 font-bold text-[11px] flex-1">Product</Text>
                  <Text className="text-white/60 font-bold text-[11px] w-16">Qty</Text>
                  <Text className="text-white/60 font-bold text-[11px] w-16">Price</Text>
                  <Text className="text-white/60 font-bold text-[11px] w-16">Profit</Text>
                </View>

                {/* Table Rows */}
                {tableData.inventory.slice(0, 10).map((item, idx) => (
                  <View 
                    key={item.id}
                    className={`flex-row p-3 border-b ${idx === tableData.inventory.length - 1 ? 'border-white/0' : 'border-white/5'}`}
                  >
                    <Text className="text-white text-[12px] flex-1 flex-wrap" numberOfLines={2}>
                      {item.product_name}
                    </Text>
                    <Text className="text-white/80 text-[12px] w-16 text-center">{item.quantity}</Text>
                    <Text className="text-white/80 text-[12px] w-16 text-center">
                      ${parseFloat(item.price.toString()).toFixed(2)}
                    </Text>
                    <Text className="text-emerald-400 text-[12px] w-16 text-center font-semibold">
                      ${parseFloat(item.profit.toString()).toFixed(2)}
                    </Text>
                  </View>
                ))}

                {tableData.inventory.length > 10 && (
                  <View className="p-3 items-center border-t border-white/10">
                    <Text className="text-white/60 text-[12px]">
                      +{tableData.inventory.length - 10} more items
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </ScrollView>
      ) : (
        // VOICE VIEW
        <View className="flex-1 px-6 justify-center">
          {error && (
            <View className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 mb-4">
              <View className="flex-row gap-2">
                <AlertCircle color="#f87171" size={20} />
                <Text className="text-red-400 flex-1">{error}</Text>
              </View>
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
      )}

      {/* History */}
      <View className="bg-white/5 border-t border-white/10 p-6 rounded-t-[40px] max-h-40">
         <Text className="text-white/60 mb-4 font-bold uppercase text-[10px]">Recent Activity</Text>
         <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {history.length === 0 ? (
              <Text className="text-white/40 text-[12px]">No activity yet</Text>
            ) : (
              history.map((item) => (
                <View 
                  key={item.id} 
                  className={`p-4 rounded-2xl w-56 mr-4 border flex-row gap-2 ${
                    item.status === 'success' 
                      ? 'bg-emerald-500/10 border-emerald-500/30' 
                      : 'bg-red-500/10 border-red-500/30'
                  }`}
                >
                  {item.status === 'success' ? (
                    <CheckCircle2 color="#10B981" size={16} />
                  ) : (
                    <AlertCircle color="#f87171" size={16} />
                  )}
                  <View className="flex-1">
                    <Text className="text-white font-medium text-[12px]" numberOfLines={2}>
                      {item.text}
                    </Text>
                    <Text className="text-white/40 text-[10px] mt-1">{item.time}</Text>
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