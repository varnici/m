import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, SafeAreaView, StatusBar, ScrollView } from 'react-native';
import type { RootStackScreenProps } from '@/navigation/types';
import { ShieldCheck, Info, ChevronDown, CheckSquare, Square, ChevronLeft } from 'lucide-react-native';
import { colors } from '@/theme/colors';

const BVNVerificationScreen = ({
  navigation,
}: RootStackScreenProps<'BVNVerification'>) => {
  const [bvn, setBvn] = useState('');
  const [consented, setConsented] = useState(false);

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" />
      
      {/* Header with Green Background */}
      <View className="bg-ventureroot-green h-20 absolute top-0 left-0 right-0" />
      
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-6 pt-12 pb-8">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="mb-6 w-10 h-10 bg-white/10 rounded-full items-center justify-center -ml-2"
          >
            <ChevronLeft color="white" size={24} />
          </TouchableOpacity>

          {/* Icon & Title Section */}
          <View className="items-center mt-4 mb-8">
            <View className="w-16 h-16 bg-emerald-50 rounded-full items-center justify-center mb-4">
              <ShieldCheck size={32} color="#10B981" />
            </View>
            <Text className="text-gray-900 text-2xl font-bold mb-2">Verify Your Identity</Text>
            <Text className="text-gray-500 text-center">We use your BVN to verify — never store it</Text>
          </View>

          {/* Info Box */}
          <View className="bg-emerald-50 rounded-2xl p-4 flex-row items-center mb-8 border border-emerald-100">
            <View className="w-8 h-8 rounded-full bg-emerald-500 items-center justify-center mr-3">
              <Info size={16} color="white" />
            </View>
            <Text className="flex-1 text-emerald-800 text-xs font-medium leading-4">
              Your BVN is <Text className="font-bold">only used for verification</Text>. It is never stored on our servers.
            </Text>
          </View>

          {/* Input Section */}
          <View className="mb-6">
            <Text className="text-gray-500 text-xs mb-2 font-medium">Enter your BVN</Text>
            <View className="flex-row items-center border-2 border-ventureroot-green rounded-xl px-4 py-3">
               <Text className="text-gray-900 text-lg font-bold tracking-[4px] flex-1">
                 {bvn || '2203•••••••'}
               </Text>
            </View>
            <Text className="text-gray-400 text-[10px] mt-1 text-right">{bvn.length}/11 digits</Text>
            
            {/* Real TextInput (hidden or stylized) for actual input */}
            <TextInput
              keyboardType="numeric"
              maxLength={11}
              value={bvn}
              onChangeText={setBvn}
              style={{ position: 'absolute', opacity: 0, width: '100%', height: 50 }}
              autoFocus
            />
          </View>

          {/* Expandable Info */}
          <TouchableOpacity className="flex-row items-center justify-between py-4 border-y border-gray-100 mb-8">
             <Text className="text-gray-700 font-medium text-sm">Why do we need your BVN?</Text>
             <ChevronDown size={18} color="gray" />
          </TouchableOpacity>

          {/* Consent Checkbox */}
          <TouchableOpacity 
            className="flex-row items-start mb-10"
            onPress={() => setConsented(!consented)}
          >
            <View className="mt-0.5 mr-3">
              {consented ? (
                <CheckSquare size={20} color={colors.ventureroot.green} />
              ) : (
                <Square size={20} color="gray" />
              )}
            </View>
            <Text className="flex-1 text-gray-600 text-xs leading-4">
              I consent to identity verification under <Text className="text-emerald-600 font-bold">NDPR guidelines</Text>
            </Text>
          </TouchableOpacity>

          {/* Action Button */}
          <TouchableOpacity
            className={`py-4 rounded-xl items-center mb-6 ${
              bvn.length === 11 && consented ? 'bg-ventureroot-green shadow-lg' : 'bg-gray-200'
            }`}
            disabled={bvn.length !== 11 || !consented}
            onPress={() => navigation.navigate('PINSetup')}
          >
            <Text className={`font-bold text-base ${bvn.length === 11 && consented ? 'text-white' : 'text-gray-400'}`}>
              Verify Identity
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Progress Indicator */}
      <View className="flex-row justify-center pb-8 gap-2">
        <View className="w-1.5 h-1.5 rounded-full bg-gray-200" />
        <View className="w-8 h-1.5 rounded-full bg-ventureroot-green" />
        <View className="w-1.5 h-1.5 rounded-full bg-gray-200" />
        <View className="w-1.5 h-1.5 rounded-full bg-gray-200" />
        <View className="w-1.5 h-1.5 rounded-full bg-gray-200" />
      </View>
    </SafeAreaView>
  );
};

export default BVNVerificationScreen;
