import React, { useState } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, StatusBar, Dimensions } from 'react-native';
import type { RootStackScreenProps } from '@/navigation/types';
import { useOnboarding } from '../../../context/OnboardingContext';
import { Camera, UserCheck, ShieldCheck, ArrowRight, Scan } from 'lucide-react-native';

const { width } = Dimensions.get('window');

const FaceVerificationScreen = ({
  navigation,
}: RootStackScreenProps<'OnboardingFaceVerification'>) => {
  const { data, updateData } = useOnboarding();
  const [isCapturing, setIsCapturing] = useState(false);
  const [isCaptured, setIsCaptured] = useState(false);

  const handleCapture = () => {
    setIsCapturing(true);
    // Simulate industrial depth scan
    setTimeout(() => {
      setIsCapturing(false);
      setIsCaptured(true);
      updateData({ faceMatchConfidence: 98 });
    }, 2500);
  };

  const handleContinue = () => {
    navigation.navigate('OnboardingBankLink');
  };

  return (
    <SafeAreaView className="flex-1 bg-ventureroot-industrial-background">
      <StatusBar barStyle="light-content" />
      
      <View className="flex-1 px-8 pt-12 pb-10">
        {/* Monolith Header */}
        <View className="mb-12">
          <Text className="text-ventureroot-industrial-primary text-[10px] font-black tracking-[4px] mb-3 uppercase">
            Biometric Security
          </Text>
          <Text className="text-ventureroot-industrial-onSurface text-5xl font-black leading-[54px] tracking-tighter">
            FACE ID{"\n"}VERIFY
          </Text>
          <View className="w-16 h-1.5 bg-ventureroot-industrial-primary mt-8" />
        </View>

        <Text className="text-ventureroot-industrial-onSurface text-base font-medium opacity-50 mb-12 leading-7">
          Position your face within the industrial perimeter. This confirms your identity for high-tier institutional trade credit.
        </Text>

        {/* Industrial Viewport */}
        <View className="flex-1 items-center justify-center">
            <View className={`w-80 h-80 rounded-full items-center justify-center overflow-hidden bg-ventureroot-industrial-surfaceLow shadow-2xl ${
                isCaptured ? 'border-4 border-ventureroot-industrial-primary' : 'border-4 border-ventureroot-industrial-surfaceHigh'
            }`}>
              {/* Scan Overlay */}
              <View className="absolute inset-0 bg-ventureroot-industrial-surfaceLow items-center justify-center">
                 {!isCaptured && (
                    <Scan size={80} color="#27AE60" opacity={0.15} />
                 )}
                 {isCaptured && (
                    <View className="items-center">
                         <UserCheck size={100} color="#27AE60" />
                         <View className="bg-ventureroot-industrial-primary px-4 py-1.5 mt-6">
                            <Text className="text-ventureroot-industrial-background font-black text-[10px] uppercase tracking-widest">Trust Established</Text>
                         </View>
                    </View>
                 )}
              </View>

              {/* Scanning Ray */}
              {isCapturing && (
                 <View className="absolute inset-0 items-center justify-center">
                    <View className="w-full h-1 bg-ventureroot-industrial-primary/40 absolute" style={{ bottom: '20%' }} /> 
                    <Text className="text-ventureroot-industrial-primary font-black uppercase tracking-[5px] text-xs">Scanning Depth...</Text>
                 </View>
              )}
            </View>

            <View className="mt-10 flex-row items-center bg-ventureroot-industrial-surfaceHigh px-6 py-4">
                <ShieldCheck size={18} color="#27AE60" />
                <Text className="text-ventureroot-industrial-onSurface text-[9px] font-black uppercase tracking-[3px] ml-4 opacity-70">Liveness Analysis: Active</Text>
            </View>
        </View>

        {/* Action Buttons */}
        <View className="mt-16">
          {!isCaptured ? (
             <View className="items-center">
               <TouchableOpacity
                  onPress={handleCapture}
                  disabled={isCapturing}
                  activeOpacity={0.9}
                  className="h-24 w-24 rounded-full bg-ventureroot-industrial-surfaceLow items-center justify-center border-8 border-ventureroot-industrial-surfaceHigh mb-8"
               >
                  <View className={`w-14 h-14 rounded-full ${isCapturing ? 'bg-ventureroot-industrial-surfaceHighest' : 'bg-ventureroot-industrial-primary'} items-center justify-center`}>
                      <Camera size={28} color={isCapturing ? "#27AE60" : "#131313"} />
                  </View>
               </TouchableOpacity>

               <TouchableOpacity 
                  onPress={() => navigation.navigate('OnboardingBankLink')}
                  activeOpacity={0.7}
                  className="h-14 w-full border border-white/10 items-center justify-center"
               >
                  <Text className="text-white/40 font-black text-[10px] tracking-[3px] uppercase">Skip_Biometrics</Text>
               </TouchableOpacity>
             </View>
          ) : (
             <TouchableOpacity
                onPress={handleContinue}
                className="h-20 bg-ventureroot-industrial-primary flex-row items-center justify-center px-10"
                activeOpacity={0.8}
             >
                <Text className="text-ventureroot-industrial-background font-black text-xl mr-3 uppercase tracking-tighter">
                  Authorize & Continue
                </Text>
                <ArrowRight size={24} color="#131313" />
             </TouchableOpacity>
          )}
        </View>

      </View>
    </SafeAreaView>
  );
};

export default FaceVerificationScreen;
