import React from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { useBusinessProfile } from '@/hooks/useBusinessProfile';

interface ProductComplianceFieldsProps {
  unit: string;
  onChangeUnit: (u: string) => void;
  expiryDate: string;
  onChangeExpiryDate: (v: string) => void;
  batchNumber: string;
  onChangeBatchNumber: (v: string) => void;
  size: string;
  onChangeSize: (v: string) => void;
  imei: string;
  onChangeImei: (v: string) => void;
}

/**
 * Unit-of-measure picker + the optional fields relevant to the business's
 * type (expiry date for pharmacy/perishables, batch/NAFDAC for pharmacy,
 * size for apparel/footwear, IMEI for phones) — driven by
 * useBusinessProfile()'s template, so a provision store never sees a batch
 * number field and a boutique never sees IMEI.
 */
export function ProductComplianceFields({
  unit, onChangeUnit,
  expiryDate, onChangeExpiryDate,
  batchNumber, onChangeBatchNumber,
  size, onChangeSize,
  imei, onChangeImei,
}: ProductComplianceFieldsProps) {
  const { template } = useBusinessProfile();

  return (
    <View className="gap-4">
      <View>
        <Text className="text-gray-400 text-[10px] font-bold uppercase mb-2 ml-1">Unit of sale</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row gap-2">
            {template.units.map((u) => {
              const selected = unit.toLowerCase() === u.toLowerCase();
              return (
                <TouchableOpacity
                  key={u}
                  onPress={() => onChangeUnit(u.toLowerCase())}
                  className={`px-4 py-2.5 rounded-xl border ${
                    selected ? 'border-ventureroot-green bg-emerald-50' : 'border-gray-100 bg-gray-50'
                  }`}
                >
                  <Text className={`font-bold text-xs ${selected ? 'text-ventureroot-green' : 'text-gray-600'}`}>
                    {u}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {template.fields.expiry && (
        <View>
          <Text className="text-gray-400 text-[10px] font-bold uppercase mb-1 ml-1">Expiry date</Text>
          <TextInput
            value={expiryDate}
            onChangeText={onChangeExpiryDate}
            placeholder="YYYY-MM-DD"
            className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-gray-900"
          />
        </View>
      )}

      {template.fields.batch && (
        <View>
          <Text className="text-gray-400 text-[10px] font-bold uppercase mb-1 ml-1">Batch / NAFDAC number</Text>
          <TextInput
            value={batchNumber}
            onChangeText={onChangeBatchNumber}
            placeholder="e.g. A4-1234"
            className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-gray-900"
          />
        </View>
      )}

      {template.fields.size && (
        <View>
          <Text className="text-gray-400 text-[10px] font-bold uppercase mb-1 ml-1">Size</Text>
          <TextInput
            value={size}
            onChangeText={onChangeSize}
            placeholder="e.g. L, 43, Std"
            className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-gray-900"
          />
        </View>
      )}

      {template.fields.imei && (
        <View>
          <Text className="text-gray-400 text-[10px] font-bold uppercase mb-1 ml-1">IMEI</Text>
          <TextInput
            value={imei}
            onChangeText={onChangeImei}
            placeholder="15-digit device IMEI"
            keyboardType="number-pad"
            className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-gray-900"
          />
        </View>
      )}
    </View>
  );
}
