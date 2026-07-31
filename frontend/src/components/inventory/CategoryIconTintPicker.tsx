import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { CATEGORY_ICON_CHOICES, CATEGORY_ICON_MAP, CATEGORY_TINTS } from '@/constants/categoryIcons';

interface CategoryIconTintPickerProps {
  icon: string;
  tint: string;
  onChangeIcon: (icon: string) => void;
  onChangeTint: (tint: string) => void;
}

export function CategoryIconTintPicker({ icon, tint, onChangeIcon, onChangeTint }: CategoryIconTintPickerProps) {
  return (
    <View>
      <Text className="text-gray-400 text-[10px] font-bold uppercase mb-2">Symbol</Text>
      <View className="flex-row flex-wrap gap-2 mb-4">
        {CATEGORY_ICON_CHOICES.map((key) => {
          const Icon = CATEGORY_ICON_MAP[key];
          const selected = icon === key;
          return (
            <TouchableOpacity
              key={key}
              onPress={() => onChangeIcon(key)}
              className={`w-11 h-11 rounded-xl items-center justify-center border ${
                selected ? 'border-ventureroot-green bg-emerald-50' : 'border-gray-100 bg-gray-50'
              }`}
            >
              <Icon size={19} color={selected ? tint : '#6B7280'} strokeWidth={1.8} />
            </TouchableOpacity>
          );
        })}
      </View>

      <Text className="text-gray-400 text-[10px] font-bold uppercase mb-2">Colour</Text>
      <View className="flex-row flex-wrap gap-3 mb-2">
        {CATEGORY_TINTS.map((c) => {
          const selected = tint === c;
          return (
            <TouchableOpacity
              key={c}
              onPress={() => onChangeTint(c)}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: c,
                borderWidth: selected ? 3 : 0,
                borderColor: '#FFFFFF',
                shadowColor: selected ? c : 'transparent',
                shadowOpacity: selected ? 0.5 : 0,
                shadowRadius: 4,
                elevation: selected ? 3 : 0,
              }}
            />
          );
        })}
      </View>
    </View>
  );
}
