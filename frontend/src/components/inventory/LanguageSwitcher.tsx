import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useLanguageStore } from '@/store/languageStore';
import { STRINGS, LANGUAGE_LIST } from '@/i18n/strings';

interface LanguageSwitcherProps {
  compact?: boolean;
}

export function LanguageSwitcher({ compact }: LanguageSwitcherProps) {
  const language = useLanguageStore((s) => s.language);
  const setLanguage = useLanguageStore((s) => s.setLanguage);

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View className="flex-row gap-2">
        {LANGUAGE_LIST.map((code) => {
          const selected = language === code;
          return (
            <TouchableOpacity
              key={code}
              onPress={() => setLanguage(code)}
              className={`rounded-full border ${compact ? 'px-3 py-1.5' : 'px-4 py-2'} ${
                selected ? 'bg-ventureroot-green border-ventureroot-green' : 'bg-white border-gray-200'
              }`}
            >
              <Text className={`font-bold ${compact ? 'text-[10px]' : 'text-xs'} ${selected ? 'text-white' : 'text-gray-600'}`}>
                {STRINGS[code].name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}
