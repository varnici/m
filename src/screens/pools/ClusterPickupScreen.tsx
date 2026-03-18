import React from 'react';
import { View, Text, ScrollView, SafeAreaView, StatusBar, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft, QrCode, MapPin, Phone, Info, Clock } from 'lucide-react-native';
import { colors } from '@/theme/colors';

const ClusterPickupScreen = () => {
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
           <Text className="text-white text-xl font-bold">Cluster Roundup</Text>
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
         {/* Verification QR */}
         <View className="bg-white m-4 p-8 rounded-3xl border border-gray-100 shadow-sm items-center">
            <Text className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-6">Verification QR Code</Text>
            <View className="w-56 h-56 bg-slate-50 border border-gray-100 items-center justify-center rounded-2xl mb-6">
               <QrCode size={180} color="#111827" strokeWidth={1} />
            </View>
            <Text className="text-gray-900 font-bold text-sm mb-1">REF: VR-POOL-74291</Text>
            <Text className="text-gray-400 text-[10px]">Show this to the agent at the pickup center</Text>
         </View>

         {/* Pickup Details */}
         <View className="px-4 mb-8">
            <Text className="text-gray-900 font-bold text-base mb-4">Pickup Information</Text>
            <View className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm">
               <View className="flex-row items-start mb-6">
                  <View className="w-10 h-10 bg-blue-50 rounded-xl items-center justify-center mr-4">
                     <MapPin size={20} color="#3B82F6" />
                  </View>
                  <View className="flex-1">
                     <Text className="text-gray-900 font-bold text-sm">Oyingbo Market Center</Text>
                     <Text className="text-gray-500 text-[10px] leading-4">Block B, Warehouse 12 (Opposite First Bank), Lagos Mainland.</Text>
                  </View>
                  <TouchableOpacity className="bg-gray-100 p-2 rounded-full">
                     <Phone size={16} color="#4B5563" />
                  </TouchableOpacity>
               </View>

               <View className="flex-row items-center pt-5 border-t border-gray-50">
                  <Clock size={16} color="#6B7280" />
                  <Text className="text-gray-500 text-[10px] ml-2">Open hours: <Text className="font-bold text-gray-900">8 AM - 6 PM</Text> (Mon - Sat)</Text>
               </View>
            </View>
         </View>

         {/* Items to Collect */}
         <View className="px-4 mb-10">
            <Text className="text-gray-900 font-bold text-base mb-4">Items to Collect</Text>
            <View className="bg-slate-900 rounded-3xl p-5 border border-white/5">
               <View className="flex-row items-center border-b border-white/10 pb-4 mb-4">
                  <View className="w-10 h-10 bg-white/10 rounded-xl items-center justify-center mr-4">
                     <Text className="text-white text-lg font-bold">5</Text>
                  </View>
                  <View>
                     <Text className="text-white font-bold text-sm">Dangote Sugar (50kg)</Text>
                     <Text className="text-white/40 text-[10px]">From Group Pool #42</Text>
                  </View>
               </View>
               <TouchableOpacity className="flex-row items-center justify-center">
                  <Info size={14} color="#94A3B8" />
                  <Text className="text-slate-400 text-[10px] font-bold ml-2">Need help with logistics? Chat with Support</Text>
               </TouchableOpacity>
            </View>
         </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ClusterPickupScreen;
