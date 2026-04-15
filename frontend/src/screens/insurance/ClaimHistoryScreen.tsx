import React from 'react';
import { View, Text, ScrollView, SafeAreaView, StatusBar, TouchableOpacity } from 'react-native';
import type { RootStackScreenProps } from '@/navigation/types';
import { ChevronLeft, Search, Filter, ShieldCheck, Clock, ShieldX } from 'lucide-react-native';
import { colors } from '@/theme/colors';

const ClaimHistoryScreen = ({
  navigation,
}: RootStackScreenProps<'ClaimHistory'>) => {
  const claims = [
    { id: 1, type: 'Water Damage', status: 'Approved', amount: '₦184,200', date: 'Dec 05, 2024', ref: 'VR-CLM-2024-X82' },
    { id: 2, type: 'Burglary (Stock)', status: 'Pending', amount: '₦850,000', date: 'Dec 22, 2024', ref: 'VR-CLM-2024-Y14' },
    { id: 3, type: 'Fire (Equipment)', status: 'Approved', amount: '₦1,240,000', date: 'Nov 14, 2024', ref: 'VR-CLM-2024-Z09' },
  ];

  const getStatusStyle = (status: string) => {
    switch(status) {
      case 'Approved': return { bg: 'bg-emerald-50', text: 'text-emerald-700', icon: ShieldCheck, color: '#10B981' };
      case 'Pending': return { bg: 'bg-orange-50', text: 'text-orange-700', icon: Clock, color: '#F59E0B' };
      default: return { bg: 'bg-gray-50', text: 'text-gray-700', icon: ShieldX, color: '#6B7280' };
    }
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
           <Text className="text-white text-xl font-bold">Claim History</Text>
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="flex-row px-4 pt-4 justify-between items-center mb-4">
           <Text className="text-gray-900 font-bold text-base">Your Requests</Text>
           <View className="flex-row gap-3">
              <TouchableOpacity className="p-2 bg-gray-100 rounded-full">
                 <Search size={16} color="#4B5563" />
              </TouchableOpacity>
              <TouchableOpacity className="p-2 bg-gray-100 rounded-full">
                 <Filter size={16} color="#4B5563" />
              </TouchableOpacity>
           </View>
        </View>

        <View className="px-4 pb-10">
           {claims.map((claim, idx) => {
              const style = getStatusStyle(claim.status);
              return (
                 <View key={idx} className="bg-white rounded-3xl p-5 mb-4 border border-gray-100 shadow-sm">
                    <View className="flex-row justify-between items-start mb-4">
                       <View>
                          <Text className="text-gray-400 text-[8px] font-bold uppercase tracking-widest mb-1">{claim.ref}</Text>
                          <Text className="text-gray-900 font-bold text-base">{claim.type}</Text>
                       </View>
                       <View className={`${style.bg} px-3 py-1 rounded-full flex-row items-center`}>
                          <style.icon size={10} color={style.color} />
                          <Text className={`${style.text} font-bold text-[10px] ml-1`}>{claim.status}</Text>
                       </View>
                    </View>

                    <View className="flex-row justify-between items-end">
                       <View>
                          <Text className="text-gray-400 text-[10px] mb-1">Claimed Amount</Text>
                          <Text className="text-gray-900 font-black text-lg">{claim.amount}</Text>
                       </View>
                       <Text className="text-gray-400 text-[10px] font-medium italic">{claim.date}</Text>
                    </View>
                 </View>
              );
           })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ClaimHistoryScreen;
