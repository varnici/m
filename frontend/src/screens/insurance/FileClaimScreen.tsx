import React, { useState } from 'react';
import { View, Text, ScrollView, StatusBar, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft, Camera, Image as ImageIcon, TriangleAlert, ShieldAlert } from 'lucide-react-native';
import { colors } from '@/theme/colors';

const FileClaimScreen = () => {
  const navigation = useNavigation<any>();
  const [claimType, setClaimType] = useState('damage');
  const [description, setDescription] = useState('');

  return (
    <SafeAreaView className="flex-1 bg-background-page">
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View className="bg-ventureroot-green pt-12 pb-6 px-4">
        <View className="flex-row items-center mb-4">
           <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3">
              <ChevronLeft color="white" size={24} />
           </TouchableOpacity>
           <Text className="text-white text-xl font-bold">File a Claim</Text>
        </View>
      </View>

      <ScrollView className="flex-1 p-4" showsVerticalScrollIndicator={false}>
        {/* Urgent Note */}
        <View className="bg-orange-50 border border-orange-100 rounded-2xl p-4 flex-row items-start mb-6">
           <TriangleAlert size={20} color="#F59E0B" className="mt-1 mr-3" />
           <View className="flex-1">
              <Text className="text-orange-900 font-bold text-sm">Wait! Is this an emergency?</Text>
              <Text className="text-orange-800 text-[10px]">If your warehouse is currently at risk, please call emergency services before filing this digital claim.</Text>
           </View>
        </View>

        {/* Claim Type Selection */}
        <View className="mb-8">
           <Text className="text-gray-500 text-xs font-bold uppercase mb-3 ml-1">What happened?</Text>
           <View className="flex-row gap-3">
              <TouchableOpacity 
                onPress={() => setClaimType('damage')}
                className={`flex-1 p-4 rounded-2xl border items-center ${claimType === 'damage' ? 'bg-emerald-50 border-emerald-500' : 'bg-white border-gray-100'}`}
              >
                 <ShieldAlert size={24} color={claimType === 'damage' ? '#10B981' : '#9CA3AF'} />
                 <Text className={`font-bold text-xs mt-2 ${claimType === 'damage' ? 'text-emerald-900' : 'text-gray-500'}`}>Stock Damage</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => setClaimType('theft')}
                className={`flex-1 p-4 rounded-2xl border items-center ${claimType === 'theft' ? 'bg-emerald-50 border-emerald-500' : 'bg-white border-gray-100'}`}
              >
                 <ShieldAlert size={24} color={claimType === 'theft' ? '#10B981' : '#9CA3AF'} />
                 <Text className={`font-bold text-xs mt-2 ${claimType === 'theft' ? 'text-emerald-900' : 'text-gray-500'}`}>Theft / Burglary</Text>
              </TouchableOpacity>
           </View>
        </View>

        {/* Description */}
        <View className="mb-8">
           <Text className="text-gray-500 text-xs font-bold uppercase mb-3 ml-1">Describe the incident</Text>
           <View className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
              <TextInput
                className="text-gray-900 font-medium py-1 min-h-[100px]"
                multiline
                placeholder="Tell us what happened, when, and estimated value of loss..."
                value={description}
                onChangeText={setDescription}
                textAlignVertical="top"
              />
           </View>
        </View>

        {/* Proof Uploads */}
        <View className="mb-10">
           <Text className="text-gray-500 text-xs font-bold uppercase mb-3 ml-1">Attach Evidence (Optional)</Text>
           <View className="flex-row gap-4">
              <TouchableOpacity className="w-20 h-20 bg-gray-100 border-2 border-dashed border-gray-200 rounded-2xl items-center justify-center">
                 <Camera size={24} color="#9CA3AF" />
              </TouchableOpacity>
              <TouchableOpacity className="w-20 h-20 bg-gray-100 border-2 border-dashed border-gray-200 rounded-2xl items-center justify-center">
                 <ImageIcon size={24} color="#9CA3AF" />
              </TouchableOpacity>
           </View>
           <Text className="text-gray-400 text-[8px] mt-3 italic">* Clear photos of damage help speed up the verification process (usually 24-48h).</Text>
        </View>

        {/* Submit */}
        <TouchableOpacity 
          className="bg-ventureroot-green py-4 rounded-xl items-center shadow-lg mb-10"
          onPress={() => navigation.navigate('InsuranceSummary')}
        >
           <Text className="text-white font-bold text-base">Submit Claim →</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default FileClaimScreen;
