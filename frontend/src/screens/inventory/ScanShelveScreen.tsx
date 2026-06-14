import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StatusBar,
  TouchableOpacity,
  FlatList,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import type { RootStackScreenProps } from '@/navigation/types';
import { X, Plus, CheckCircle2, HelpCircle } from 'lucide-react-native';
import BarcodeScanner from '@/components/BarcodeScanner';
import { createInventory, syncPendingInventory } from '@/services/inventoryApi';
import { inventoryService } from '@/services/inventoryService';
import { syncService } from '@/services/syncService';
import Toast from 'react-native-toast-message';

type ScanEntry = {
  id: string;
  barcode: string;
  label: string;
  status: 'added' | 'new' | 'queued';
};

const ScanShelveScreen = ({
  navigation,
}: RootStackScreenProps<'ScanShelve'>) => {
  const [entries, setEntries] = useState<ScanEntry[]>([]);
  const [lastMessage, setLastMessage] = useState('Aim at the barcode on the product');
  const processingRef = useRef(false);

  const pushEntry = (entry: ScanEntry) => {
    setEntries((prev) => [entry, ...prev].slice(0, 20));
  };

  const handleOfflineFallback = async (barcode: string) => {
    await createInventory({
      product_name: `Scanned-${barcode}`,
      customer_id: 'SCAN_USER',
      quantity: 1,
      pack_quantity: 0,
      product_cost: 50.0,
      price: 70.0,
      sold: 0,
    });
    await syncPendingInventory();
    pushEntry({
      id: `${Date.now()}`,
      barcode,
      label: `New item (${barcode.slice(-6)})`,
      status: 'queued',
    });
    setLastMessage('Saved offline — will sync when online');
    Toast.show({
      type: 'info',
      text1: 'Saved offline',
      text2: 'We will sync this scan when you have internet',
    });
  };

  const handleBarcodeScanned = useCallback(
    async (barcode: string) => {
      if (processingRef.current) return;
      if (entries.some((e) => e.barcode === barcode)) {
        setLastMessage('Already scanned — scan the next item');
        return;
      }

      processingRef.current = true;
      setLastMessage('Looking up product…');

      let storeId = 'default_store';
      try {
        const stores = await inventoryService.getStores();
        if (stores.length > 0) storeId = stores[0].id;
      } catch {
        // use default
      }

      try {
        const product = await inventoryService.scanBarcode(barcode, storeId);
        if (product?.id) {
          const movementPayload = {
            product_id: product.id,
            to_store_id: storeId,
            movement_type: 'purchase' as const,
            quantity: 1,
            input_method: 'scan' as const,
            notes: `Scanned barcode ${barcode}`,
          };
          try {
            await inventoryService.recordStockMovement(movementPayload);
          } catch {
            await syncService.addToQueue('record_stock_movement', movementPayload);
          }
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          pushEntry({
            id: `${Date.now()}`,
            barcode,
            label: product.name || 'Product',
            status: 'added',
          });
          setLastMessage(`Added 1 to ${product.name}`);
          Toast.show({
            type: 'success',
            text1: '+1 in stock',
            text2: product.name,
            visibilityTime: 2000,
          });
        } else {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          pushEntry({
            id: `${Date.now()}`,
            barcode,
            label: 'Unknown barcode',
            status: 'new',
          });
          setLastMessage('Product not in catalog — add it or scan again');
          Toast.show({
            type: 'info',
            text1: 'Not in your catalog',
            text2: 'Tap “Add product” below to register this barcode',
          });
        }
      } catch {
        await handleOfflineFallback(barcode);
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } finally {
        processingRef.current = false;
      }
    },
    [entries]
  );

  const handleAddProduct = (barcode?: string) => {
    navigation.navigate('AddProduct', barcode ? { barcode } : undefined);
  };

  const handleDone = () => {
    if (entries.length === 0) {
      navigation.goBack();
      return;
    }
    Toast.show({
      type: 'success',
      text1: 'Scan session done',
      text2: `${entries.length} scan(s) recorded`,
    });
    navigation.goBack();
  };

  return (
    <View className="flex-1 bg-black">
      <StatusBar barStyle="light-content" />
      <BarcodeScanner onBarcodeScanned={handleBarcodeScanned} />

      <SafeAreaView className="absolute inset-0" pointerEvents="box-none">
        <View className="pt-2 px-4 flex-row items-center justify-between">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="p-3 bg-black/70 rounded-2xl"
            accessibilityLabel="Close scanner"
          >
            <X color="white" size={24} />
          </TouchableOpacity>
          <View className="bg-black/70 px-4 py-2 rounded-2xl max-w-[55%]">
            <Text className="text-white font-bold text-sm text-center">Scan stock in</Text>
          </View>
          <View style={{ width: 48 }} />
        </View>

        <View className="flex-1 items-center justify-center px-8" pointerEvents="none">
          <View className="w-64 h-40 border-2 border-white/80 rounded-2xl" />
          <Text className="text-white/90 text-center text-sm mt-4 font-medium">
            {lastMessage}
          </Text>
        </View>

        <View className="px-4 pb-6">
          <View className="bg-black/85 rounded-3xl border border-white/15 overflow-hidden">
            <View className="px-5 pt-4 pb-2 flex-row items-center justify-between">
              <Text className="text-white font-black text-lg">
                {entries.length} scanned
              </Text>
              <TouchableOpacity
                onPress={handleDone}
                className="bg-emerald-500 px-5 py-3 rounded-2xl"
              >
                <Text className="text-white font-black text-sm">Done</Text>
              </TouchableOpacity>
            </View>

            {entries.length > 0 ? (
              <FlatList
                data={entries}
                keyExtractor={(item) => item.id}
                style={{ maxHeight: 140 }}
                renderItem={({ item }) => (
                  <View className="px-5 py-2.5 flex-row items-center border-t border-white/10">
                    {item.status === 'added' ? (
                      <CheckCircle2 size={18} color="#34D399" />
                    ) : item.status === 'new' ? (
                      <HelpCircle size={18} color="#FBBF24" />
                    ) : (
                      <CheckCircle2 size={18} color="#94A3B8" />
                    )}
                    <View className="ml-3 flex-1">
                      <Text className="text-white font-semibold text-sm" numberOfLines={1}>
                        {item.label}
                      </Text>
                      <Text className="text-white/40 text-[10px]">{item.barcode}</Text>
                    </View>
                    {item.status === 'new' && (
                      <TouchableOpacity
                        onPress={() => handleAddProduct(item.barcode)}
                        className="bg-white/15 px-3 py-1.5 rounded-lg"
                      >
                        <Text className="text-white text-[10px] font-bold">Add</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              />
            ) : (
              <Text className="text-white/50 text-xs px-5 pb-4">
                Each beep adds 1 unit. Keep scanning — no need to tap between items.
              </Text>
            )}

            <Pressable
              onPress={() => handleAddProduct()}
              className="mx-4 mb-4 mt-2 flex-row items-center justify-center gap-2 py-3 rounded-2xl border border-dashed border-white/25"
            >
              <Plus size={18} color="#fff" />
              <Text className="text-white font-bold text-sm">Add new product manually</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
};

export default ScanShelveScreen;
