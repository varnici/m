import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, Minus, Plus, ShoppingCart, Wallet } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import type { RootStackScreenProps } from '@/navigation/types';
import AppHeader from '@/components/ui/AppHeader';
import { useDistributorCatalog, useTradeCredit, useCreateDistributorOrder } from '@/hooks/useDistributorProfile';
import type { Product } from '@/services/distributorService';

const DistributorCatalogScreen = ({ navigation, route }: RootStackScreenProps<'DistributorCatalog'>) => {
  const { distributorId, distributorName } = route.params;
  const [search, setSearch] = useState('');
  const { data: products = [], isLoading } = useDistributorCatalog(distributorId, search);
  const { data: credit, isLoading: creditLoading } = useTradeCredit();
  const createOrder = useCreateDistributorOrder();

  const [cart, setCart] = useState<Record<string, number>>({});

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
    () =>
      Object.entries(cart)
        .map(([productId, quantity]) => ({ product: products.find((p) => p.id === productId), quantity }))
        .filter((l) => l.product) as { product: Product; quantity: number }[],
    [cart, products]
  );

  const totalKobo = cartLines.reduce(
    (sum, l) => sum + l.quantity * (l.product.trade_price_kobo || l.product.selling_price_kobo),
    0
  );
  const exceedsCredit = !!credit && totalKobo > credit.trade_credit_available_kobo;

  const handleSubmit = () => {
    if (cartLines.length === 0) return;
    Alert.alert(
      'Place order?',
      `Order ${cartLines.length} item(s) totalling ₦${(totalKobo / 100).toLocaleString()} from ${distributorName || 'this distributor'}, on Net 30 trade credit.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Place order',
          onPress: () => {
            createOrder.mutate(
              {
                distributorId,
                lines: cartLines.map((l) => ({
                  product_id: l.product.id,
                  quantity: l.quantity,
                  unit_price_kobo: l.product.trade_price_kobo || l.product.selling_price_kobo,
                })),
              },
              {
                onSuccess: () => {
                  Toast.show({ type: 'success', text1: 'Order placed', text2: `${distributorName || 'Distributor'} has been notified` });
                  setCart({});
                  navigation.goBack();
                },
                onError: (err: any) => {
                  Toast.show({ type: 'error', text1: 'Could not place order', text2: err.message });
                },
              }
            );
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background-page" edges={['bottom', 'left', 'right']}>
      <AppHeader title={distributorName || 'Catalog'} subtitle="Order on trade credit" />

      {!creditLoading && credit && (
        <View className={`mx-4 mt-3 p-3 rounded-2xl border flex-row items-center ${exceedsCredit ? 'bg-rose-50 border-rose-100' : 'bg-emerald-50 border-emerald-100'}`}>
          <Wallet size={16} color={exceedsCredit ? '#A32036' : '#16654A'} />
          <Text className={`text-xs font-bold ml-2 flex-1 ${exceedsCredit ? 'text-rose-900' : 'text-emerald-900'}`}>
            ₦{(credit.trade_credit_available_kobo / 100).toLocaleString()} trade credit available
          </Text>
        </View>
      )}

      <View className="px-4 pt-3">
        <View className="flex-row items-center bg-white rounded-2xl border border-gray-100 px-4 py-3">
          <Search size={18} color="#9CA3AF" />
          <TextInput value={search} onChangeText={setSearch} placeholder="Search product" className="flex-1 ml-2 text-gray-900" />
        </View>
      </View>

      <FlatList
        data={products}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 140 }}
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator size="large" color="#004D2C" style={{ marginTop: 40 }} />
          ) : (
            <View className="items-center py-16">
              <ShoppingCart size={36} color="#D1D5DB" />
              <Text className="text-gray-400 text-xs mt-3 text-center">
                This distributor hasn't listed any products for wholesale yet.
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => {
          const qty = cart[item.id] || 0;
          const price = item.trade_price_kobo || item.selling_price_kobo;
          return (
            <View className="bg-white rounded-2xl border border-gray-100 p-3 mb-2 flex-row items-center">
              <View className="flex-1">
                <Text className="text-gray-900 font-bold text-sm" numberOfLines={1}>{item.name}</Text>
                <Text className="text-gray-400 text-xs">
                  ₦{(price / 100).toLocaleString()} / {item.unit_of_measure} · MOQ {item.trade_moq}
                </Text>
              </View>
              <View className="flex-row items-center bg-gray-50 rounded-xl">
                <TouchableOpacity onPress={() => bump(item.id, -item.trade_moq)} className="p-2.5" disabled={qty === 0}>
                  <Minus size={16} color={qty === 0 ? '#D1D5DB' : '#374151'} />
                </TouchableOpacity>
                <Text className="w-8 text-center font-bold text-gray-900">{qty}</Text>
                <TouchableOpacity onPress={() => bump(item.id, item.trade_moq)} className="p-2.5">
                  <Plus size={16} color="#374151" />
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />

      {cartLines.length > 0 && (
        <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-gray-400 text-[10px] font-bold uppercase">Order total</Text>
            <Text className={`font-black text-xl ${exceedsCredit ? 'text-rose-600' : 'text-gray-900'}`}>
              ₦{(totalKobo / 100).toLocaleString()}
            </Text>
          </View>
          {exceedsCredit && (
            <Text className="text-rose-600 text-[11px] mb-2">This exceeds your available trade credit.</Text>
          )}
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={createOrder.isPending || exceedsCredit}
            className="py-4 rounded-2xl items-center flex-row justify-center"
            style={{ backgroundColor: exceedsCredit ? '#D1D5DB' : '#004D2C' }}
          >
            {createOrder.isPending ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-bold text-lg">Place order</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

export default DistributorCatalogScreen;
