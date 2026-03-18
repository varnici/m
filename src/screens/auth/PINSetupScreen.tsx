import React, { useState } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Delete } from 'lucide-react-native';
import { colors } from '@/theme/colors';

const PINSetupScreen = () => {
  const navigation = useNavigation<any>();
  const [pin, setPin] = useState('');

  const handlePress = (val: string) => {
    if (pin.length < 4) {
      const newPin = pin + val;
      setPin(newPin);
      if (newPin.length === 4) {
        // In a real app, we might ask to confirm PIN
        setTimeout(() => navigation.navigate('BiometricSetup'), 500);
      }
    }
  };

  const handleDelete = () => setPin(pin.slice(0, -1));

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View className="bg-ventureroot-green pt-16 pb-12 px-6 items-center">
        {/* Progress dots */}
        <View className="flex-row gap-2 mb-8">
           {[1, 2, 3, 4, 5].map((i) => (
             <View key={i} className={`h-1.5 rounded-full ${i <= 3 ? 'bg-white' : 'bg-white/20'} ${i === 3 ? 'w-8' : 'w-1.5'}`} />
           ))}
        </View>
        <Text className="text-white text-2xl font-bold mb-2">Create Your Secure PIN</Text>
        <Text className="text-white/70 text-sm text-center">You'll use this PIN to authorize all transactions</Text>
      </View>

      <View className="flex-1 items-center pt-12">
        <Text className="text-gray-400 text-xs font-medium mb-6 uppercase tracking-widest">Enter 4 digit PIN</Text>
        
        {/* PIN Indicators */}
        <View className="flex-row gap-6 mb-16">
          {[1, 2, 3, 4].map((i) => (
            <View 
              key={i} 
              className={`w-4 h-4 rounded-full border-2 ${
                pin.length >= i ? 'bg-ventureroot-green border-ventureroot-green' : 'border-gray-200'
              }`} 
            />
          ))}
        </View>

        {/* Numeric Keypad */}
        <View className="flex-row flex-wrap justify-between px-10 w-full">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0'].map((v, i) => (
             v === '' ? <View key={i} className="w-[30%] aspect-square" /> : (
              <TouchableOpacity
                key={v}
                className="w-[30%] aspect-square items-center justify-center rounded-2xl active:bg-gray-100"
                onPress={() => handlePress(v)}
              >
                <Text className="text-gray-900 text-2xl font-bold">{v}</Text>
              </TouchableOpacity>
             )
          ))}
          <TouchableOpacity 
            className="w-[30%] aspect-square items-center justify-center active:bg-gray-100 rounded-2xl"
            onPress={handleDelete}
          >
            <Delete size={28} color="gray" />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default PINSetupScreen;
