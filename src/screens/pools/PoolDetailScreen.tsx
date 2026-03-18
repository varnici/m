import React from 'react';
import { View, Text, ScrollView, SafeAreaView, StatusBar, TouchableOpacity, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft, Info, Users, ShieldCheck, MapPin, Truck, ChevronRight } from 'lucide-react-native';
import { colors } from '@/theme/colors';

const PoolDetailScreen = () => {
  const navigation = useNavigation<any>();

  return (
    <SafeAreaView className="flex-1 bg-background-page">
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View className="bg-ventureroot-green pt-12 pb-6 px-4">
        <View className="flex-row items-center mb-4">
           <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3">
              <ChevronLeft color="white" size={24} />
           </TouchableOpacity>
           <Text className="text-white text-xl font-bold">Pool Details</Text>
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Product Hero */}
        <View className="bg-white m-4 p-6 rounded-3xl border border-gray-100 shadow-sm">
           <View className="flex-row items-center mb-6">
              <View className="w-16 h-16 bg-slate-50 rounded-2xl items-center justify-center mr-4 border border-gray-100">
                 <Text className="text-2xl">📦</Text>
              </View>
              <View className="flex-1">
                 <Text className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Premium Grains</Text>
                 <Text className="text-gray-900 text-lg font-bold">Dangote Sugar (50kg Bag)</Text>
                 <View className="flex-row items-center mt-1">
                    <Users size={12} color="#6B7280" />
                    <Text className="text-gray-500 text-[10px] ml-1">42 people joined this pool</Text>
                 </View>
              </View>
           </View>

           {/* Price Tier Table */}
           <View className="bg-slate-50 rounded-2xl p-4">
              <Text className="text-gray-900 font-bold text-xs mb-3">Community Savings Tiers</Text>
              <View className="gap-2">
                 <View className="flex-row justify-between items-center opacity-50">
                    <Text className="text-gray-500 text-[10px]">10 - 25 Bags</Text>
                    <Text className="text-gray-500 font-bold text-xs">₦88,000</Text>
                 </View>
                 <View className="flex-row justify-between items-center bg-white p-2 rounded-xl border border-ventureroot-green shadow-sm">
                    <View className="flex-row items-center">
                       <Text className="text-gray-900 font-bold text-xs">26 - 50 Bags</Text>
                       <View className="bg-ventureroot-green px-1.5 py-0.5 rounded ml-2">
                          <Text className="text-white font-bold text-[8px]">ACTIVE</Text>
                       </View>
                    </View>
                    <Text className="text-ventureroot-green font-black text-sm">₦82,000</Text>
                 </View>
                 <View className="flex-row justify-between items-center">
                    <Text className="text-gray-500 text-[10px]">51+ Bags (Wholesale)</Text>
                    <Text className="text-gray-900 font-bold text-xs">₦78,500</Text>
                 </View>
              </View>
           </View>
        </View>

        {/* Logistics Options */}
        <View className="px-4 mb-8">
           <Text className="text-gray-900 font-bold text-base mb-4">Pickup & Delivery</Text>
           <View className="gap-3">
              <TouchableOpacity 
                className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex-row items-center"
                onPress={() => navigation.navigate('ClusterPickup')}
              >
                 <View className="w-10 h-10 bg-emerald-50 rounded-xl items-center justify-center mr-4">
                    <MapPin size={20} color="#10B981" />
                 </View>
                 <View className="flex-1">
                    <Text className="text-gray-900 font-bold text-sm">Cluster Pickup (Free)</Text>
                    <Text className="text-gray-400 text-[10px]">Oyingbo Market Center · Block B</Text>
                 </View>
                 <ChevronRight size={18} color="#D1D5DB" />
              </TouchableOpacity>

              <View className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex-row items-center opacity-50">
                 <View className="w-10 h-10 bg-blue-50 rounded-xl items-center justify-center mr-4">
                    <Truck size={20} color="#3B82F6" />
                 </View>
                 <View className="flex-1">
                    <Text className="text-gray-900 font-bold text-sm">Last-Mile Delivery (₦2,500)</Text>
                    <Text className="text-gray-400 text-[10px]">Right to your shop doorstep</Text>
                 </View>
                 <Text className="text-gray-400 font-bold text-[8px]">SOON</Text>
              </View>
           </View>
        </View>

        {/* Trust Badge */}
        <View className="mx-4 bg-emerald-50 p-4 rounded-2xl border border-emerald-100 flex-row items-start mb-10">
           <ShieldCheck size={20} color="#059669" className="mr-3" />
           <View className="flex-1">
              <Text className="text-emerald-900 font-bold text-xs">VentureRoot Guaranteed</Text>
              <Text className="text-emerald-800 text-[10px]">Funds are held in escrow. If the pool doesn't reach the target or goods aren't delivered, you get an instant refund.</Text>
           </View>
        </View>

        {/* Join CTA */}
        <TouchableOpacity className="mx-4 bg-ventureroot-green py-4 rounded-xl items-center shadow-lg mb-10">
           <Text className="text-white font-bold text-base">Enter Pool (Commit ₦82,000) →</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default PoolDetailScreen;
