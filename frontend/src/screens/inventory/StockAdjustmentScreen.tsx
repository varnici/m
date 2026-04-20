import React, { useState } from 'react';
import { View, Text, TextInput, ScrollView, StatusBar, TouchableOpacity, ActivityIndicator, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RootStackScreenProps } from '@/navigation/types';
import { ChevronLeft, Mic, Camera, Plus, Minus } from 'lucide-react-native';
import { colors } from '@/theme/colors';
import { useRecordStockMovement, useProductDetail } from '@/hooks/useInventory';
import Toast from 'react-native-toast-message';

type MovementType = 'sale' | 'purchase' | 'adjustment' | 'damage';

const StockAdjustmentScreen = ({
  navigation,
  route,
}: RootStackScreenProps<'StockAdjustment'>) => {
  const { productId, storeId } = route.params || {};
  
  const [quantity, setQuantity] = useState('');
  const [movementType, setMovementType] = useState<MovementType>('adjustment');
  const [inputMethod, setInputMethod] = useState<'manual' | 'voice' | 'scan'>('manual');
  const [notes, setNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Fetch product details
  const { data: product, isLoading: productLoading } = useProductDetail(productId);

  // Record stock movement mutation
  const { mutateAsync: recordMovement, isPending: isRecording } = useRecordStockMovement();

  // Handle quantity buttons
  const handleQuantityChange = (operation: 'add' | 'subtract') => {
    const current = parseInt(quantity) || 0;
    const newValue = operation === 'add' ? current + 1 : Math.max(0, current - 1);
    setQuantity(newValue.toString());
  };

  // Handle quick quantities
  const setQuickQuantity = (qty: number) => {
    setQuantity(qty.toString());
  };

  // Submit adjustment
  const handleSubmit = async () => {
    const parsedQuantity = parseInt(quantity, 10);
    const resolvedStoreId = storeId || product?.stock_by_location?.[0]?.store_id;

    if (!quantity || !productId || Number.isNaN(parsedQuantity) || parsedQuantity <= 0) {
      Toast.show({
        type: 'error',
        text1: 'Missing Information',
        text2: 'Please enter a valid quantity',
      });
      return;
    }

    if (!resolvedStoreId) {
      Toast.show({
        type: 'error',
        text1: 'Store Required',
        text2: 'Select a valid store before recording movement',
      });
      return;
    }

    setIsProcessing(true);

    try {
      const payload: any = {
        product_id: productId,
        movement_type: movementType,
        quantity: parsedQuantity,
        input_method: inputMethod,
        notes: notes || undefined,
      };

      if (movementType === 'sale' || movementType === 'damage') {
        payload.from_store_id = resolvedStoreId;
      } else {
        payload.to_store_id = resolvedStoreId;
      }

      await recordMovement(payload);

      Toast.show({
        type: 'success',
        text1: 'Stock Updated',
        text2: `${quantity} units recorded as ${movementType}`,
      });

      // Reset form
      setQuantity('');
      setMovementType('adjustment');
      setNotes('');
      setShowConfirm(false);

      // Go back after 1.5 seconds
      setTimeout(() => navigation.goBack(), 1500);
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to record stock movement',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const movementTypes = [
    { id: 'adjustment', label: 'Adjustment', icon: 'ADJ', color: 'bg-blue-50', textColor: 'text-blue-700' },
    { id: 'sale', label: 'Sale', icon: 'SAL', color: 'bg-red-50', textColor: 'text-red-700' },
    { id: 'purchase', label: 'Purchase', icon: 'PUR', color: 'bg-emerald-50', textColor: 'text-emerald-700' },
    { id: 'damage', label: 'Damage', icon: 'DMG', color: 'bg-orange-50', textColor: 'text-orange-700' },
  ];

  return (
    <SafeAreaView className="flex-1 bg-background-page">
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 pt-4 pb-6">
        <TouchableOpacity onPress={() => navigation.goBack()} className="p-2">
          <ChevronLeft color="white" size={24} />
        </TouchableOpacity>
        <Text className="text-white text-lg font-bold">Stock Adjustment</Text>
        <View className="w-10" />
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {productLoading ? (
          <View className="items-center justify-center py-20">
            <ActivityIndicator size="large" color={colors.ventureroot.green} />
          </View>
        ) : product ? (
          <>
            {/* Product Info */}
            <View className="bg-white mx-4 mb-6 p-6 rounded-3xl border border-gray-100 shadow-sm">
              <Text className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Product</Text>
              <Text className="text-gray-900 text-2xl font-black mt-1">{product.name}</Text>
              <Text className="text-gray-500 text-sm mt-2">SKU: {product.sku}</Text>
              
              <View className="mt-4 pt-4 border-t border-gray-100 flex-row justify-between">
                <View>
                  <Text className="text-gray-400 text-[10px] font-bold uppercase">Available</Text>
                  <Text className="text-gray-900 font-bold text-lg">{product.quantity_on_hand}</Text>
                </View>
                <View>
                  <Text className="text-gray-400 text-[10px] font-bold uppercase">Min Stock</Text>
                  <Text className="text-gray-900 font-bold text-lg">{product.minimum_stock_level}</Text>
                </View>
                <View>
                  <Text className="text-gray-400 text-[10px] font-bold uppercase">Max Stock</Text>
                  <Text className="text-gray-900 font-bold text-lg">{product.maximum_stock_level}</Text>
                </View>
              </View>
            </View>

            {/* Movement Type Selection */}
            <View className="bg-white mx-4 mb-6 p-6 rounded-3xl border border-gray-100 shadow-sm">
              <Text className="text-gray-900 font-bold text-base mb-4">Movement Type</Text>
              <View className="gap-2">
                {movementTypes.map(type => (
                  <TouchableOpacity
                    key={type.id}
                    onPress={() => setMovementType(type.id as MovementType)}
                    className={`p-4 rounded-2xl border-2 ${
                      movementType === type.id
                        ? `${type.color} border-current`
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <Text className={`text-base font-bold ${
                      movementType === type.id ? type.textColor : 'text-gray-600'
                    }`}>
                      {type.icon} {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Input Method */}
            <View className="bg-white mx-4 mb-6 p-6 rounded-3xl border border-gray-100 shadow-sm">
              <Text className="text-gray-900 font-bold text-base mb-4">Input Method</Text>
              <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={() => setInputMethod('manual')}
                  className={`flex-1 p-4 rounded-2xl border-2 items-center ${
                    inputMethod === 'manual'
                      ? 'bg-blue-50 border-blue-500'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <Text className="text-2xl mb-2">KB</Text>
                  <Text className={`font-bold text-sm ${
                    inputMethod === 'manual' ? 'text-blue-700' : 'text-gray-600'
                  }`}>
                    Manual
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setInputMethod('voice')}
                  className={`flex-1 p-4 rounded-2xl border-2 items-center ${
                    inputMethod === 'voice'
                      ? 'bg-emerald-50 border-emerald-500'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <Mic size={24} color={inputMethod === 'voice' ? '#10B981' : '#999'} />
                  <Text className={`font-bold text-sm mt-1 ${
                    inputMethod === 'voice' ? 'text-emerald-700' : 'text-gray-600'
                  }`}>
                    Voice
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setInputMethod('scan')}
                  className={`flex-1 p-4 rounded-2xl border-2 items-center ${
                    inputMethod === 'scan'
                      ? 'bg-purple-50 border-purple-500'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <Camera size={24} color={inputMethod === 'scan' ? '#A855F7' : '#999'} />
                  <Text className={`font-bold text-sm mt-1 ${
                    inputMethod === 'scan' ? 'text-purple-700' : 'text-gray-600'
                  }`}>
                    Scan
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Quantity Input */}
            <View className="bg-white mx-4 mb-6 p-6 rounded-3xl border border-gray-100 shadow-sm">
              <Text className="text-gray-900 font-bold text-base mb-4">Quantity</Text>
              
              {/* Large Input */}
              <View className="items-center justify-center gap-4 mb-6">
                <View className="flex-row items-center justify-center gap-4">
                  <TouchableOpacity
                    onPress={() => handleQuantityChange('subtract')}
                    className="w-14 h-14 bg-red-50 rounded-2xl items-center justify-center"
                  >
                    <Minus size={24} color="#DC2626" />
                  </TouchableOpacity>

                  <TextInput
                    value={quantity}
                    onChangeText={setQuantity}
                    keyboardType="number-pad"
                    placeholder="0"
                    className="w-20 h-14 bg-gray-50 text-gray-900 text-3xl font-black text-center rounded-2xl border border-gray-200"
                  />

                  <TouchableOpacity
                    onPress={() => handleQuantityChange('add')}
                    className="w-14 h-14 bg-emerald-50 rounded-2xl items-center justify-center"
                  >
                    <Plus size={24} color="#10B981" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Quick Select */}
              <View className="flex-row justify-between gap-2">
                {[5, 10, 25, 50, 100].map(qty => (
                  <TouchableOpacity
                    key={qty}
                    onPress={() => setQuickQuantity(qty)}
                    className={`flex-1 py-2 rounded-lg border ${
                      quantity === qty.toString()
                        ? 'bg-slate-900 border-slate-900'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <Text className={`text-center font-bold text-sm ${
                      quantity === qty.toString() ? 'text-white' : 'text-gray-600'
                    }`}>
                      {qty}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Notes */}
            <View className="bg-white mx-4 mb-6 p-6 rounded-3xl border border-gray-100 shadow-sm">
              <Text className="text-gray-900 font-bold text-base mb-4">Notes (Optional)</Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Add reason or reference..."
                placeholderTextColor="#999"
                multiline
                numberOfLines={3}
                className="bg-gray-50 text-gray-900 p-3 rounded-2xl border border-gray-200"
              />
            </View>

            {/* Submit Button */}
            <View className="px-4 mb-8 gap-3 flex-row">
              <TouchableOpacity 
                className="flex-1 bg-gray-300 py-4 rounded-xl items-center"
                onPress={() => navigation.goBack()}
              >
                <Text className="text-gray-700 font-bold text-base">Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                disabled={!quantity || isProcessing || isRecording}
                className={`flex-1 py-4 rounded-xl items-center ${
                  !quantity || isProcessing || isRecording ? 'bg-gray-300' : 'bg-slate-900'
                }`}
                onPress={() => setShowConfirm(true)}
              >
                {isProcessing || isRecording ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-bold text-base">Record Movement</Text>
                )}
              </TouchableOpacity>
            </View>
          </>
        ) : null}
      </ScrollView>

      {/* Confirmation Modal */}
      <Modal visible={showConfirm} transparent animationType="fade">
        <View className="flex-1 bg-black/50 items-center justify-center px-4">
          <View className="bg-white rounded-3xl p-6 w-full">
            <Text className="text-gray-900 text-lg font-bold mb-2">Confirm Adjustment</Text>
            <Text className="text-gray-600 text-sm mb-6">
              Record {quantity} units as {movementType}?
            </Text>

            <View className="flex-row gap-3">
              <TouchableOpacity 
                className="flex-1 bg-gray-100 py-3 rounded-xl items-center"
                onPress={() => setShowConfirm(false)}
              >
                <Text className="text-gray-700 font-bold">Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                className="flex-1 bg-slate-900 py-3 rounded-xl items-center"
                onPress={handleSubmit}
              >
                <Text className="text-white font-bold">Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default StockAdjustmentScreen;
