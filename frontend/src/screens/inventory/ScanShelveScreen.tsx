import React, { useState } from 'react';
import { View, Text, StatusBar, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RootStackScreenProps } from '@/navigation/types';
import { X, RefreshCw, ChevronRight } from 'lucide-react-native';
import BarcodeScanner from '@/components/BarcodeScanner';
import { createInventory, syncPendingInventory } from '@/services/inventoryApi';

const ScanShelveScreen = ({
  navigation,
}: RootStackScreenProps<'ScanShelve'>) => {
  const [scanned, setScanned] = useState<string[]>([]);

  const handleBarcodeScanned = async (barcode: string) => {
    if (scanned.includes(barcode)) return;
    setScanned((prev) => [barcode, ...prev]);
    await createInventory({
      product_name: `Scanned-${barcode}`,
      customer_id: 'SCAN_USER',
      quantity: 1,
      pack_quantity: 0,
      product_cost: 0,
      price: 0,
      sold: 0,
    });
    await syncPendingInventory();
  };

  const handleSubmit = () => {
    Alert.alert(
      'Scan Completed',
      `${scanned.length} item(s) captured. Items are saved and pending ones will auto-sync when online.`,
      [{ text: 'OK', onPress: () => navigation.goBack() }]
    );
  };

  return (
    <View className="flex-1 bg-black">
      <StatusBar barStyle="light-content" />
      <BarcodeScanner onBarcodeScanned={handleBarcodeScanned} />

      {/* Controls Overlay */}
      <SafeAreaView className="absolute inset-0">
         {/* Top Bar */}
         <View className="pt-12 pb-6 px-6 flex-row items-center justify-between">
            <TouchableOpacity onPress={() => navigation.goBack()} className="p-3 bg-black/60 rounded-2xl border border-white/10">
               <X color="white" size={24} />
            </TouchableOpacity>
            
            <View className="px-6 py-3 rounded-2xl border border-white/10 bg-black/60 overflow-hidden">
               <Text className="text-white text-[10px] font-black uppercase tracking-widest">
                 Live Barcode Scanner
               </Text>
            </View>

            <TouchableOpacity className="p-3 bg-black/60 rounded-2xl border border-white/10">
               <RefreshCw color="white" size={24} />
            </TouchableOpacity>
         </View>

         {/* Bottom Control Bar */}
         <View className="absolute bottom-10 left-0 right-0 px-6">
            {/* Live Count Summary */}
            <View className="rounded-[32px] p-6 border border-white/10 shadow-2xl overflow-hidden bg-black/70">
               <View className="flex-row items-center justify-between mb-6">
                  <View className="flex-row items-center">
                     <View>
                        <Text className="text-white font-black text-base">{scanned.length} Items Scanned</Text>
                        <Text className="text-white/40 text-[10px] uppercase font-bold tracking-tighter">
                          Offline-safe: autosync when internet returns
                        </Text>
                     </View>
                  </View>
                  <TouchableOpacity 
                    className="bg-white px-5 py-3 rounded-2xl flex-row items-center"
                    onPress={handleSubmit}
                  >
                     <Text className="text-black font-black text-xs">SUBMIT</Text>
                     <ChevronRight size={14} color="black" style={{ marginLeft: 4 }} />
                  </TouchableOpacity>
               </View>

            </View>
         </View>
      </SafeAreaView>
    </View>
  );
};

export default ScanShelveScreen;
