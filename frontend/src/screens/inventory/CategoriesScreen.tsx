import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, Pencil, Trash2, Package, Layers, Store as StoreIcon } from 'lucide-react-native';
import type { RootStackScreenProps } from '@/navigation/types';
import AppHeader from '@/components/ui/AppHeader';
import { CategoryIconTintPicker } from '@/components/inventory/CategoryIconTintPicker';
import { getCategoryIconComponent, DEFAULT_CATEGORY_ICON, DEFAULT_CATEGORY_TINT } from '@/constants/categoryIcons';
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory } from '@/hooks/useCategories';
import type { Category } from '@/types/inventory';

function slugify(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

const CategoriesScreen = ({ navigation }: RootStackScreenProps<'Categories'>) => {
  const { data: categories = [], isLoading } = useCategories();
  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();
  const deleteMutation = useDeleteCategory();

  const [mode, setMode] = useState<'none' | 'new' | string>('none');
  const [name, setName] = useState('');
  const [icon, setIcon] = useState(DEFAULT_CATEGORY_ICON);
  const [tint, setTint] = useState(DEFAULT_CATEGORY_TINT);

  const startNew = () => {
    setMode('new');
    setName('');
    setIcon(DEFAULT_CATEGORY_ICON);
    setTint(DEFAULT_CATEGORY_TINT);
  };

  const startEdit = (cat: Category) => {
    setMode(cat.id);
    setName(cat.name);
    setIcon(cat.icon || DEFAULT_CATEGORY_ICON);
    setTint(cat.tint || DEFAULT_CATEGORY_TINT);
  };

  const cancel = () => setMode('none');

  const save = () => {
    if (!name.trim()) return;
    if (mode === 'new') {
      createMutation.mutate(
        { name: name.trim(), slug: slugify(name), icon, tint },
        { onSuccess: () => setMode('none') }
      );
    } else if (mode !== 'none') {
      updateMutation.mutate(
        { categoryId: mode, data: { name: name.trim(), icon, tint } },
        { onSuccess: () => setMode('none') }
      );
    }
  };

  const confirmDelete = (cat: Category) => {
    Alert.alert(
      'Delete category?',
      `Products in "${cat.name}" will become uncategorized, not deleted.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate(cat.id) },
      ]
    );
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <SafeAreaView className="flex-1 bg-background-page" edges={['bottom', 'left', 'right']}>
      <AppHeader
        title="Categories"
        rightAction={
          <View className="flex-row items-center gap-2">
            <TouchableOpacity
              onPress={() => navigation.navigate('BusinessTypeSetup')}
              className="p-2 rounded-xl bg-gray-100"
              accessibilityLabel="Business type"
            >
              <StoreIcon size={16} color="#475569" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={startNew}
              className="flex-row items-center bg-ventureroot-green px-3 py-2 rounded-xl"
            >
              <Plus size={16} color="white" />
              <Text className="text-white font-bold text-xs ml-1">New</Text>
            </TouchableOpacity>
          </View>
        }
      />

      <ScrollView className="flex-1 px-4 pt-4" showsVerticalScrollIndicator={false}>
        {isLoading && (
          <View className="py-10 items-center">
            <ActivityIndicator size="large" color="#004D2C" />
          </View>
        )}

        {mode === 'new' && (
          <View className="bg-white rounded-2xl p-4 mb-4 border border-gray-100">
            <Text className="text-gray-400 text-[10px] font-bold uppercase mb-2">New category</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. Beverages"
              className="bg-gray-50 p-3 rounded-xl border border-gray-100 text-gray-900 mb-3"
            />
            <CategoryIconTintPicker icon={icon} tint={tint} onChangeIcon={setIcon} onChangeTint={setTint} />
            <View className="flex-row gap-2 mt-3">
              <TouchableOpacity onPress={cancel} className="flex-1 py-3 rounded-xl items-center bg-gray-100">
                <Text className="font-bold text-gray-600">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={save}
                disabled={!name.trim() || isSaving}
                className={`flex-1 py-3 rounded-xl items-center ${!name.trim() || isSaving ? 'bg-gray-300' : 'bg-ventureroot-green'}`}
              >
                {isSaving ? <ActivityIndicator color="white" size="small" /> : <Text className="text-white font-bold">Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {!isLoading && categories.length === 0 && mode !== 'new' && (
          <View className="items-center py-16">
            <Package size={40} color="#9CA3AF" strokeWidth={1.3} />
            <Text className="text-gray-900 font-bold mt-3">No categories yet</Text>
            <Text className="text-gray-400 text-xs text-center mt-1 px-8">
              Create one category for each kind of thing you sell.
            </Text>
            <TouchableOpacity onPress={startNew} className="flex-row items-center bg-ventureroot-green px-5 py-3 rounded-xl mt-4">
              <Plus size={18} color="white" />
              <Text className="text-white font-bold ml-2">New category</Text>
            </TouchableOpacity>
          </View>
        )}

        {categories.map((cat) => {
          const Icon = getCategoryIconComponent(cat.icon);
          const catTint = cat.tint || DEFAULT_CATEGORY_TINT;
          const editing = mode === cat.id;
          return (
            <View key={cat.id} className="bg-white rounded-2xl mb-3 border border-gray-100 overflow-hidden">
              <View className="flex-row items-center p-4">
                <View
                  className="w-11 h-11 rounded-xl items-center justify-center mr-3"
                  style={{ backgroundColor: catTint + '1A' }}
                >
                  <Icon size={20} color={catTint} strokeWidth={1.8} />
                </View>
                <View className="flex-1">
                  <Text className="text-gray-900 font-bold">{cat.name}</Text>
                  <Text className="text-gray-400 text-xs">{cat.description || 'No description'}</Text>
                </View>
                <TouchableOpacity onPress={() => (editing ? cancel() : startEdit(cat))} className="p-2">
                  <Pencil size={17} color="#6B7280" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => confirmDelete(cat)} className="p-2">
                  <Trash2 size={17} color="#EF4444" />
                </TouchableOpacity>
              </View>

              {editing && (
                <View className="px-4 pb-4 border-t border-gray-50 pt-3">
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    className="bg-gray-50 p-3 rounded-xl border border-gray-100 text-gray-900 mb-3"
                  />
                  <CategoryIconTintPicker icon={icon} tint={tint} onChangeIcon={setIcon} onChangeTint={setTint} />
                  <View className="flex-row gap-2 mt-3">
                    <TouchableOpacity onPress={cancel} className="flex-1 py-3 rounded-xl items-center bg-gray-100">
                      <Text className="font-bold text-gray-600">Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={save}
                      disabled={!name.trim() || isSaving}
                      className={`flex-1 py-3 rounded-xl items-center ${!name.trim() || isSaving ? 'bg-gray-300' : 'bg-ventureroot-green'}`}
                    >
                      {isSaving ? <ActivityIndicator color="white" size="small" /> : <Text className="text-white font-bold">Save</Text>}
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          );
        })}

        {categories.length > 0 && (
          <View className="flex-row items-center bg-gray-50 rounded-xl p-3 mb-8 mt-1">
            <Layers size={14} color="#9CA3AF" />
            <Text className="text-gray-400 text-[11px] ml-2 flex-1">
              Categories group your products everywhere in the app — the register, alerts, and reports.
            </Text>
          </View>
        )}

        <View className="h-10" />
      </ScrollView>
    </SafeAreaView>
  );
};

export default CategoriesScreen;
