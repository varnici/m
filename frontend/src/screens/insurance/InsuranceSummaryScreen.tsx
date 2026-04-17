import React from 'react';
import { View, Text, ScrollView, StatusBar, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RootStackScreenProps } from '@/navigation/types';
import { ChevronLeft, ShieldCheck, Landmark, FileText, History, Info, ChevronRight, AlertCircle } from 'lucide-react-native';
import { colors } from '@/theme/colors';

const InsuranceSummaryScreen = ({
  navigation,
}: RootStackScreenProps<'InsuranceSummary'>) => {
  return (
    <SafeAreaView className="flex-1 bg-background-page">
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View className="bg-ventureroot-green pt-12 pb-6 px-4">
        <View className="flex-row items-center mb-4">
           <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3">
              <ChevronLeft color="white" size={24} />
           </TouchableOpacity>
           <Text className="text-white text-xl font-bold">Insurance Workspace</Text>
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Active Policy Card */}
        <View className="bg-white m-4 p-6 rounded-3xl border border-gray-100 shadow-sm">
           <View className="flex-row items-center mb-6">
              <View className="w-12 h-12 bg-emerald-50 rounded-2xl items-center justify-center mr-4">
                 <ShieldCheck size={28} color="#10B981" />
              </View>
              <View>
                 <Text className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Active Policy</Text>
                 <Text className="text-gray-900 text-lg font-bold">Merchant Protection Plan</Text>
              </View>
           </View>

           <View className="bg-gray-50 rounded-2xl p-4 gap-3">
              <View className="flex-row justify-between items-center">
                 <Text className="text-gray-500 text-xs">Total Coverage</Text>
                 <Text className="text-gray-900 font-bold text-sm">₦5,000,000</Text>
              </View>
              <View className="flex-row justify-between items-center">
                 <Text className="text-gray-500 text-xs">Monthly Premium</Text>
                 <Text className="text-gray-900 font-bold text-sm">₦3,200</Text>
              </View>
              <View className="flex-row justify-between items-center pt-3 border-t border-gray-100">
                 <Text className="text-gray-900 font-bold text-xs italic">Next payment due: Jan 15</Text>
                 <TouchableOpacity className="bg-emerald-100 px-3 py-1 rounded-lg">
                    <Text className="text-emerald-700 font-bold text-[10px]">Auto-pay ON</Text>
                 </TouchableOpacity>
              </View>
           </View>
        </View>

        {/* Quick Actions */}
        <View className="px-4 mb-8 gap-3">
           <TouchableOpacity 
             className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex-row items-center"
             onPress={() => navigation.navigate('FileClaim')}
           >
              <View className="w-10 h-10 bg-blue-50 rounded-xl items-center justify-center mr-4">
                 <FileText size={20} color="#3B82F6" />
              </View>
              <View className="flex-1">
                 <Text className="text-gray-900 font-bold text-sm">File a New Claim</Text>
                 <Text className="text-gray-400 text-[10px]">Report damage or theft</Text>
              </View>
              <ChevronRight size={20} color="#D1D5DB" />
           </TouchableOpacity>

           <TouchableOpacity 
             className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex-row items-center"
             onPress={() => navigation.navigate('ClaimHistory')}
           >
              <View className="w-10 h-10 bg-orange-50 rounded-xl items-center justify-center mr-4">
                 <History size={20} color="#F59E0B" />
              </View>
              <View className="flex-1">
                 <Text className="text-gray-900 font-bold text-sm">Claim History</Text>
                 <Text className="text-gray-400 text-[10px]">Track your filed requests</Text>
              </View>
              <ChevronRight size={20} color="#D1D5DB" />
           </TouchableOpacity>
        </View>

        {/* Coverage Highlights */}
        <View className="px-4 mb-10">
           <Text className="text-gray-900 font-bold text-base mb-4">Coverage Highlights</Text>
           <View className="bg-emerald-50 rounded-2xl p-5 border border-emerald-100">
              <View className="flex-row gap-4 mb-4">
                 <View className="w-1.5 h-auto bg-emerald-400 rounded-full" />
                 <View className="flex-1">
                    <Text className="text-emerald-900 font-bold text-xs mb-1">Fire & Water Damage</Text>
                    <Text className="text-emerald-800 text-[10px]">Covers stock and equipment up to ₦2.5M in case of accidental fire or warehouse flooding.</Text>
                 </View>
              </View>
              <View className="flex-row gap-4">
                 <View className="w-1.5 h-auto bg-emerald-400 rounded-full" />
                 <View className="flex-1">
                    <Text className="text-emerald-900 font-bold text-xs mb-1">Burglary & Transit Theft</Text>
                    <Text className="text-emerald-800 text-[10px]">Protection for your goods during pickup and storage at verified cluster centers.</Text>
                 </View>
              </View>
              
              <TouchableOpacity className="mt-6 flex-row items-center">
                 <Info size={14} color="#059669" />
                 <Text className="text-emerald-700 font-bold text-[10px] ml-1">View Full Policy Document →</Text>
              </TouchableOpacity>
           </View>
        </View>

        {/* Support Alert */}
        <View className="mx-4 mb-10 bg-slate-900 p-4 rounded-2xl flex-row items-center">
           <AlertCircle size={20} color="#FBBF24" />
           <Text className="text-white text-[10px] ml-3 flex-1">
              Need immediate help? Our insurance agents are available <Text className="text-emerald-400 font-bold">24/7</Text> for crisis response.
           </Text>
           <TouchableOpacity className="bg-white/10 px-3 py-1.5 rounded-lg border border-white/10">
              <Text className="text-white font-bold text-[10px]">Call Agent</Text>
           </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default InsuranceSummaryScreen;
