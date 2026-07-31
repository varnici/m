import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, Minus, Plus, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { useQueryClient } from '@tanstack/react-query';
import AppHeader from '@/components/ui/AppHeader';
import { useProducts } from '@/hooks/useInventory';
import { inventoryKeys } from '@/hooks/inventoryKeys';
import { useBusinessProfile } from '@/hooks/useBusinessProfile';
import { inventoryService } from '@/services/inventoryService';
import { getCategoryIconComponent, DEFAULT_CATEGORY_TINT } from '@/constants/categoryIcons';
import { useCategories } from '@/hooks/useCategories';
import type { Product } from '@/types/inventory';

interface StockMovementScreenProps {
  direction: 'in' | 'out';
  storeIdOverride?: string;
  onDone: () => void;
}

export function StockMovementScreen({ direction, storeIdOverride, onDone }: StockMovementScreenProps) {
  const isReceiving = direction === 'in';
  const { store } = useBusinessProfile();
  const storeId = storeIdOverride || store?.id;

  const [search, setSearch] = useState('');
  const { data: products = [], isLoading } = useProducts(0, 200, undefined, search);
  const { data: categories = [] } = useCategories();
  const [cart, setCart] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const bump = (productId: string, delta: number) => {
    setCart((c) => {
      const next = Math.max(0, (c[productId] || 0) + delta);
      if (next === 0) {
        const { [productId]: _omit, ...rest } = c;
        return rest;
      }
      return { ...c, [productId]: next };
    });
  };

  const cartLines = useMemo(
    () => Object.entries(cart).map(([productId, quantity]) => ({
      product: products.find((p) => p.id === productId),
      quantity,
    })).filter((l) => l.product) as { product: Product; quantity: number }[],
    [cart, products]
  );

  const totalUnits = cartLines.reduce((sum, l) => sum + l.quantity, 0);
  const totalValueKobo = cartLines.reduce(
    (sum, l) => sum + l.quantity * (isReceiving ? l.product.cost_price_kobo : l.product.selling_price_kobo),
    0
  );

  const handleSubmit = async () => {
    if (!storeId) {
      Toast.show({ type: 'error', text1: 'No store found', text2: 'Set up your business first.' });
      return;
    }
    if (cartLines.length === 0) return;

    setSubmitting(true);
    try {
      for (const line of cartLines) {
        await inventoryService.recordStockMovement({
          product_id: line.product.id,
          movement_type: isReceiving ? 'purchase' : 'sale',
          quantity: line.quantity,
          to_store_id: isReceiving ? storeId : undefined,
          from_store_id: isReceiving ? undefined : storeId,
          input_method: 'manual',
        });
      }
      queryClient.invalidateQueries({ queryKey: inventoryKeys.stock() });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.products() });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.analytics() });
      Toast.show({
        type: 'success',
        text1: isReceiving ? 'Stock received' : 'Stock issued',
        text2: `${totalUnits} unit${totalUnits === 1 ? '' : 's'} across ${cartLines.length} product${cartLines.length === 1 ? '' : 's'}`,
      });
      setCart({});
      onDone();
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: 'Could not record movement',
        text2: err.response?.data?.detail || err.message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const tone = isReceiving ? '#16654A' : '#A32036';

  return (
    <SafeAreaView className="flex-1 bg-background-page" edges={['bottom', 'left', 'right']}>
      <AppHeader title={isReceiving ? 'Receive stock' : 'Issue stock'} variant="green" />

      <View className="px-4 pt-4">
        <View className="flex-row items-center bg-white rounded-2xl border border-gray-100 px-4 py-3 mb-3">
          <Search size={18} color="#9CA3AF" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search product or code"
            className="flex-1 ml-2 text-gray-900"
          />
        </View>
      </View>

      <FlatList
        data={products}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 140 }}
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator size="large" color={tone} style={{ marginTop: 40 }} />
          ) : (
            <Text className="text-gray-400 text-center mt-10">No products match this search.</Text>
          )
        }
        renderItem={({ item }) => {
          const qty = cart[item.id] || 0;
          const category = categories.find((c) => c.id === item.category_id);
          const CatIcon = getCategoryIconComponent(category?.icon);
          const catTint = category?.tint || DEFAULT_CATEGORY_TINT;
          return (
            <View className="bg-white rounded-2xl border border-gray-100 p-3 mb-2 flex-row items-center">
              <View
                className="w-11 h-11 rounded-xl items-center justify-center mr-3"
                style={{ backgroundColor: catTint + '1A' }}
              >
                <CatIcon size={20} color={catTint} strokeWidth={1.8} />
              </View>
              <View className="flex-1">
                <Text className="text-gray-900 font-bold text-sm" numberOfLines={1}>{item.name}</Text>
                <Text className="text-gray-400 text-xs">
                  {(item.total_quantity_on_hand ?? item.quantity_on_hand ?? 0)} in stock · {item.unit_of_measure}
                </Text>
              </View>
              <View className="flex-row items-center bg-gray-50 rounded-xl">
                <TouchableOpacity onPress={() => bump(item.id, -1)} className="p-2.5" disabled={qty === 0}>
                  <Minus size={16} color={qty === 0 ? '#D1D5DB' : '#374151'} />
                </TouchableOpacity>
                <Text className="w-8 text-center font-bold text-gray-900">{qty}</Text>
                <TouchableOpacity onPress={() => bump(item.id, 1)} className="p-2.5">
                  <Plus size={16} color="#374151" />
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />

      <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4">
        <View className="flex-row items-center justify-between mb-3">
          <View>
            <Text className="text-gray-400 text-[10px] font-bold uppercase">
              {isReceiving ? 'Receiving' : 'Issuing'}
            </Text>
            <Text className="text-gray-900 font-black text-2xl">{totalUnits} units</Text>
          </View>
          <Text className="text-gray-500 font-bold">
            ≈ ₦{(totalValueKobo / 100).toLocaleString()}
          </Text>
        </View>
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={submitting || cartLines.length === 0}
          className="py-4 rounded-2xl items-center flex-row justify-center"
          style={{ backgroundColor: cartLines.length === 0 ? '#D1D5DB' : tone }}
        >
          {submitting ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              {isReceiving ? <ArrowDownToLine size={20} color="white" /> : <ArrowUpFromLine size={20} color="white" />}
              <Text className="text-white font-bold text-lg ml-2">
                {isReceiving ? 'Confirm receipt' : 'Confirm issue'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
