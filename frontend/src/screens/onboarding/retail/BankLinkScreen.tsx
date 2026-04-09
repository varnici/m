import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, SafeAreaView, StatusBar, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Landmark, ShieldCheck, ArrowRight, CircleCheckBig, Link, ChevronRight } from 'lucide-react-native';
import { useOnboarding } from '../../../context/OnboardingContext';

const BankLinkScreen = () => {
  const navigation = useNavigation<any>();
  const { data, updateData } = useOnboarding();
  const [isLinking, setIsLinking] = useState(false);
  const [isLinked, setIsLinked] = useState(data.bankLinked || false);
  const [selectedBank, setSelectedBank] = useState(data.bankName || '');

  const handleLinkBank = () => {
    setIsLinking(true);
    // Simulate industrial depth handshake
    setTimeout(() => {
      setIsLinking(false);
      setIsLinked(true);
      const bankName = 'Guaranty Trust Bank';
      setSelectedBank(bankName);
      updateData({ bankLinked: true, bankName: bankName });
    }, 2500);
  };

  const handleContinue = () => {
    navigation.navigate('OnboardingInventory');
  };

  return (
    <SafeAreaView className="flex-1 bg-ventureroot-industrial-background">
      <StatusBar barStyle="light-content" />
      
      <ScrollView contentContainerStyle={{ paddingHorizontal: 32, paddingTop: 60, paddingBottom: 40 }}>
        
        {/* Monolith Header */}
        <View className="mb-12">
          <Text className="text-ventureroot-industrial-primary text-[10px] font-black tracking-[4px] mb-3 uppercase">
            Financial Node
          </Text>
          <Text className="text-ventureroot-industrial-onSurface text-5xl font-black leading-[54px] tracking-tighter">
            BANKING{"\n"}HANDSHAKE
          </Text>
          <View className="w-16 h-1.5 bg-ventureroot-industrial-primary mt-8" />
        </View>

        {!isLinked ? (
          <View className="mb-12">
            <Text className="text-ventureroot-industrial-onSurface text-base font-medium opacity-50 mb-12 leading-7">
               Initiate a secure connection to your trade account. This allows the Root Engine to calculate your inventory lines and settlement thresholds.
            </Text>
            
            <TouchableOpacity 
              onPress={handleLinkBank}
              disabled={isLinking}
              activeOpacity={0.9}
              className="bg-ventureroot-industrial-surfaceLow p-10 items-center mb-8 relative"
            >
               {/* Ambient Depth Background Icon */}
               <View className="absolute right-[-20] bottom-[-20] opacity-5">
                  <Landmark size={180} color="#CFBFA6" />
               </View>

               <View className="w-20 h-20 bg-ventureroot-industrial-surfaceHigh items-center justify-center mb-8">
                {isLinking ? (
                  <ActivityIndicator color="#27AE60" />
                ) : (
                  <Link size={32} color="#27AE60" />
                )}
               </View>
              
               <Text className="text-ventureroot-industrial-onSurface text-2xl font-black uppercase tracking-tighter mb-2 text-center">Protocol Link</Text>
               <Text className="text-ventureroot-industrial-onSurface/40 text-center text-[10px] font-bold uppercase tracking-[2px] mb-10 px-6">
                 Secure Institutional Handshake
               </Text>

               <View className={`w-full h-16 items-center justify-center ${isLinking ? 'bg-ventureroot-industrial-surfaceHigh' : 'bg-ventureroot-industrial-primary'}`}>
                {isLinking ? (
                  <Text className="text-ventureroot-industrial-primary font-black uppercase tracking-[3px] text-[10px]">Encrypting Channel...</Text>
                ) : (
                  <View className="flex-row items-center">
                    <Text className="text-ventureroot-industrial-background font-black uppercase tracking-[3px] text-[12px] mr-3">Initialize Portal</Text>
                    <ArrowRight size={16} color="#131313" />
                  </View>
                )}
               </View>
            </TouchableOpacity>

            <View className="flex-row items-center bg-ventureroot-industrial-surfaceLow p-6">
              <ShieldCheck size={20} color="#27AE60" />
              <View className="ml-5 flex-1">
                <Text className="text-ventureroot-industrial-onSurface font-black text-[9px] tracking-[2px] uppercase mb-1">Vault Standard</Text>
                <Text className="text-ventureroot-industrial-onSurface/50 text-[10px] leading-4 font-medium">
                  We leverage 256-bit AES encryption. Auth tokens are ephemeral and never persisted in plain text.
                </Text>
              </View>
            </View>
          </View>
        ) : (
          <View className="mb-12 animate-in fade-in slide-in-from-bottom-5">
            <Text className="text-ventureroot-industrial-onSurface text-[10px] font-black uppercase tracking-[3px] mb-6 opacity-40 text-center">
              Active Connection
            </Text>

            <View className="bg-ventureroot-industrial-surfaceLow p-10 items-center">
              <View className="w-20 h-20 bg-ventureroot-industrial-primary items-center justify-center mb-6">
                <CircleCheckBig size={40} color="#131313" />
              </View>
              
              <Text className="text-ventureroot-industrial-onSurface text-2xl font-black uppercase tracking-tighter">BOND ESTABLISHED</Text>
              
              <View className="mt-10 w-full bg-ventureroot-industrial-surfaceHigh p-8 items-center">
                 <Text className="text-ventureroot-industrial-primary text-[9px] font-black uppercase tracking-[4px] mb-3">Institutional Node</Text>
                 <Text className="text-ventureroot-industrial-onSurface font-black text-xl uppercase tracking-tight text-center">{selectedBank}</Text>
                 <Text className="text-ventureroot-industrial-onSurface opacity-30 text-[10px] font-black tracking-[4px] mt-4 uppercase">Verification ID: 0012****4242</Text>
              </View>

              <TouchableOpacity onPress={() => setIsLinked(false)} className="mt-10 flex-row items-center">
                 <Text className="text-ventureroot-industrial-onSurface/40 font-black text-[9px] uppercase tracking-[3px]">Terminate Connection</Text>
                 <ChevronRight size={14} color="#2A2A2A" className="ml-2" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Global Progress Action */}
        <View className="mt-10">
          <TouchableOpacity 
            onPress={handleContinue}
            activeOpacity={0.8}
            className={`h-20 flex-row items-center justify-center px-10 ${
                isLinked ? 'bg-ventureroot-industrial-primary' : 'bg-ventureroot-industrial-surfaceHigh'
            }`}
          >
            <Text className={`font-black text-lg mr-4 uppercase tracking-tighter ${
                isLinked ? 'text-ventureroot-industrial-background' : 'text-ventureroot-industrial-onSurface opacity-40'
            }`}>
              {isLinked ? 'Advance To Inventory' : 'Continue Without Link'}
            </Text>
            <ArrowRight size={26} color={isLinked ? "#131313" : "#FFFFFF"} opacity={isLinked ? 1 : 0.4} />
          </TouchableOpacity>

          {!isLinked && (
            <TouchableOpacity 
              onPress={() => navigation.navigate('OnboardingInventory')}
              activeOpacity={0.7}
              className="mt-6 h-14 border border-white/10 items-center justify-center"
            >
              <Text className="text-white/40 font-black text-[10px] tracking-[3px] uppercase">Skip_For_Now</Text>
            </TouchableOpacity>
          )}
        </View>


      </ScrollView>
    </SafeAreaView>
  );
};

export default BankLinkScreen;
