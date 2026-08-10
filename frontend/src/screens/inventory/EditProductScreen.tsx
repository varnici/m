import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, ScrollView, StatusBar, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RootStackScreenProps } from '@/navigation/types';
import { ChevronLeft, Tag, DollarSign, BarChart3, Save, Layers, Trash2 } from 'lucide-react-native';
import { useProductDetail, useUpdateProduct, useDeleteProduct } from '@/hooks/useInventory';
import Toast from 'react-native-toast-message';
import { CategoryPicker } from '@/components/inventory/CategoryPicker';
import { ProductComplianceFields } from '@/components/inventory/ProductComplianceFields';
import { PackagingPicker } from '@/components/inventory/PackagingPicker';

const EditProductScreen = ({ navigation, route }: RootStackScreenProps<'EditProduct'>) => {
  const { productId } = route.params;

  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [description, setDescription] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [minStock, setMinStock] = useState('10');

  // Category Selection
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Business-type-driven fields
  const [unit, setUnit] = useState('piece');
  const [expiryDate, setExpiryDate] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [size, setSize] = useState('');
  const [imei, setImei] = useState('');

  // Packaging (pack/bag/carton -> base product conversion)
  const [parentId, setParentId] = useState<string | null>(null);
  const [conversionFactor, setConversionFactor] = useState('1');

  const { data: product, isLoading: isLoadingProduct } = useProductDetail(productId);
  const { mutate: updateProduct, isPending } = useUpdateProduct(productId);

  // Initialize fields when product data arrives
  useEffect(() => {
    if (product) {
      setName(product.name);
      setSku(product.sku);
      setDescription(product.description || '');
      setCostPrice((product.cost_price_kobo / 100).toString());
      setSellingPrice((product.selling_price_kobo / 100).toString());
      setMinStock(product.minimum_stock_level.toString());
      setSelectedCategory(product.category_id || null);
      setUnit(product.unit_of_measure || 'piece');
      setExpiryDate(product.expiry_date || '');
      setBatchNumber(product.nafdac_number || '');
      setSize(product.size || '');
      setImei(product.imei || '');
      setParentId(product.parent_id || null);
      setConversionFactor(String(product.conversion_factor || 1));
    }
  }, [product]);

  const handleSave = () => {
    // Basic validation
    if (!name.trim() || !costPrice || !sellingPrice) {
      Toast.show({
        type: 'error',
        text1: 'Required Fields',
        text2: 'Please fill in name and prices',
      });
      return;
    }

    const costKobo = Math.round(parseFloat(costPrice) * 100);
    const sellingKobo = Math.round(parseFloat(sellingPrice) * 100);
    const minQty = parseInt(minStock) || 0;

    if (isNaN(costKobo) || isNaN(sellingKobo)) {
      Toast.show({
        type: 'error',
        text1: 'Invalid Price',
        text2: 'Please enter valid numbers for prices',
      });
      return;
    }

    updateProduct({
      category_id: selectedCategory || undefined,
      name: name.trim(),
      description: description.trim(),
      cost_price_kobo: costKobo,
      selling_price_kobo: sellingKobo,
      minimum_stock_level: minQty,
      unit_of_measure: unit,
      expiry_date: expiryDate.trim() || undefined,
      nafdac_number: batchNumber.trim() || undefined,
      size: size.trim() || undefined,
      imei: imei.trim() || undefined,
      parent_id: parentId,
      conversion_factor: parentId ? (parseInt(conversionFactor, 10) || 1) : 1,
    }, {
      onSuccess: () => {
        Toast.show({
          type: 'success',
          text1: 'Product Updated',
          text2: `${name} has been updated successfully`,
        });
        navigation.goBack();
      },
      onError: (err: any) => {
        console.error('Update Product Error:', err);
        const errorMessage = err.response?.data?.detail || err.message || 'Failed to update product';
        Toast.show({
          type: 'error',
          text1: 'Update Failed',
          text2: typeof errorMessage === 'string' ? errorMessage : 'Invalid data provided',
        });
      }
    });
  };
  
  const { mutate: deleteProduct, isPending: isDeleting } = useDeleteProduct();

  const handleDelete = () => {
    Alert.alert(
      'Delete Product',
      'Are you sure you want to permanently delete this product?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => {
            deleteProduct(productId, {
              onSuccess: () => {
                navigation.navigate('ProductList');
              }
            });
          }
        },
      ]
    );
  };

  if (isLoadingProduct) {
    return (
      <View className="flex-1 justify-center items-center bg-background-page">
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text className="mt-4 text-gray-500">Loading product details...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background-page">
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View className="bg-ventureroot-green flex-row items-center justify-between px-4 pt-4 pb-10 rounded-b-[40px]">
        <TouchableOpacity onPress={() => navigation.goBack()} className="p-2">
          <ChevronLeft color="white" size={24} />
        </TouchableOpacity>
        <Text className="text-white text-lg font-bold">Edit Product</Text>
        <TouchableOpacity onPress={handleSave} disabled={isPending} className="p-2">
          {isPending ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Save color="white" size={24} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Category Section */}
        <View className="bg-white mx-4 mt-6 mb-6 p-6 rounded-3xl border border-gray-100 shadow-sm">
          <View className="flex-row items-center mb-4">
             <Layers size={18} color="#0EA5E9" />
             <Text style={{color: '#111827', fontWeight: 'bold', fontSize: 16, marginLeft: 8}}>Category</Text>
          </View>
          
          <CategoryPicker selectedCategoryId={selectedCategory} onSelect={setSelectedCategory} />
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
              <Text className="text-gray-400 text-[10px] font-bold uppercase mb-1 ml-1">SKU (Read-only)</Text>
              <TextInput
                value={sku}
                editable={false}
                className="bg-gray-100 p-4 rounded-2xl border border-gray-200 text-gray-400"
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

        {/* Business-type-driven fields (unit + expiry/batch/size/IMEI) */}
        <View className="bg-white mx-4 mb-6 p-6 rounded-3xl border border-gray-100 shadow-sm">
          <View className="flex-row items-center mb-4">
             <Layers size={18} color="#0EA5E9" />
             <Text className="text-gray-900 font-bold text-base ml-2">Unit & compliance</Text>
          </View>
          <ProductComplianceFields
            unit={unit}
            onChangeUnit={setUnit}
            expiryDate={expiryDate}
            onChangeExpiryDate={setExpiryDate}
            batchNumber={batchNumber}
            onChangeBatchNumber={setBatchNumber}
            size={size}
            onChangeSize={setSize}
            imei={imei}
            onChangeImei={setImei}
          />
        </View>

        {/* Packaging Section */}
        <View className="bg-white mx-4 mb-6 p-6 rounded-3xl border border-gray-100 shadow-sm">
          <View className="flex-row items-center mb-4">
             <Layers size={18} color="#0EA5E9" />
             <Text className="text-gray-900 font-bold text-base ml-2">Packaging</Text>
          </View>
          <PackagingPicker
            excludeProductId={productId}
            parentId={parentId}
            onChangeParentId={setParentId}
            conversionFactor={conversionFactor}
            onChangeConversionFactor={setConversionFactor}
          />
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
          
          <View>
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

        <View className="h-10" />
      </ScrollView>
      
      {/* Action Button */}
      <View className="p-4 bg-white border-t border-gray-100 flex-row">
        <TouchableOpacity
          onPress={handleSave}
          disabled={isPending || isDeleting}
          className={`py-4 rounded-2xl items-center flex-row justify-center flex-1 ${
            isPending ? 'bg-gray-300' : 'bg-slate-900'
          }`}
        >
          {isPending ? (
             <ActivityIndicator color="white" className="mr-2" />
          ) : (
             <Save size={20} color="white" className="mr-2" />
          )}
          <Text className="text-white font-bold text-lg">Update</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleDelete}
          disabled={isPending || isDeleting}
          className={`ml-3 py-4 px-6 rounded-2xl items-center justify-center border border-red-100 bg-red-50`}
        >
          {isDeleting ? (
            <ActivityIndicator color="#EF4444" />
          ) : (
            <Trash2 size={20} color="#EF4444" />
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default EditProductScreen;
