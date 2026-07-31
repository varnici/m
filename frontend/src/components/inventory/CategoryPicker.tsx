import React, { useState } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useCategories, useCreateCategory } from '@/hooks/useCategories';
import { CategoryIconTintPicker } from './CategoryIconTintPicker';
import { getCategoryIconComponent, DEFAULT_CATEGORY_ICON, DEFAULT_CATEGORY_TINT } from '@/constants/categoryIcons';

interface CategoryPickerProps {
  selectedCategoryId: string | null;
  onSelect: (categoryId: string) => void;
}

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/**
 * Live category chip picker, backed by GET/POST /v1/inventory/categories.
 * Includes an inline "+ New Category" quick-create with icon + colour
 * selection so a business can build up its own visually-consistent category
 * list as it goes — the same icon/tint then renders everywhere else
 * (product list, product detail, register) via useCategories().
 */
export function CategoryPicker({ selectedCategoryId, onSelect }: CategoryPickerProps) {
  const { data: categories = [] } = useCategories();
  const [showNewForm, setShowNewForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState(DEFAULT_CATEGORY_ICON);
  const [newTint, setNewTint] = useState(DEFAULT_CATEGORY_TINT);

  const createMutation = useCreateCategory();

  const handleCreate = () => {
    createMutation.mutate(
      { name: newName.trim(), slug: slugify(newName), icon: newIcon, tint: newTint },
      {
        onSuccess: (category) => {
          setNewName('');
          setNewIcon(DEFAULT_CATEGORY_ICON);
          setNewTint(DEFAULT_CATEGORY_TINT);
          setShowNewForm(false);
          onSelect(category.id);
        },
      }
    );
  };

  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2">
        <View className="flex-row">
          {categories.map((cat) => {
            const Icon = getCategoryIconComponent(cat.icon);
            const tint = cat.tint || DEFAULT_CATEGORY_TINT;
            const selected = selectedCategoryId === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                onPress={() => onSelect(cat.id)}
                className={`mr-3 px-4 py-3 rounded-2xl border flex-row items-center ${
                  selected ? 'border-ventureroot-green bg-emerald-50' : 'border-gray-100 bg-gray-50'
                }`}
              >
                <View
                  className="w-6 h-6 rounded-lg items-center justify-center mr-2"
                  style={{ backgroundColor: tint + '1A' }}
                >
                  <Icon size={13} color={tint} strokeWidth={2} />
                </View>
                <Text
                  className={`font-bold ${selected ? 'text-ventureroot-green' : 'text-gray-600'}`}
                >
                  {cat.name}
                </Text>
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity
            onPress={() => setShowNewForm((prev) => !prev)}
            className={`px-4 py-3 rounded-2xl border ${
              showNewForm ? 'border-ventureroot-green bg-emerald-50' : 'border-gray-100 bg-gray-50'
            }`}
          >
            <Text
              className={`font-bold ${showNewForm ? 'text-ventureroot-green' : 'text-gray-600'}`}
            >
              + New Category
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {showNewForm ? (
        <View className="bg-gray-50 rounded-2xl p-3 mb-2 border border-gray-100">
          <View className="flex-row items-center gap-2 mb-3">
            <TextInput
              value={newName}
              onChangeText={setNewName}
              placeholder="Category name"
              className="flex-1 bg-white p-3 rounded-xl border border-gray-100 text-gray-900"
            />
            <TouchableOpacity
              onPress={handleCreate}
              disabled={!newName.trim() || createMutation.isPending}
              className={`px-4 py-3 rounded-xl ${
                !newName.trim() || createMutation.isPending ? 'bg-gray-300' : 'bg-ventureroot-green'
              }`}
            >
              {createMutation.isPending ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text className="text-white font-bold">Add</Text>
              )}
            </TouchableOpacity>
          </View>
          <CategoryIconTintPicker
            icon={newIcon}
            tint={newTint}
            onChangeIcon={setNewIcon}
            onChangeTint={setNewTint}
          />
        </View>
      ) : categories.length === 0 ? (
        <Text className="text-gray-400 text-xs font-semibold mb-2">
          No categories yet — tap "+ New Category" to add one.
        </Text>
      ) : null}
    </View>
  );
}
