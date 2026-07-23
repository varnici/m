import React, { useState } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { inventoryService } from '@/services/inventoryService';

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
 * Live category chip picker, backed by GET/POST /v1/inventory/categories —
 * replaces the hardcoded retailCategoriesData list previously used in
 * AddProductScreen/EditProductScreen. Includes an inline "+ New Category"
 * quick-create so a business can build up its own category list as it goes.
 */
export function CategoryPicker({ selectedCategoryId, onSelect }: CategoryPickerProps) {
  const queryClient = useQueryClient();
  const [showNewForm, setShowNewForm] = useState(false);
  const [newName, setNewName] = useState('');

  const { data: categories = [], refetch } = useQuery({
    queryKey: ['categories'],
    queryFn: () => inventoryService.getCategories(),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      inventoryService.createCategory({
        name: newName.trim(),
        slug: slugify(newName),
      }),
    onSuccess: async (category) => {
      setNewName('');
      setShowNewForm(false);
      await refetch();
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      onSelect(category.id);
      Toast.show({ type: 'success', text1: 'Category added' });
    },
    onError: (error: Error) => {
      Toast.show({ type: 'error', text1: 'Could not add category', text2: error.message });
    },
  });

  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2">
        <View className="flex-row">
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              onPress={() => onSelect(cat.id)}
              className={`mr-3 px-4 py-3 rounded-2xl border ${
                selectedCategoryId === cat.id
                  ? 'border-ventureroot-green bg-emerald-50'
                  : 'border-gray-100 bg-gray-50'
              }`}
            >
              <Text
                className={`font-bold ${
                  selectedCategoryId === cat.id ? 'text-ventureroot-green' : 'text-gray-600'
                }`}
              >
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
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
        <View className="flex-row items-center gap-2 mb-2">
          <TextInput
            value={newName}
            onChangeText={setNewName}
            placeholder="Category name"
            className="flex-1 bg-gray-50 p-3 rounded-xl border border-gray-100 text-gray-900"
          />
          <TouchableOpacity
            onPress={() => createMutation.mutate()}
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
      ) : categories.length === 0 ? (
        <Text className="text-gray-400 text-xs font-semibold mb-2">
          No categories yet — tap "+ New Category" to add one.
        </Text>
      ) : null}
    </View>
  );
}
