import React, { useState } from 'react';
import { View, Text, ScrollView, StatusBar, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft, Package, Plus, Minus, Search } from 'lucide-react-native';
import { colors } from '@/theme/colors';

const RecordSaleScreen = () => {
  const navigation = useNavigation<any>();
  const [product, setProduct] = useState('Indomie Noodles 70g');
  const [quantity, setQuantity] = useState(1);
  const [price, setPrice] = useState('150');

  const updateQty = (delta: number) => {
    setQuantity(prev => Math.max(1, prev + delta));
  };

  return (
    <SafeAreaView className="flex-1 bg-background-page">
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View className="bg-ventureroot-green pt-12 pb-6 px-4">
        <View className="flex-row items-center mb-4">
           <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3">
              <ChevronLeft color="white" size={24} />
           </TouchableOpacity>
           <Text className="text-white text-xl font-bold">Record Day Sale</Text>
        </View>
      </View>

      <ScrollView className="flex-1 p-4" showsVerticalScrollIndicator={false}>
        {/* Product Selection */}
        <View className="mb-6">
           <Text className="text-gray-500 text-xs font-bold uppercase mb-3 ml-1">Select Product</Text>
           <TouchableOpacity className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex-row items-center">
              <Package size={20} color="#9CA3AF" />
              <Text className="flex-1 ml-3 text-gray-900 font-medium">{product}</Text>
              <Search size={18} color="#9CA3AF" />
           </TouchableOpacity>
        </View>

        {/* Quantity & Unit Price Row */}
        <View className="flex-row gap-4 mb-8">
           <View className="flex-1">
              <Text className="text-gray-500 text-xs font-bold uppercase mb-3 ml-1">Quantity</Text>
              <View className="bg-white rounded-2xl p-3 border border-gray-100 shadow-sm flex-row items-center justify-between">
                 <TouchableOpacity onPress={() => updateQty(-1)} className="w-10 h-10 bg-gray-50 rounded-full items-center justify-center">
                    <Minus size={16} color="#4B5563" />
                 </TouchableOpacity>
                 <Text className="text-gray-900 font-bold text-lg">{quantity}</Text>
                 <TouchableOpacity onPress={() => updateQty(1)} className="w-10 h-10 bg-gray-50 rounded-full items-center justify-center">
                    <Plus size={16} color="#4B5563" />
                 </TouchableOpacity>
              </View>
           </View>
           <View className="flex-1">
              <Text className="text-gray-500 text-xs font-bold uppercase mb-3 ml-1">Unit Price (₦)</Text>
              <View className="bg-white rounded-2xl p-3 border border-gray-100 shadow-sm justify-center">
                 <TextInput 
                   className="text-gray-900 font-bold text-lg text-center h-10"
                   value={price}
                   onChangeText={setPrice}
                   keyboardType="numeric"
                 />
              </View>
           </View>
        </View>

        {/* Total Summary */}
        <View className="bg-slate-900 rounded-3xl p-8 items-center mb-10 shadow-xl">
           <Text className="text-white/60 text-xs font-medium uppercase tracking-widest mb-2">Total Sale Value</Text>
           <Text className="text-white text-4xl font-black">₦{(quantity * (parseFloat(price) || 0)).toLocaleString()}</Text>
           
           <View className="flex-row items-center mt-6 bg-white/10 px-4 py-2 rounded-full">
              <Text className="text-white/80 text-[10px] font-medium">Auto-calculating VAT (7.5%) ... </Text>
              <Text className="text-emerald-400 text-[10px] font-bold">₦{(quantity * (parseFloat(price) || 0) * 0.075).toLocaleString()}</Text>
           </View>
        </View>

        {/* Actions */}
        <TouchableOpacity 
          className="bg-ventureroot-green py-4 rounded-xl items-center shadow-lg mb-4"
          onPress={() => navigation.navigate('SalesDashboard')}
        >
           <Text className="text-white font-bold text-base">Confirm & Record Sale</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          className="py-2 items-center mb-10"
          onPress={() => navigation.goBack()}
        >
           <Text className="text-gray-400 font-bold text-sm">Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default RecordSaleScreen;
