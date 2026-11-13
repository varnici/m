import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, Tag, ChevronDown, ChevronUp, Save } from 'lucide-react-native';
import AppHeader from '@/components/ui/AppHeader';
import { colors } from '@/theme/colors';
import { useProducts, useUpdateProduct } from '@/hooks/useInventory';
import type { Product } from '@/types/inventory';

const N = (kobo: number) => `₦${(kobo / 100).toLocaleString()}`;

function CatalogRow({ product }: { product: Product }) {
  const [expanded, setExpanded] = useState(false);
  const [tradePrice, setTradePrice] = useState(String((product.trade_price_kobo || 0) / 100));
  const [moq, setMoq] = useState(String(product.trade_moq || 1));
  const { mutate: updateProduct, isPending } = useUpdateProduct(product.id);

  const listed = !!product.is_wholesale_listed;

  const toggleListed = () => {
    if (!listed && (!product.trade_price_kobo || product.trade_price_kobo <= 0)) {
      setExpanded(true);
      return;
    }
    updateProduct({ is_wholesale_listed: !listed });
  };

  const handleSave = () => {
    const priceKobo = Math.round((parseFloat(tradePrice) || 0) * 100);
    const moqInt = Math.max(1, parseInt(moq, 10) || 1);
    updateProduct(
      { trade_price_kobo: priceKobo, trade_moq: moqInt, is_wholesale_listed: true },
      { onSuccess: () => setExpanded(false) }
    );
  };

  return (
    <View className="bg-white rounded-2xl border border-gray-100 mb-2 overflow-hidden">
      <TouchableOpacity className="flex-row items-center p-3" onPress={() => setExpanded((e) => !e)}>
        <View className="flex-1">
          <Text className="text-gray-900 font-bold text-sm" numberOfLines={1}>{product.name}</Text>
          <Text className="text-gray-400 text-[11px] mt-0.5">
            Retail {N(product.selling_price_kobo)}
            {listed ? ` · Wholesale ${N(product.trade_price_kobo || 0)} · MOQ ${product.trade_moq || 1}` : ' · Not wholesale-listed'}
          </Text>
        </View>
        <TouchableOpacity onPress={toggleListed} disabled={isPending} className="mr-2">
          <View className={"toggle" + (listed ? ' on' : '')} style={{
            width: 40, height: 24, borderRadius: 12,
            backgroundColor: listed ? colors.ventureroot.green : '#E5E7EB',
            padding: 2, justifyContent: 'center',
          }}>
            <View style={{
              width: 20, height: 20, borderRadius: 10, backgroundColor: 'white',
              transform: [{ translateX: listed ? 16 : 0 }],
            }} />
          </View>
        </TouchableOpacity>
        {expanded ? <ChevronUp size={16} color="#9CA3AF" /> : <ChevronDown size={16} color="#9CA3AF" />}
      </TouchableOpacity>

      {expanded && (
        <View className="px-3 pb-3 gap-3">
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Text className="text-gray-400 text-[10px] font-bold uppercase mb-1">Wholesale price (₦)</Text>
              <TextInput
                value={tradePrice}
                onChangeText={setTradePrice}
                keyboardType="decimal-pad"
                placeholder="0.00"
                className="bg-gray-50 p-3 rounded-xl border border-gray-100 text-gray-900"
              />
            </View>
            <View className="flex-1">
              <Text className="text-gray-400 text-[10px] font-bold uppercase mb-1">Minimum order qty</Text>
              <TextInput
                value={moq}
                onChangeText={setMoq}
                keyboardType="number-pad"
                placeholder="1"
                className="bg-gray-50 p-3 rounded-xl border border-gray-100 text-gray-900"
              />
            </View>
          </View>
          <Text className="text-gray-400 text-[11px]">
            A buyer must order at least {moq || 1} {product.unit_of_measure}{Number(moq) === 1 ? '' : 's'} to see this wholesale price. Below that, your published register price applies instead.
          </Text>
          <TouchableOpacity
            onPress={handleSave}
            disabled={isPending || !tradePrice}
            className="py-3 rounded-xl items-center flex-row justify-center"
            style={{ backgroundColor: isPending || !tradePrice ? '#D1D5DB' : colors.ventureroot.green }}
          >
            {isPending ? <ActivityIndicator size="small" color="white" /> : (
              <>
                <Save size={14} color="white" />
                <Text className="text-white font-bold text-xs ml-1.5">Save & list for wholesale</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const DistributorCatalogManageScreen = () => {
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'all' | 'listed'>('all');
  const { data: products = [], isLoading } = useProducts(0, 500, undefined, search);

  const rows = useMemo(
    () => (tab === 'listed' ? products.filter((p) => p.is_wholesale_listed) : products),
    [products, tab]
  );
  const listedCount = products.filter((p) => p.is_wholesale_listed).length;

  return (
    <SafeAreaView className="flex-1 bg-background-page" edges={['bottom', 'left', 'right']}>
      <AppHeader title="Catalogue & pricing" subtitle={`${listedCount} of ${products.length} wholesale-listed`} />

      <View className="px-4 pt-4">
        <View className="flex-row items-center bg-white rounded-2xl border border-gray-100 px-4 py-3 mb-3">
          <Search size={16} color="#9CA3AF" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search product or SKU"
            className="flex-1 ml-2 text-gray-900"
          />
        </View>
        <View className="flex-row bg-gray-100 rounded-xl p-1 mb-3">
          {[{ id: 'all', label: 'All products' }, { id: 'listed', label: 'Wholesale-listed' }].map((t) => (
            <TouchableOpacity
              key={t.id}
              onPress={() => setTab(t.id as 'all' | 'listed')}
              className={`flex-1 py-2 rounded-lg items-center ${tab === t.id ? 'bg-white' : ''}`}
            >
              <Text className={`text-[11px] font-bold ${tab === t.id ? 'text-gray-900' : 'text-gray-400'}`}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color={colors.ventureroot.green} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
          ListEmptyComponent={
            <View className="items-center justify-center py-20 px-8">
              <Tag size={40} color="#D1D5DB" />
              <Text className="text-gray-900 font-bold mt-3">
                {tab === 'listed' ? 'Nothing wholesale-listed yet' : 'No products match'}
              </Text>
              <Text className="text-gray-400 text-xs text-center mt-1">
                {tab === 'listed'
                  ? 'Flip the toggle on a product below to make it visible to other businesses ordering wholesale.'
                  : 'Try a different search, or add products from Inventory first.'}
              </Text>
            </View>
          }
          renderItem={({ item }) => <CatalogRow product={item} />}
        />
      )}
    </SafeAreaView>
  );
};

export default DistributorCatalogManageScreen;
