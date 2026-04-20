import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  FlatList,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Plus, Trash2, Search, Building2, Package, Save } from 'lucide-react-native';
import { colors } from '@/theme/colors';
import { useSuppliers, useProducts, useCreatePurchaseOrder } from '@/hooks/useInventory';
import Toast from 'react-native-toast-message';
import type { RootStackScreenProps } from '@/navigation/types';

interface OrderItem {
  product_id: string;
  name: string;
  quantity_ordered: number;
  unit_price_kobo: number;
}

const CreatePurchaseOrderScreen = ({ navigation }: RootStackScreenProps<'AddPurchaseOrder'>) => {
  const [supplierId, setSupplierId] = useState('');
  const [supplierName, setSupplierName] = useState('Select Supplier');
  const [items, setItems] = useState<OrderItem[]>([]);
  const [notes, setNotes] = useState('');
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);

  const { data: suppliers, isLoading: loadingSuppliers } = useSuppliers();
  const { data: products, isLoading: loadingProducts } = useProducts();
  const { mutate: createPO, isPending: isSaving } = useCreatePurchaseOrder();

  const totalAmount = useMemo(() => {
    return items.reduce((sum, item) => sum + (item.quantity_ordered * item.unit_price_kobo), 0);
  }, [items]);

  const handleAddItem = (product: any) => {
    const existingItem = items.find(i => i.product_id === product.id);
    if (existingItem) {
      Toast.show({ type: 'info', text1: 'Item already added' });
      return;
    }

    setItems([...items, {
      product_id: product.id,
      name: product.name,
      quantity_ordered: 1,
      unit_price_kobo: product.cost_price_kobo || 0,
    }]);
    setShowProductModal(false);
  };

  const updateItem = (productId: string, field: keyof OrderItem, value: any) => {
    setItems(items.map(item => 
      item.product_id === productId ? { ...item, [field]: value } : item
    ));
  };

  const removeItem = (productId: string) => {
    setItems(items.filter(item => item.product_id !== productId));
  };

  const handleSave = () => {
    if (!supplierId) {
      Toast.show({ type: 'error', text1: 'Supplier Required', text2: 'Please select a supplier' });
      return;
    }
    if (items.length === 0) {
      Toast.show({ type: 'error', text1: 'Items Required', text2: 'Add at least one item' });
      return;
    }

    createPO({
      supplier_id: supplierId,
      items: items.map(({ name, ...rest }) => rest),
      notes: notes.trim() || undefined,
    }, {
      onSuccess: () => {
        navigation.goBack();
      },
      onError: (err: any) => {
        Toast.show({
          type: 'error',
          text1: 'Failed to Create PO',
          text2: err.message,
        });
      }
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-background-page">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-4">
        <TouchableOpacity onPress={() => navigation.goBack()} className="p-2">
          <ChevronLeft color="white" size={24} />
        </TouchableOpacity>
        <Text className="text-white text-lg font-bold">New Purchase Order</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView className="flex-1 px-4 pt-4" showsVerticalScrollIndicator={false}>
        {/* Supplier Selection */}
        <TouchableOpacity 
          onPress={() => setShowSupplierModal(true)}
          className="bg-white p-6 rounded-3xl mb-6 border border-gray-100 shadow-sm"
        >
          <View className="flex-row items-center mb-1">
            <Building2 size={16} color="#4F46E5" />
            <Text className="text-gray-400 text-[10px] font-bold uppercase ml-2">Supplier</Text>
          </View>
          <Text className={`text-lg font-bold ${supplierId ? 'text-gray-900' : 'text-gray-300'}`}>
            {supplierName}
          </Text>
        </TouchableOpacity>

        {/* Items Section */}
        <View className="bg-white p-6 rounded-3xl mb-6 border border-gray-100 shadow-sm">
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center">
              <Package size={18} color="#10B981" />
              <Text className="text-gray-900 font-bold text-base ml-2">Order Items</Text>
            </View>
            <TouchableOpacity 
              onPress={() => setShowProductModal(true)}
              className="bg-indigo-50 px-3 py-2 rounded-xl flex-row items-center"
            >
              <Plus size={16} color="#4F46E5" />
              <Text className="text-indigo-600 font-bold text-xs ml-1">Add</Text>
            </TouchableOpacity>
          </View>

          {items.length === 0 ? (
            <View className="py-10 items-center">
              <Text className="text-gray-400 text-sm italic">No items added yet</Text>
            </View>
          ) : (
            <View className="gap-6">
              {items.map((item) => (
                <View key={item.product_id} className="border-b border-gray-50 pb-6">
                  <View className="flex-row justify-between items-start mb-3">
                    <Text className="text-gray-900 font-bold flex-1 mr-2">{item.name}</Text>
                    <TouchableOpacity onPress={() => removeItem(item.product_id)}>
                      <Trash2 size={18} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                  
                  <View className="flex-row gap-4">
                    <View className="flex-1">
                      <Text className="text-gray-400 text-[10px] font-bold uppercase mb-1">Qty</Text>
                      <TextInput
                        value={item.quantity_ordered.toString()}
                        onChangeText={(val) => updateItem(item.product_id, 'quantity_ordered', parseInt(val) || 0)}
                        keyboardType="number-pad"
                        className="bg-gray-50 p-3 rounded-xl border border-gray-100 text-gray-900 font-bold"
                      />
                    </View>
                    <View className="flex-[2]">
                      <Text className="text-gray-400 text-[10px] font-bold uppercase mb-1">Unit Price (₦)</Text>
                      <TextInput
                        value={(item.unit_price_kobo / 100).toString()}
                        onChangeText={(val) => updateItem(item.product_id, 'unit_price_kobo', Math.round(parseFloat(val) * 100) || 0)}
                        keyboardType="decimal-pad"
                        className="bg-gray-50 p-3 rounded-xl border border-gray-100 text-gray-900 font-bold"
                      />
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}

          {items.length > 0 && (
            <View className="mt-4 pt-4 border-t border-gray-100 flex-row justify-between items-center">
              <Text className="text-gray-500 font-medium">Grand Total</Text>
              <Text className="text-indigo-600 font-black text-xl">₦{(totalAmount / 100).toLocaleString()}</Text>
            </View>
          )}
        </View>

        {/* Notes */}
        <View className="bg-white p-6 rounded-3xl mb-10 border border-gray-100 shadow-sm">
          <Text className="text-gray-400 text-[10px] font-bold uppercase mb-2 ml-1">Optional Notes</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="e.g. Urgent delivery needed..."
            multiline
            numberOfLines={3}
            className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-gray-900"
          />
        </View>
        
        <View className="h-20" />
      </ScrollView>

      {/* Save Button */}
      <View className="p-4 bg-white border-t border-gray-100">
        <TouchableOpacity
          onPress={handleSave}
          disabled={isSaving}
          className={`py-4 rounded-2xl items-center flex-row justify-center ${
            isSaving ? 'bg-gray-300' : 'bg-slate-900'
          }`}
        >
          {isSaving ? (
             <ActivityIndicator color="white" className="mr-2" />
          ) : (
             <Save size={20} color="white" className="mr-2" />
          )}
          <Text className="text-white font-bold text-lg">Create Order</Text>
        </TouchableOpacity>
      </View>

      {/* Supplier Modal */}
      <Modal visible={showSupplierModal} animationType="slide" transparent>
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-[40px] h-[80%] p-6">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-xl font-black text-gray-900">Select Supplier</Text>
              <TouchableOpacity onPress={() => setShowSupplierModal(false)}>
                <Text className="text-indigo-600 font-bold">Cancel</Text>
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={suppliers}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  onPress={() => {
                    setSupplierId(item.id);
                    setSupplierName(item.name);
                    setShowSupplierModal(false);
                  }}
                  className="p-4 border-b border-gray-50"
                >
                  <Text className="text-gray-900 font-bold text-base">{item.name}</Text>
                  <Text className="text-gray-400 text-xs">{item.phone} • {item.city}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View className="py-20 items-center">
                  <Text className="text-gray-400">No suppliers found</Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>

      {/* Product Modal */}
      <Modal visible={showProductModal} animationType="slide" transparent>
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-[40px] h-[80%] p-6">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-xl font-black text-gray-900">Add Product</Text>
              <TouchableOpacity onPress={() => setShowProductModal(false)}>
                <Text className="text-indigo-600 font-bold">Cancel</Text>
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={products}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  onPress={() => handleAddItem(item)}
                  className="p-4 border-b border-gray-50 flex-row justify-between items-center"
                >
                  <View>
                    <Text className="text-gray-900 font-bold text-base">{item.name}</Text>
                    <Text className="text-gray-400 text-xs">SKU: {item.sku}</Text>
                  </View>
                  <Plus size={20} color="#4F46E5" />
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View className="py-20 items-center">
                  <Text className="text-gray-400">No products found</Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default CreatePurchaseOrderScreen;
