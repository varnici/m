import React, { useState } from 'react';
import { View, Text, TextInput, ScrollView, StatusBar, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RootStackScreenProps } from '@/navigation/types';
import { ChevronLeft, Box, Tag, DollarSign, BarChart3, Save, Layers } from 'lucide-react-native';
import { colors } from '@/theme/colors';
import { useCreateProduct } from '@/hooks/useInventory';
import Toast from 'react-native-toast-message';
import { retailCategoriesData } from '@/data/retailCategories';

const AddProductScreen = ({ navigation }: RootStackScreenProps<'AddProduct'>) => {
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [description, setDescription] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [minStock, setMinStock] = useState('10');
  const [initialStock, setInitialStock] = useState('0');
  
  // Category Selections
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  
  const { mutate: createProduct, isPending } = useCreateProduct();

  const handleSave = () => {
    // Basic validation
    if (!name.trim() || !costPrice || !sellingPrice) {
      Toast.show({
        type: 'error',
        text1: 'Required Fields',
        text2: 'Please fill in name, SKU, and prices',
      });
      return;
    }

    // Clean data
    let formattedSku = sku.trim() 
      ? sku.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '-') 
      : `PRD-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      
    const costKobo = Math.round(parseFloat(costPrice) * 100);
    const sellingKobo = Math.round(parseFloat(sellingPrice) * 100);
    const minQty = parseInt(minStock) || 0;
    const initialQty = parseInt(initialStock) || 0;

    if (isNaN(costKobo) || isNaN(sellingKobo)) {
      Toast.show({
        type: 'error',
        text1: 'Invalid Price',
        text2: 'Please enter valid numbers for prices',
      });
      return;
    }

    createProduct({
      category_id: selectedSubCategory || selectedCategory,
      name: name.trim(),
      sku: formattedSku,
      description: description.trim(),
      cost_price_kobo: costKobo,
      selling_price_kobo: sellingKobo,
      minimum_stock_level: minQty,
      quantity_on_hand: initialQty,
    }, {
      onSuccess: () => {
        Toast.show({
          type: 'success',
          text1: 'Product Added',
          text2: `${name} has been added to catalog`,
        });
        navigation.goBack();
      },
      onError: (err: any) => {
        console.error('Create Product Error:', err);
        const errorMessage = err.response?.data?.detail || err.message || 'Failed to create product';
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: typeof errorMessage === 'string' ? errorMessage : 'Invalid data provided',
        });
      }
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-background-page">
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View className="bg-ventureroot-green flex-row items-center justify-between px-4 pt-4 pb-10 rounded-b-[40px]">
        <TouchableOpacity onPress={() => navigation.goBack()} className="p-2">
          <ChevronLeft color="white" size={24} />
        </TouchableOpacity>
        <Text className="text-white text-lg font-bold">Add New Product</Text>
        <TouchableOpacity onPress={handleSave} disabled={isPending} className="p-2">
          {isPending ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Save color="white" size={24} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Quick Setup / Categories Section */}
        <View className="bg-white mx-4 mb-6 p-6 rounded-3xl border border-gray-100 shadow-sm">
          <View className="flex-row items-center mb-4">
             <Layers size={18} color="#0EA5E9" />
             <Text className="text-gray-900 font-bold text-base ml-2">Quick Categorization</Text>
          </View>
          
          <Text className="text-gray-400 text-[10px] font-bold uppercase mb-2 ml-1">Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
            {retailCategoriesData.map(cat => (
              <TouchableOpacity
                key={cat.id}
                onPress={() => {
                  setSelectedCategory(cat.id);
                  setSelectedSubCategory(null);
                  setSelectedBrand(null);
                }}
                className={`mr-3 px-4 py-3 rounded-2xl flex-row items-center border ${selectedCategory === cat.id ? 'border-ventureroot-green bg-emerald-50' : 'border-gray-100 bg-gray-50'}`}
              >
                <Image source={cat.icon} style={{ width: 24, height: 24, marginRight: 8 }} resizeMode="contain" />
                <Text className={`font-bold ${selectedCategory === cat.id ? 'text-ventureroot-green' : 'text-gray-600'}`}>{cat.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {selectedCategory && (
            <>
              <Text className="text-gray-400 text-[10px] font-bold uppercase mb-2 ml-1">Subcategory</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
                {retailCategoriesData.find(c => c.id === selectedCategory)?.subcategories.map(sub => (
                  <TouchableOpacity
                    key={sub.id}
                    onPress={() => {
                      setSelectedSubCategory(sub.id);
                      setSelectedBrand(null);
                    }}
                    className={`mr-3 px-4 py-2 rounded-xl border ${selectedSubCategory === sub.id ? 'border-blue-500 bg-blue-50' : 'border-gray-100 bg-gray-50'}`}
                  >
                    <Text className={`font-bold ${selectedSubCategory === sub.id ? 'text-blue-700' : 'text-gray-600'}`}>{sub.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          )}


        </View>

        {/* Basic Info Section */}
        <View className="bg-white mx-4 mb-6 p-6 rounded-3xl border border-gray-100 shadow-sm">
          <View className="flex-row items-center mb-4">
             <Tag size={18} color="#4F46E5" />
             <Text className="text-gray-900 font-bold text-base ml-2">Basic Information</Text>
          </View>
          
          <View className="gap-4">
            <View>
              <Text className="text-gray-400 text-[10px] font-bold uppercase mb-1 ml-1">Product Name *</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="e.g. Premium Cocoa Powder"
                className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-gray-900"
              />
            </View>
            
            <View>
              <View className="flex-row justify-between items-center mb-1">
                <Text className="text-gray-400 text-[10px] font-bold uppercase ml-1">SKU / Barcode</Text>
                <TouchableOpacity 
                  onPress={() => setSku(`PRD-${Math.random().toString(36).substring(2, 8).toUpperCase()}`)}
                >
                  <Text className="text-indigo-600 text-[10px] font-bold uppercase">Auto Generate</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                value={sku}
                onChangeText={setSku}
                placeholder="Leave blank to auto-generate"
                className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-gray-900"
              />
            </View>

            <View>
              <Text className="text-gray-400 text-[10px] font-bold uppercase mb-1 ml-1">Description</Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Brief details about the product..."
                multiline
                numberOfLines={3}
                className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-gray-900"
              />
            </View>
          </View>
        </View>

        {/* Pricing Section */}
        <View className="bg-white mx-4 mb-6 p-6 rounded-3xl border border-gray-100 shadow-sm">
          <View className="flex-row items-center mb-4">
             <DollarSign size={18} color="#10B981" />
             <Text className="text-gray-900 font-bold text-base ml-2">Pricing (₦)</Text>
          </View>
          
          <View className="flex-row gap-4">
            <View className="flex-1">
              <Text className="text-gray-400 text-[10px] font-bold uppercase mb-1 ml-1">Cost Price</Text>
              <TextInput
                value={costPrice}
                onChangeText={setCostPrice}
                placeholder="0.00"
                keyboardType="decimal-pad"
                className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-gray-900"
              />
            </View>
            
            <View className="flex-1">
              <Text className="text-gray-400 text-[10px] font-bold uppercase mb-1 ml-1">Selling Price</Text>
              <TextInput
                value={sellingPrice}
                onChangeText={setSellingPrice}
                placeholder="0.00"
                keyboardType="decimal-pad"
                className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-gray-900 font-bold"
              />
            </View>
          </View>
        </View>

        {/* Inventory Section */}
        <View className="bg-white mx-4 mb-10 p-6 rounded-3xl border border-gray-100 shadow-sm">
          <View className="flex-row items-center mb-4">
             <BarChart3 size={18} color="#F59E0B" />
             <Text className="text-gray-900 font-bold text-base ml-2">Stock Settings</Text>
          </View>
          
          <View className="flex-row gap-4">
            <View className="flex-1">
              <Text className="text-gray-400 text-[10px] font-bold uppercase mb-1 ml-1">Initial Stock</Text>
              <TextInput
                value={initialStock}
                onChangeText={setInitialStock}
                placeholder="0"
                keyboardType="number-pad"
                className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-gray-900"
              />
            </View>
            
            <View className="flex-1">
              <Text className="text-gray-400 text-[10px] font-bold uppercase mb-1 ml-1">Min Alert Level</Text>
              <TextInput
                value={minStock}
                onChangeText={setMinStock}
                placeholder="10"
                keyboardType="number-pad"
                className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-gray-900"
              />
            </View>
          </View>
        </View>

        <View className="h-10" />
      </ScrollView>
      
      {/* Action Button */}
      <View className="p-4 bg-white border-t border-gray-100">
        <TouchableOpacity
          onPress={handleSave}
          disabled={isPending}
          className={`py-4 rounded-2xl items-center flex-row justify-center ${
            isPending ? 'bg-gray-300' : 'bg-slate-900'
          }`}
        >
          {isPending ? (
             <ActivityIndicator color="white" className="mr-2" />
          ) : (
             <Save size={20} color="white" className="mr-2" />
          )}
          <Text className="text-white font-bold text-lg">Save Product</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default AddProductScreen;
