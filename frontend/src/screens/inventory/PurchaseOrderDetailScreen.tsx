import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  ChevronLeft, 
  Package, 
  Truck, 
  CheckCircle2, 
  Clock, 
  User, 
  MapPin, 
  CreditCard,
  MoreVertical,
  Printer,
  Share2,
  AlertCircle
} from 'lucide-react-native';
import type { RootStackScreenProps } from '@/navigation/types';
import { colors } from '@/theme/colors';
import { usePurchaseOrderDetail, useReceivePurchaseOrder, useConfirmPurchaseOrder } from '@/hooks/useInventory';
import Toast from 'react-native-toast-message';
import { format } from 'date-fns';

const PurchaseOrderDetailScreen = ({ navigation, route }: RootStackScreenProps<'PurchaseOrderDetail'>) => {
  const { poId } = route.params;
  
  const { data: po, isLoading, isError, refetch } = usePurchaseOrderDetail(poId);
  const receiveMutation = useReceivePurchaseOrder(poId);
  const confirmMutation = useConfirmPurchaseOrder(poId);

  const statusColors = useMemo(() => {
    if (!po) return { bg: '#F3F4F6', text: '#374151', icon: Clock };
    switch (po.status as string) {
      case 'received': return { bg: '#D1FAE5', text: '#065F46', icon: CheckCircle2 };
      case 'shipped': return { bg: '#DBEAFE', text: '#1E40AF', icon: Truck };
      case 'confirmed': return { bg: '#FEF3C7', text: '#92400E', icon: Package };
      case 'pending': return { bg: '#FEE2E2', text: '#991B1B', icon: Clock };
      default: return { bg: '#F3F4F6', text: '#374151', icon: Clock };
    }
  }, [po]);

  const handleReceive = () => {
    Alert.alert(
      "Confirm Receipt",
      "Are you sure you want to mark this order as fully received? Stock levels will be updated automatically.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Confirm", 
          onPress: () => {
            receiveMutation.mutate(undefined, {
              onSuccess: () => {
                Toast.show({ type: 'success', text1: 'Order Received', text2: 'Stock has been updated' });
                refetch();
              },
              onError: () => {
                Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to update order status' });
              }
            });
          } 
        }
      ]
    );
  };

  const handleConfirm = () => {
    confirmMutation.mutate(undefined, {
      onSuccess: () => {
        Toast.show({ type: 'success', text1: 'Order Confirmed', text2: 'Supplier notified' });
        refetch();
      }
    });
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-background-page items-center justify-center">
        <ActivityIndicator size="large" color={colors.ventureroot.green} />
        <Text className="mt-4 text-gray-500 font-medium">Loading Order Details...</Text>
      </View>
    );
  }

  if (isError || !po) {
    return (
      <View className="flex-1 bg-background-page items-center justify-center p-6">
        <AlertCircle size={48} color="#EF4444" />
        <Text className="mt-4 text-gray-900 font-bold text-lg">Failed to load order</Text>
        <TouchableOpacity 
          className="mt-6 bg-slate-900 px-8 py-3 rounded-2xl"
          onPress={() => navigation.goBack()}
        >
          <Text className="text-white font-bold">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const StatusIcon = statusColors.icon;

  return (
    <SafeAreaView className="flex-1 bg-background-page">
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View className="bg-white px-6 pt-4 pb-6 flex-row items-center justify-between border-b border-gray-100">
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          className="w-10 h-10 bg-gray-50 rounded-xl items-center justify-center"
        >
          <ChevronLeft color="#111827" size={24} />
        </TouchableOpacity>
        <View className="items-center">
          <Text className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Order Detail</Text>
          <Text className="text-gray-900 font-black text-lg">{po.po_number}</Text>
        </View>
        <TouchableOpacity className="w-10 h-10 bg-gray-50 rounded-xl items-center justify-center">
          <MoreVertical color="#111827" size={20} />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20 }}>
        
        {/* Status Card */}
        <View className="bg-white rounded-[32px] p-6 border border-gray-100 shadow-sm mb-6">
          <View className="flex-row items-center justify-between mb-6">
            <View className={`px-4 py-2 rounded-full flex-row items-center`} style={{ backgroundColor: statusColors.bg }}>
              <StatusIcon size={14} color={statusColors.text} className="mr-2" />
              <Text className="font-black text-[10px] uppercase tracking-wider" style={{ color: statusColors.text }}>
                {po.status}
              </Text>
            </View>
            <Text className="text-gray-400 text-xs">{format(new Date(po.created_at), 'MMM dd, yyyy')}</Text>
          </View>

          <View className="flex-row justify-between mb-4">
            <View>
              <Text className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-1">Supplier</Text>
              <Text className="text-gray-900 font-bold text-base">{po.supplier?.name || 'Unknown'}</Text>
            </View>
            <View className="items-end">
              <Text className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-1">Expected By</Text>
              <Text className="text-gray-900 font-bold text-base">
                {po.expected_delivery_date ? format(new Date(po.expected_delivery_date), 'MMM dd') : 'TBD'}
              </Text>
            </View>
          </View>

          <View className="h-[1px] bg-gray-100 my-4" />

          <View className="flex-row justify-between">
            <View>
              <Text className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-1">Payment</Text>
              <View className="flex-row items-center">
                <CreditCard size={14} color="#6B7280" className="mr-2" />
                <Text className="text-gray-600 font-bold text-sm">Bank Transfer</Text>
              </View>
            </View>
            <View className="items-end">
              <Text className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-1">Total Amount</Text>
              <Text className="text-emerald-600 font-black text-xl">₦{(po.total_amount_kobo / 100).toLocaleString()}</Text>
            </View>
          </View>
        </View>

        {/* Order Items */}
        <View className="mb-6">
          <Text className="text-gray-900 font-black text-lg mb-4 ml-2">Order Items</Text>
          <View className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
            <View className="bg-gray-50 px-6 py-3 flex-row border-b border-gray-100">
              <Text className="flex-1 text-gray-400 text-[10px] font-black uppercase">Item Description</Text>
              <Text className="w-16 text-gray-400 text-[10px] font-black uppercase text-center">Qty</Text>
              <Text className="w-24 text-gray-400 text-[10px] font-black uppercase text-right">Total</Text>
            </View>
            {po.items?.map((item: any, idx: number) => (
              <View key={idx} className="px-6 py-4 flex-row items-center border-b border-gray-50">
                <View className="flex-1">
                  <Text className="text-gray-900 font-bold text-sm" numberOfLines={1}>{item.product_name || `Item ${idx + 1}`}</Text>
                  <Text className="text-gray-400 text-[10px]">Unit: ₦{(item.unit_price_kobo / 100).toLocaleString()}</Text>
                </View>
                <Text className="w-16 text-gray-900 font-bold text-sm text-center">{item.quantity}</Text>
                <Text className="w-24 text-gray-900 font-bold text-sm text-right">₦{(item.total_price_kobo / 100).toLocaleString()}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Logistics */}
        <View className="bg-white rounded-[32px] p-6 border border-gray-100 shadow-sm mb-6">
          <Text className="text-gray-900 font-black text-base mb-4">Logistics Information</Text>
          <View className="flex-row items-center mb-4">
            <View className="w-10 h-10 bg-indigo-50 rounded-xl items-center justify-center mr-4">
              <MapPin size={20} color="#4F46E5" />
            </View>
            <View className="flex-1">
              <Text className="text-gray-400 text-[10px] font-black uppercase">Destination Store</Text>
              <Text className="text-gray-900 font-bold text-sm">{po.store?.name || 'Main Warehouse'}</Text>
            </View>
          </View>
          <View className="flex-row items-center">
            <View className="w-10 h-10 bg-emerald-50 rounded-xl items-center justify-center mr-4">
              <User size={20} color="#10B981" />
            </View>
            <View className="flex-1">
              <Text className="text-gray-400 text-[10px] font-black uppercase">Supplier Contact</Text>
              <Text className="text-gray-900 font-bold text-sm">{po.supplier?.contact_name || 'N/A'}</Text>
              <Text className="text-gray-500 text-[10px]">{po.supplier?.phone || 'No phone'}</Text>
            </View>
          </View>
        </View>

        {/* Actions */}
        <View className="flex-row gap-4 mb-20">
          <TouchableOpacity className="flex-1 bg-gray-100 py-4 rounded-2xl items-center flex-row justify-center">
            <Printer size={18} color="#4B5563" className="mr-2" />
            <Text className="text-gray-700 font-bold">Print</Text>
          </TouchableOpacity>
          <TouchableOpacity className="flex-1 bg-gray-100 py-4 rounded-2xl items-center flex-row justify-center">
            <Share2 size={18} color="#4B5563" className="mr-2" />
            <Text className="text-gray-700 font-bold">Share</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* Primary Action Button */}
      <View className="absolute bottom-0 left-0 right-0 p-6 bg-white border-t border-gray-100">
        {po.status === 'draft' ? (
          <TouchableOpacity 
            className="bg-indigo-600 py-4 rounded-2xl items-center shadow-lg shadow-indigo-200"
            onPress={handleConfirm}
          >
            <Text className="text-white font-black text-base uppercase tracking-widest">Send to Supplier</Text>
          </TouchableOpacity>
        ) : (po.status as string) === 'shipped' || po.status === 'confirmed' ? (
          <TouchableOpacity 
            className="bg-emerald-600 py-4 rounded-2xl items-center shadow-lg shadow-emerald-200"
            onPress={handleReceive}
            disabled={receiveMutation.isPending}
          >
            {receiveMutation.isPending ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-black text-base uppercase tracking-widest">Mark as Received</Text>
            )}
          </TouchableOpacity>
        ) : po.status === 'received' ? (
          <View className="bg-emerald-50 py-4 rounded-2xl items-center border border-emerald-100 flex-row justify-center">
            <CheckCircle2 size={20} color="#10B981" className="mr-2" />
            <Text className="text-emerald-700 font-black text-base uppercase tracking-widest">Order Completed</Text>
          </View>
        ) : null}
      </View>
      
    </SafeAreaView>
  );
};

export default PurchaseOrderDetailScreen;
