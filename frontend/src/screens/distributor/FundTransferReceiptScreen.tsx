import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RootStackScreenProps } from '@/navigation/types';
import { ChevronLeft, Share2, CheckCircle2, Landmark } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import ViewShot from 'react-native-view-shot';
import { inventoryService } from '@/services/inventoryService';

const FundTransferReceiptScreen = ({ navigation, route }: RootStackScreenProps<'FundTransferReceipt'>) => {
  const { orderId } = route.params;
  const receiptRef = useRef<ViewShot>(null);

  const { data: order, isLoading, isError } = useQuery({
    queryKey: ['trade-order', orderId],
    queryFn: () => inventoryService.getTradeOrder(orderId),
  });

  const handleShare = async () => {
    try {
      if (receiptRef.current && receiptRef.current.capture) {
        const uri = await receiptRef.current.capture();
        await Share.share({ url: uri, title: `Fund transfer receipt`, message: 'Fund transfer receipt from VentureRoot.' });
      }
    } catch (error) {
      console.error('Error sharing receipt:', error);
    }
  };

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-100">
        <ActivityIndicator size="large" color="#004D2C" />
        <Text className="mt-4 text-gray-500 font-medium">Loading receipt...</Text>
      </View>
    );
  }

  if (isError || !order) {
    return (
      <SafeAreaView className="flex-1 bg-gray-100 justify-center items-center p-6">
        <Text className="text-red-500 font-bold text-lg text-center">Failed to load receipt.</Text>
        <TouchableOpacity className="mt-6 bg-emerald-700 px-6 py-3 rounded-xl" onPress={() => navigation.goBack()}>
          <Text className="text-white font-bold">Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      <View className="flex-row items-center justify-between px-4 pt-2 pb-4">
        <TouchableOpacity onPress={() => navigation.goBack()} className="p-2 bg-white rounded-full shadow-sm">
          <ChevronLeft color="#111827" size={24} />
        </TouchableOpacity>
        <Text className="text-gray-900 text-lg font-black tracking-tight">Fund Transfer Receipt</Text>
        <View className="w-10" />
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        <View className="items-center mb-6">
          <View className="bg-emerald-100 p-4 rounded-full mb-3">
            <CheckCircle2 size={32} color="#10B981" />
          </View>
          <Text className="text-gray-900 text-xl font-black">Funds Received</Text>
        </View>

        <ViewShot ref={receiptRef} options={{ format: 'jpg', quality: 0.9 }}>
          <View className="bg-white px-6 py-8 shadow-sm" style={styles.receiptPaper}>
            <View className="items-center mb-6 border-b border-dashed border-gray-300 pb-6">
              <Text className="text-gray-900 text-2xl font-black uppercase tracking-widest mb-1">VentureRoot</Text>
              <Text className="text-gray-500 text-xs text-center mb-4">Investor-Funded Order Settlement</Text>
              <View className="bg-gray-100 px-3 py-1 rounded">
                <Text className="text-gray-900 font-bold tracking-widest">#{orderId.substring(0, 8).toUpperCase()}</Text>
              </View>
            </View>

            <View className="mb-6 border-b border-dashed border-gray-300 pb-6">
              <View className="flex-row justify-between mb-1">
                <Text className="text-gray-500 text-xs">Date:</Text>
                <Text className="text-gray-900 text-xs font-medium">
                  {format(new Date(order.created_at), 'MMM dd, yyyy HH:mm')}
                </Text>
              </View>
              <View className="flex-row justify-between mb-1">
                <Text className="text-gray-500 text-xs">Order status:</Text>
                <Text className="text-gray-900 text-xs font-medium capitalize">{order.status}</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-gray-500 text-xs">Settlement type:</Text>
                <Text className="text-gray-900 text-xs font-medium">Pooled Investor Funding</Text>
              </View>
            </View>

            <View className="mb-6">
              <View className="flex-row border-b border-gray-200 pb-2 mb-3">
                <Text className="flex-[2] text-gray-500 text-xs font-bold uppercase">Item</Text>
                <Text className="flex-1 text-gray-500 text-xs font-bold uppercase text-center">Qty</Text>
                <Text className="flex-1 text-gray-500 text-xs font-bold uppercase text-right">Amount</Text>
              </View>
              {order.lines?.map((line: any, index: number) => (
                <View key={line.id || index} className="flex-row mb-3">
                  <Text className="flex-[2] text-gray-900 text-sm font-medium pr-2">Product {line.product_id.substring(0, 8)}</Text>
                  <Text className="flex-1 text-gray-900 text-sm text-center">{line.quantity}</Text>
                  <Text className="flex-1 text-gray-900 text-sm text-right">
                    ₦{((line.unit_price_kobo * line.quantity) / 100).toLocaleString()}
                  </Text>
                </View>
              ))}
            </View>

            <View className="border-t border-dashed border-gray-300 pt-4 mb-4">
              <View className="flex-row justify-between mt-2 pt-2 border-t border-gray-200">
                <Text className="text-gray-900 text-xl font-black uppercase">Total transferred</Text>
                <Text className="text-gray-900 text-xl font-black">₦{(order.total_kobo / 100).toLocaleString()}</Text>
              </View>
            </View>

            <View className="flex-row items-center bg-emerald-50 p-3 rounded-xl">
              <Landmark size={16} color="#16654A" />
              <Text className="text-emerald-900 text-xs ml-2 flex-1">
                Funds settled to your platform balance via VentureRoot's escrow ledger.
              </Text>
            </View>
          </View>
        </ViewShot>
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 p-6 bg-white border-t border-gray-100">
        <TouchableOpacity onPress={handleShare} className="bg-emerald-700 py-4 rounded-2xl flex-row justify-center items-center">
          <Share2 color="white" size={20} />
          <Text className="text-white font-bold text-base ml-2">Share Receipt</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  receiptPaper: {
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
});

export default FundTransferReceiptScreen;
