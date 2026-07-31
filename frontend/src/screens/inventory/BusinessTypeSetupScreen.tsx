import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check, Volume2 } from 'lucide-react-native';
import type { RootStackScreenProps } from '@/navigation/types';
import AppHeader from '@/components/ui/AppHeader';
import { colors } from '@/theme/colors';
import { BUSINESS_TYPE_LIST } from '@/data/businessTypeTemplates';
import { useBusinessProfile, useSetBusinessType } from '@/hooks/useBusinessProfile';
import { useBulkCreateCategories } from '@/hooks/useCategories';
import type { BusinessType } from '@/types/inventory';

const BusinessTypeSetupScreen = ({ navigation }: RootStackScreenProps<'BusinessTypeSetup'>) => {
  const { store, businessType: currentBusinessType } = useBusinessProfile();
  const setBusinessType = useSetBusinessType();
  const bulkCreateCategories = useBulkCreateCategories();

  const [selected, setSelected] = useState<BusinessType | null>(currentBusinessType || null);
  const [savedType, setSavedType] = useState<BusinessType | null>(null);

  const handlePick = (id: BusinessType) => {
    setSelected(id);
    setBusinessType.mutate(
      { store, businessType: id },
      { onSuccess: () => setSavedType(id) }
    );
  };

  const template = savedType
    ? BUSINESS_TYPE_LIST.find((t) => t.id === savedType)
    : undefined;

  const handleLoadStarterCategories = () => {
    if (!template || template.starterCategories.length === 0) return;
    bulkCreateCategories.mutate(
      template.starterCategories.map((c) => ({ name: c.name, icon: c.icon, tint: c.tint })),
      { onSuccess: () => navigation.navigate('Categories') }
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background-page" edges={['bottom', 'left', 'right']}>
      <AppHeader title="What does your business sell?" variant="green" subtitle="Step 1 of 3" />

      <ScrollView className="flex-1 px-4 pt-4" showsVerticalScrollIndicator={false}>
        <Text className="text-gray-500 text-sm mb-4">
          Your answer sets up units and the record-keeping your trade requires. You can change it at any time.
        </Text>

        <View className="flex-row flex-wrap gap-3">
          {BUSINESS_TYPE_LIST.map((t) => {
            const isSelected = selected === t.id;
            const isSaving = setBusinessType.isPending && selected === t.id;
            return (
              <TouchableOpacity
                key={t.id}
                onPress={() => handlePick(t.id)}
                disabled={setBusinessType.isPending}
                className={`bg-white rounded-2xl p-4 items-center border ${
                  isSelected ? 'border-ventureroot-green' : 'border-gray-100'
                }`}
                style={{ width: '47%' }}
              >
                {isSaving ? (
                  <ActivityIndicator color={colors.ventureroot.green} />
                ) : (
                  <t.Icon size={26} color={isSelected ? colors.ventureroot.green : '#475569'} strokeWidth={1.6} />
                )}
                <Text className="text-gray-900 font-bold text-sm text-center mt-2">{t.label}</Text>
                <Text className="text-gray-400 text-[10px] text-center mt-1">
                  {t.starterCategories.length ? `${t.starterCategories.length} categories ready` : 'Start from blank'}
                </Text>
                {isSelected && (
                  <View className="absolute top-2 right-2 w-5 h-5 rounded-full bg-ventureroot-green items-center justify-center">
                    <Check size={12} color="white" strokeWidth={3} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {template && template.starterCategories.length > 0 && (
          <View className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 mt-5">
            <Text className="text-emerald-900 font-bold text-sm mb-1">
              Load starter categories for {template.label}?
            </Text>
            <Text className="text-emerald-800 text-xs mb-3">
              Adds {template.starterCategories.length} ready-made categories — you can rename, recolor, or delete any of them after.
            </Text>
            <TouchableOpacity
              onPress={handleLoadStarterCategories}
              disabled={bulkCreateCategories.isPending}
              className="bg-ventureroot-green py-3 rounded-xl items-center"
            >
              {bulkCreateCategories.isPending ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text className="text-white font-bold">Use these categories</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('Categories')} className="py-3 items-center">
              <Text className="text-emerald-800 font-bold text-xs">Skip — I'll set up my own</Text>
            </TouchableOpacity>
          </View>
        )}

        <View className="flex-row items-center bg-gray-50 rounded-xl p-3 mt-6 mb-10">
          <Volume2 size={16} color="#9CA3AF" />
          <Text className="text-gray-400 text-[11px] ml-2 flex-1">
            Press and hold any option to hear it read aloud in your language.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default BusinessTypeSetupScreen;
