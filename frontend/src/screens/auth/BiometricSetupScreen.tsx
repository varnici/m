import React from 'react';
import { View, Text, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RootStackScreenProps } from '@/navigation/types';
import { FingerprintPattern, CheckCircle2 } from 'lucide-react-native';
import { colors } from '@/theme/colors';

const BiometricSetupScreen = ({
  navigation,
}: RootStackScreenProps<'BiometricSetup'>) => {
  const benefits = [
    'Log in instantly',
    'No PIN needed',
    'Secured on your device only',
  ];

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View className="bg-ventureroot-green h-20 absolute top-0 left-0 right-0" />
      
      <View className="px-6 pt-16 items-center">
        {/* Progress dots */}
        <View className="flex-row gap-2 mb-12">
           {[1, 2, 3, 4, 5].map((i) => (
             <View key={i} className={`h-1.5 rounded-full ${i <= 4 ? 'bg-ventureroot-green' : 'bg-gray-200'} ${i === 4 ? 'w-8' : 'w-1.5'}`} />
           ))}
        </View>

        {/* Fingerprint Illustration */}
        <View className="w-32 h-32 rounded-full bg-gray-50 items-center justify-center mb-10 border border-gray-100">
           <View className="w-24 h-24 rounded-full bg-gray-100 items-center justify-center">
              <FingerprintPattern size={48} color="#D1D5DB" />
           </View>
        </View>

        <Text className="text-gray-900 text-2xl font-bold mb-3">Faster, Safer Login</Text>
        <Text className="text-gray-500 text-center mb-10 leading-6 px-6">
          Use your fingerprint to log in instantly — no PIN needed every time
        </Text>

        {/* Benefits List */}
        <View className="w-full gap-4 mb-12">
          {benefits.map((b, i) => (
             <View key={i} className="flex-row items-center bg-gray-50 p-4 rounded-xl border border-gray-100">
                <CheckCircle2 size={20} color="#10B981" />
                <Text className="ml-3 text-gray-700 font-medium text-sm">{b}</Text>
             </View>
          ))}
        </View>

        {/* Actions */}
        <View className="w-full gap-4">
          <TouchableOpacity
            className="bg-ventureroot-green py-4 rounded-xl items-center shadow-lg"
            onPress={() => navigation.navigate('Dashboard')}
          >
            <Text className="text-white font-bold text-base">Enable Fingerprint</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="py-2 items-center"
            onPress={() => navigation.navigate('Dashboard')}
          >
            <Text className="text-gray-400 font-bold text-sm">Skip for now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default BiometricSetupScreen;
