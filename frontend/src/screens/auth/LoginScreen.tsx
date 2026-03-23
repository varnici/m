import React, { useState } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Fingerprint, Delete } from 'lucide-react-native';
import { colors } from '@/theme/colors';

const LoginScreen = () => {
  const navigation = useNavigation<any>();
  const [pin, setPin] = useState('');

  const handlePress = (val: string) => {
    if (pin.length < 4) {
      const newPin = pin + val;
      setPin(newPin);
      if (newPin.length === 4) {
        // Mock successful login
        setTimeout(() => navigation.navigate('Dashboard'), 500);
      }
    }
  };

  const handleDelete = () => {
    setPin(pin.slice(0, -1));
  };

  const KeypadButton = ({ val, children }: { val?: string; children?: React.ReactNode }) => (
    <TouchableOpacity
      className="w-[30%] aspect-square items-center justify-center rounded-2xl active:bg-gray-100"
      onPress={() => val ? handlePress(val) : null}
      accessible={true}
      accessibilityLabel={val || 'Action'}
    >
      {children || <Text className="text-gray-900 text-2xl font-bold">{val}</Text>}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="light-content" />
      
      {/* Header Section */}
      <View className="bg-ventureroot-green pt-12 pb-10 items-center rounded-b-[40px]">
         <View className="w-12 h-12 bg-white rounded-xl items-center justify-center mb-4">
            <View className="w-8 h-8 bg-ventureroot-green rounded-lg justify-center items-center">
                 <View className="w-4 h-4 border-2 border-white rounded-sm rotate-45" />
            </View>
         </View>
         <Text className="text-white text-xl font-bold mb-1">Welcome back, Chidi 👋</Text>
         <Text className="text-white/60 text-sm font-medium">+234 *** *** 4821</Text>
      </View>

      <View className="flex-1 items-center pt-10">
        <Text className="text-gray-400 text-sm font-medium mb-6">Enter your 4 digit PIN</Text>
        
        {/* PIN Indicators */}
        <View className="flex-row gap-4 mb-12">
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
        <View className="flex-row flex-wrap justify-between px-10 w-full mb-8">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((v) => (
            <KeypadButton key={v} val={v} />
          ))}
          
          <TouchableOpacity 
            className="w-[30%] aspect-square items-center justify-center active:opacity-70"
            onPress={() => console.log('Face ID')}
          >
            <View className="items-center">
                <Fingerprint size={24} color={colors.ventureroot.green} />
                <Text className="text-ventureroot-green text-[10px] mt-1 font-bold">Face ID</Text>
            </View>
          </TouchableOpacity>

          <KeypadButton val="0" />

          <TouchableOpacity 
            className="w-[30%] aspect-square items-center justify-center active:opacity-70"
            onPress={handleDelete}
          >
            <Delete size={24} color="gray" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => console.log('Forgot PIN')}>
            <Text className="text-ventureroot-green font-bold text-sm">Forgot PIN?</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default LoginScreen;
