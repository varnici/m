import React, { useState } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity } from 'react-native';
import { Package } from 'lucide-react-native';
import { useProducts } from '@/hooks/useInventory';
import type { Product } from '@/types/inventory';

interface PackagingPickerProps {
  /** Product currently being created/edited — excluded from the base-product list, and used to hide products that already have their own pack/bag listings. */
  excludeProductId?: string;
  parentId: string | null;
  onChangeParentId: (id: string | null) => void;
  conversionFactor: string;
  onChangeConversionFactor: (v: string) => void;
}

/**
 * Lets a merchant sell a product as a pack/bag/carton of an existing
 * base-unit product. Setting parentId + conversionFactor here means every
 * purchase/sale recorded against this product auto-converts onto the base
 * product's real stock count (see backend StockService depletion/
 * replenishment handlers) — e.g. selling 1 "Bag of Rice" (conversion factor
 * 50) correctly deducts 50 from "Rice — Piece"'s stock, not 1.
 *
 * Only products with no parent of their own are offered as a base, since
 * the conversion logic only follows one hop of parent_id.
 */
export function PackagingPicker({
  excludeProductId,
  parentId,
  onChangeParentId,
  conversionFactor,
  onChangeConversionFactor,
}: PackagingPickerProps) {
  const { data: products = [] } = useProducts(0, 200);
  const [enabled, setEnabled] = useState(parentId !== null);

  const baseCandidates = products.filter(
    (p) => !p.parent_id && p.id !== excludeProductId
  );

  const handleToggle = () => {
    const next = !enabled;
    setEnabled(next);
    if (!next) {
      onChangeParentId(null);
      onChangeConversionFactor('1');
    }
  };

  const selectedParent = baseCandidates.find((p: Product) => p.id === parentId);

  return (
    <View>
      <TouchableOpacity
        onPress={handleToggle}
        className={`flex-row items-center p-3 rounded-2xl border mb-3 ${
          enabled ? 'border-ventureroot-green bg-emerald-50' : 'border-gray-100 bg-gray-50'
        }`}
      >
        <Package size={16} color={enabled ? '#16654A' : '#94A3B8'} />
        <Text className={`ml-2 flex-1 font-bold text-xs ${enabled ? 'text-ventureroot-green' : 'text-gray-600'}`}>
          This is a pack, bag or carton of another product
        </Text>
        <View
          className={`w-5 h-5 rounded-full border-2 items-center justify-center ${
            enabled ? 'border-ventureroot-green bg-ventureroot-green' : 'border-gray-300'
          }`}
        >
          {enabled && <View className="w-2 h-2 rounded-full bg-white" />}
        </View>
      </TouchableOpacity>

      {enabled && (
        <View className="gap-3">
          {baseCandidates.length === 0 ? (
            <Text className="text-gray-400 text-xs font-semibold">
              No base products yet — add the individual unit (e.g. "Piece") as its own product first, then come back here to link this pack to it.
            </Text>
          ) : (
            <View>
              <Text className="text-gray-400 text-[10px] font-bold uppercase mb-2 ml-1">Base product</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row gap-2">
                  {baseCandidates.map((p: Product) => {
                    const selected = p.id === parentId;
                    return (
                      <TouchableOpacity
                        key={p.id}
                        onPress={() => onChangeParentId(p.id)}
                        className={`px-4 py-2.5 rounded-xl border ${
                          selected ? 'border-ventureroot-green bg-emerald-50' : 'border-gray-100 bg-gray-50'
                        }`}
                      >
                        <Text className={`font-bold text-xs ${selected ? 'text-ventureroot-green' : 'text-gray-600'}`}>
                          {p.name} ({p.unit_of_measure})
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            </View>
          )}

          <View>
            <Text className="text-gray-400 text-[10px] font-bold uppercase mb-1 ml-1">
              Units per pack{selectedParent ? ` (1 = how many ${selectedParent.unit_of_measure}s)` : ''}
            </Text>
            <TextInput
              value={conversionFactor}
              onChangeText={onChangeConversionFactor}
              placeholder="e.g. 50"
              keyboardType="number-pad"
              className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-gray-900"
            />
          </View>
        </View>
      )}
    </View>
  );
}
