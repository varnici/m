import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RootStackScreenProps } from '@/navigation/types';
import { ChevronLeft, Printer, Share2, CheckCircle2 } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { salesService } from '@/services/salesService';
import { format } from 'date-fns';
import ViewShot from 'react-native-view-shot';

const ReceiptScreen = ({ navigation, route }: RootStackScreenProps<'Receipt'>) => {
  const { saleId } = route.params;
  const receiptRef = useRef<ViewShot>(null);

  const { data: sale, isLoading, isError } = useQuery({
    queryKey: ['sale', saleId],
    queryFn: () => salesService.getSale(saleId),
  });

  const handleShare = async () => {
    try {
      if (receiptRef.current && receiptRef.current.capture) {
        const uri = await receiptRef.current.capture();
        await Share.share({
          url: uri,
          title: `Receipt #${sale?.receipt_number || saleId.substring(0, 8)}`,
          message: `Receipt from VentureRoot for your recent purchase.`,
        });
      }
    } catch (error) {
      console.error("Error sharing receipt:", error);
    }
  };

  const handlePrint = () => {
    // In a real app, this would integrate with a Bluetooth thermal printer library
    // For now, we simulate the action or just call the share API
    handleShare();
  };

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-100">
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text className="mt-4 text-gray-500 font-medium">Generating Receipt...</Text>
      </View>
    );
  }

  if (isError || !sale) {
    return (
      <SafeAreaView className="flex-1 bg-gray-100 justify-center items-center p-6">
        <Text className="text-red-500 font-bold text-lg text-center">Failed to load receipt details.</Text>
        <TouchableOpacity 
          className="mt-6 bg-indigo-600 px-6 py-3 rounded-xl"
          onPress={() => navigation.goBack()}
        >
          <Text className="text-white font-bold">Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const subtotal = sale.total_amount_kobo;
  const discount = sale.discount_amount_kobo || 0;
  const total = subtotal - discount;

  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 pt-2 pb-4">
        <TouchableOpacity onPress={() => navigation.navigate('SalesDashboard')} className="p-2 bg-white rounded-full shadow-sm">
          <ChevronLeft color="#111827" size={24} />
        </TouchableOpacity>
        <Text className="text-gray-900 text-lg font-black tracking-tight">Receipt</Text>
        <View className="w-10" />
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        
        {/* Success Indicator (Outside Receipt) */}
        <View className="items-center mb-6">
          <View className="bg-emerald-100 p-4 rounded-full mb-3">
            <CheckCircle2 size={32} color="#10B981" />
          </View>
          <Text className="text-gray-900 text-xl font-black">Transaction Complete</Text>
        </View>

        {/* Receipt Container - Looks like thermal paper */}
        <ViewShot ref={receiptRef} options={{ format: 'jpg', quality: 0.9 }}>
          <View className="bg-white px-6 py-8 shadow-sm" style={styles.receiptPaper}>
            
            {/* Receipt Header */}
            <View className="items-center mb-6 border-b border-dashed border-gray-300 pb-6">
              <Text className="text-gray-900 text-2xl font-black uppercase tracking-widest mb-1">VentureRoot</Text>
              <Text className="text-gray-500 text-xs text-center">123 Market Street, Business District</Text>
              <Text className="text-gray-500 text-xs text-center mb-4">Tel: +234 800 000 0000</Text>
              
              <View className="bg-gray-100 px-3 py-1 rounded">
                <Text className="text-gray-900 font-bold tracking-widest">
                  #{sale.receipt_number || saleId.substring(0, 8).toUpperCase()}
                </Text>
              </View>
            </View>

            {/* Meta Info */}
            <View className="mb-6 border-b border-dashed border-gray-300 pb-6">
              <View className="flex-row justify-between mb-1">
                <Text className="text-gray-500 text-xs">Date:</Text>
                <Text className="text-gray-900 text-xs font-medium">
                  {format(new Date(sale.transaction_date || new Date()), 'MMM dd, yyyy HH:mm')}
                </Text>
              </View>
              <View className="flex-row justify-between mb-1">
                <Text className="text-gray-500 text-xs">Cashier:</Text>
                <Text className="text-gray-900 text-xs font-medium">Retail Terminal</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-gray-500 text-xs">Customer:</Text>
                <Text className="text-gray-900 text-xs font-medium">{sale.customer_name || 'Guest'}</Text>
              </View>
            </View>

            {/* Items */}
            <View className="mb-6">
              <View className="flex-row border-b border-gray-200 pb-2 mb-3">
                <Text className="flex-[2] text-gray-500 text-xs font-bold uppercase">Item</Text>
                <Text className="flex-1 text-gray-500 text-xs font-bold uppercase text-center">Qty</Text>
                <Text className="flex-1 text-gray-500 text-xs font-bold uppercase text-right">Price</Text>
              </View>
              
              {sale.items?.map((item: any, index: number) => (
                <View key={index} className="flex-row mb-3">
                  <View className="flex-[2] pr-2">
                    <Text className="text-gray-900 text-sm font-medium">{item.product_name || `Item ${item.product_id.substring(0,6)}`}</Text>
                  </View>
                  <Text className="flex-1 text-gray-900 text-sm text-center">{item.quantity_sold}</Text>
                  <Text className="flex-1 text-gray-900 text-sm text-right">₦{((item.unit_price_kobo * item.quantity_sold) / 100).toLocaleString()}</Text>
                </View>
              ))}
            </View>

            {/* Totals */}
            <View className="border-t border-dashed border-gray-300 pt-4 mb-8">
              <View className="flex-row justify-between mb-2">
                <Text className="text-gray-500 text-sm">Subtotal</Text>
                <Text className="text-gray-900 text-sm">₦{(subtotal / 100).toLocaleString()}</Text>
              </View>
              {discount > 0 && (
                <View className="flex-row justify-between mb-2">
                  <Text className="text-gray-500 text-sm">Discount</Text>
                  <Text className="text-red-500 text-sm">-₦{(discount / 100).toLocaleString()}</Text>
                </View>
              )}
              <View className="flex-row justify-between mt-2 pt-2 border-t border-gray-200">
                <Text className="text-gray-900 text-xl font-black uppercase">Total</Text>
                <Text className="text-gray-900 text-xl font-black">₦{(total / 100).toLocaleString()}</Text>
              </View>
              
              <View className="flex-row justify-between mt-4">
                <Text className="text-gray-500 text-xs">Paid via {sale.payment_method?.toUpperCase() || 'CASH'}</Text>
              </View>
            </View>

            {/* Footer */}
            <View className="items-center">
              <Text className="text-gray-900 text-sm font-bold mb-1">Thank you for your business!</Text>
              <Text className="text-gray-400 text-xs text-center">Returns accepted within 7 days with receipt.</Text>
            </View>
            
          </View>
        </ViewShot>

      </ScrollView>

      {/* Floating Action Buttons */}
      <View className="absolute bottom-0 left-0 right-0 p-6 bg-white border-t border-gray-100 flex-row gap-4">
        <TouchableOpacity 
          onPress={handleShare}
          className="flex-1 bg-gray-100 py-4 rounded-2xl flex-row justify-center items-center"
        >
          <Share2 color="#4B5563" size={20} className="mr-2" />
          <Text className="text-gray-700 font-bold text-base">Share</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          onPress={handlePrint}
          className="flex-[2] bg-indigo-600 py-4 rounded-2xl flex-row justify-center items-center shadow-md shadow-indigo-200"
        >
          <Printer color="white" size={20} className="mr-2" />
          <Text className="text-white font-bold text-base">Print Receipt</Text>
        </TouchableOpacity>
      </View>
      
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  receiptPaper: {
    // Thermal paper look
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  }
});

export default ReceiptScreen;
