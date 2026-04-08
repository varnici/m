import React, { useState } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, StatusBar, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useOnboarding } from '../../../context/OnboardingContext';
import { Camera, Scan, UserCheck, ShieldCheck, ArrowRight } from 'lucide-react-native';

const BiometricsScreen = () => {
  const navigation = useNavigation<any>();
  const { data, updateData } = useOnboarding();
  const [isCapturing, setIsCapturing] = useState(false);
  const [isCaptured, setIsCaptured] = useState(false);

  const handleCapture = () => {
    setIsCapturing(true);
    // Simulate capture process
    setTimeout(() => {
      setIsCapturing(false);
      setIsCaptured(true);
      updateData({ faceMatchConfidence: 98 });
    }, 2000);
  };

  const handleContinue = () => {
    navigation.navigate('OnboardingBankLink');
  };

  return (
    <SafeAreaView className="flex-1 bg-ventureroot-industrial-background">
      <StatusBar barStyle="light-content" />
      
      <View className="flex-1 px-6 pt-10 pb-10">
        {/* Editorial Header */}
        <View className="mb-10">
          <Text className="text-ventureroot-industrial-onSurface text-[12px] font-bold tracking-[2px] mb-2 uppercase opacity-60">
            Step 8: Biometric Secure
          </Text>
          <Text className="text-ventureroot-industrial-onSurface text-4xl font-bold leading-[44px]">
            Face Verification
          </Text>
          <View className="w-12 h-1 bg-ventureroot-industrial-primary mt-6 rounded-full" />
        </View>

        <Text className="text-ventureroot-industrial-onSurface text-base opacity-60 mb-10 leading-6">
          Look directly at the camera and blink when prompted. This confirms you are a real person and owner of the provided ID.
        </Text>

        {/* Biometrics Viewport */}
        <View className="flex-1 items-center justify-center">
            <View className={`w-72 h-72 rounded-full border-4 items-center justify-center overflow-hidden relative ${
                isCaptured ? 'border-ventureroot-industrial-primary' : 'border-ventureroot-industrial-surfaceHigh'
            }`}>
              {/* Mock camera view / Placeholder */}
              <View className="absolute inset-0 bg-ventureroot-industrial-surfaceLow items-center justify-center">
                 {!isCaptured && <Scan size={64} color="#CFBFA6" opacity={0.1} />}
                 {isCaptured && (
                    <View className="items-center">
                         <UserCheck size={80} color="#CFBFA6" />
                         <View className="bg-ventureroot-industrial-primary px-3 py-1 rounded-full mt-4">
                            <Text className="text-ventureroot-industrial-background font-black text-[10px] uppercase">Identity Confirmed</Text>
                         </View>
                    </View>
                 )}
              </View>

              {/* Scanning Overlay Effect */}
              {isCapturing && (
                 <View className="absolute inset-0 items-center justify-center">
                    <View className="w-full h-[2px] bg-ventureroot-industrial-primary opacity-50 absolute top-0" style={{ transform: [{ translateY: 150 }] }} /> 
                    <Text className="text-ventureroot-industrial-primary font-bold uppercase tracking-widest text-xs">Scanning...</Text>
                 </View>
              )}
            </View>

            <View className="mt-8 flex-row items-center bg-ventureroot-industrial-surfaceLow px-6 py-3 rounded-full border border-ventureroot-industrial-surfaceHigh">
                <ShieldCheck size={16} color="#CFBFA6" />
                <Text className="text-ventureroot-industrial-onSurface text-[10px] font-bold uppercase tracking-widest ml-3 opacity-60">Liveness Check Powered by AI</Text>
            </View>
        </View>

        {/* Action Button */}
        <View className="mt-12">
          {!isCaptured ? (
             <TouchableOpacity
                onPress={handleCapture}
                disabled={isCapturing}
                className={`h-20 rounded-full items-center justify-center bg-ventureroot-industrial-surfaceLow border-4 border-ventureroot-industrial-surfaceHigh w-20 self-center`}
             >
                <View className="w-14 h-14 rounded-full bg-ventureroot-industrial-onSurface items-center justify-center">
                    <Camera size={24} color="#131313" />
                </View>
             </TouchableOpacity>
          ) : (
             <TouchableOpacity
                onPress={handleContinue}
                className="h-16 rounded-2xl flex-row items-center justify-center bg-ventureroot-industrial-primary shadow-xl shadow-ventureroot-industrial-primary/30"
                activeOpacity={0.8}
             >
                <Text className="text-ventureroot-industrial-background font-black text-lg mr-2 uppercase tracking-tighter">
                  Authorize & Continue
                </Text>
                <ArrowRight size={20} color="#131313" />
             </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

export default BiometricsScreen;
