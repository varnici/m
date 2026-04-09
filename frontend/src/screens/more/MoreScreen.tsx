import React from 'react';
import { View, Text, ScrollView, SafeAreaView, StatusBar, TouchableOpacity, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ChevronRight, Settings, Bell, Shield, Share2, Award, CircleCheckBig } from 'lucide-react-native';
import { colors } from '@/theme/colors';

const MoreScreen = () => {
  const navigation = useNavigation<any>();
  const trustChecklist = [
    'KYC Verified',
    'BVN Matched',
    '6-Month Sales History',
    'All Repayments Clean',
    'Consistent Sales Velocity',
  ];

  return (
    <SafeAreaView className="flex-1 bg-background-page">
      <StatusBar barStyle="light-content" />
      
      {/* Header Area */}
      <View className="bg-ventureroot-green pt-12 pb-10 px-6 rounded-b-[40px] items-center">
         <View className="w-20 h-20 rounded-full border-4 border-white/20 bg-gray-200 overflow-hidden mb-4">
            <Image 
              source={{ uri: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Chidi' }} 
              className="w-full h-full"
            />
         </View>
         <Text className="text-white text-2xl font-bold mb-1">Chidi Okonkwo</Text>
         <Text className="text-white/60 text-xs mb-4">+234 *** *** 4821 · Member since Jan 2024</Text>
         
         <View className="bg-orange-500/20 px-4 py-1.5 rounded-full flex-row items-center border border-orange-500/30">
            <Award size={14} color="#F97316" />
            <Text className="text-orange-100 text-[10px] font-bold ml-1 uppercase tracking-wider">Gold — 1,240 pts</Text>
         </View>
      </View>

      <ScrollView className="flex-1 px-4 pt-6" showsVerticalScrollIndicator={false}>
        {/* Trust Score Card */}
        <View className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm mb-6">
           <View className="flex-row justify-between items-baseline mb-4">
              <Text className="text-gray-900 font-bold text-lg">Trust Score</Text>
              <Text className="text-emerald-600 font-black text-2xl">87/100</Text>
           </View>

           <View className="h-2 bg-gray-100 rounded-full overflow-hidden mb-6">
              <View className="h-full bg-emerald-500 rounded-full w-[87%]" />
           </View>

           <View className="gap-3">
              {trustChecklist.map((item, i) => (
                 <View key={i} className="flex-row items-center">
                    <CircleCheckBig size={16} color="#10B981" />
                    <Text className="ml-3 text-gray-700 text-xs font-medium">{item}</Text>
                    <Text className="ml-1 text-emerald-500/50 text-[10px]">✓</Text>
                 </View>
              ))}
           </View>
        </View>

        {/* Refer & Earn */}
        <TouchableOpacity className="bg-emerald-50 rounded-2xl p-4 flex-row items-center mb-6 border border-emerald-100">
           <View className="w-10 h-10 bg-emerald-100 rounded-xl items-center justify-center mr-4">
              <Text className="text-xl">🎁</Text>
           </View>
           <View className="flex-1">
              <Text className="text-emerald-900 font-bold text-sm">Refer & Earn ₦2,000</Text>
              <Text className="text-emerald-800 text-[10px]">Your code: <Text className="font-bold">CHIDI22</Text></Text>
           </View>
           <TouchableOpacity className="bg-emerald-600 px-4 py-1.5 rounded-lg">
              <Text className="text-white font-bold text-[10px]">Share</Text>
           </TouchableOpacity>
        </TouchableOpacity>

        {/* Menu Items */}
        <View className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-10">
           {[
             { label: 'Notifications', icon: Bell, color: '#3B82F6' },
             { label: 'Security & PIN', icon: Shield, color: '#10B981' },
             { label: 'Settings', icon: Settings, color: '#6B7280' },
           ].map((item, idx) => (
              <TouchableOpacity 
                key={idx} 
                className={`flex-row items-center p-4 ${idx < 2 ? 'border-b border-gray-50' : ''}`}
              >
                 <item.icon size={20} color={item.color} opacity={0.8} />
                 <Text className="flex-1 ml-4 text-gray-700 font-medium">{item.label}</Text>
                 <ChevronRight size={20} color="#D1D5DB" />
              </TouchableOpacity>
           ))}
        </View>

        {/* Sign Out */}
        <TouchableOpacity 
          className="items-center mb-10"
          onPress={() => navigation.replace('Welcome')}
        >
           <Text className="text-red-500 font-bold">Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Footer Navigation Overlay (Simulated) */}
      <View className="absolute bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-100 flex-row items-center justify-around px-4">
         <TouchableOpacity onPress={() => navigation.navigate('Dashboard')} className="items-center">
            <Text className="text-gray-400 text-[10px]">Home</Text>
         </TouchableOpacity>
         <TouchableOpacity onPress={() => navigation.navigate('LoanDashboard')} className="items-center">
            <Text className="text-gray-400 text-[10px]">Loans</Text>
         </TouchableOpacity>
         <TouchableOpacity onPress={() => navigation.navigate('SalesDashboard')} className="items-center">
            <Text className="text-gray-400 text-[10px]">Sales</Text>
         </TouchableOpacity>
         <TouchableOpacity onPress={() => navigation.navigate('Wallet')} className="items-center">
            <Text className="text-gray-400 text-[10px]">Wallet</Text>
         </TouchableOpacity>
         <TouchableOpacity className="items-center">
            <Text className="text-ventureroot-green font-bold text-[10px]">More</Text>
         </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default MoreScreen;
