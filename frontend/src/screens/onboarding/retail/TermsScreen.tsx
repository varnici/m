import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ShieldCheck, CircleCheckBig, ArrowRight, Gavel, FileText } from 'lucide-react-native';
import { useOnboarding } from '../../../context/OnboardingContext';

const TermsScreen = () => {
  const navigation = useNavigation<any>();
  const { data, updateData } = useOnboarding();
  const [accepted, setAccepted] = useState(data.termsAccepted || false);

  const handleContinue = () => {
    updateData({ termsAccepted: accepted, timestamp: new Date().toISOString() });
    navigation.navigate('OnboardingActivation');
  };

  const sections = [
    {
      title: "1. DATA SOVEREIGNTY",
      content: "By initializing this handshake, you grant VentureRoot encrypted access to your trade logs, institutional banking data (via licensed nodes), and store metadata. All data is processed using sovereign digital signatures and never sold to third-tier aggregators."
    },
    {
      title: "2. RISK ENGINE PARAMETERS",
      content: "Credit lines are dynamic. The Root Engine calculates limits based on real-time inventory scans and verified commercial turnover. Failure to maintain scan frequency may result in temporary line compression."
    },
    {
      title: "3. COMPLIANCE OBLIGATION",
      content: "You certify that all provided identifiers (NIN, Bank ID, Shop Photos) are authentic. Submission of fraudulent metadata will result in permanent blacklist from the institutional credit network and reporting to the CRC."
    },
    {
      title: "4. REPAYMENT PROTOCOL",
      content: "The Root Engine is authorized to initiate repayment sweeps from the linked settlement node for overdue balances after the mandatory 48-hour grace period window."
    }
  ];

  return (
    <SafeAreaView className="flex-1 bg-ventureroot-industrial-background">
      <StatusBar barStyle="light-content" />
      
      <View className="flex-1 px-8 pt-12 pb-10">
        {/* Monolith Header */}
        <View className="mb-10">
          <Text className="text-ventureroot-industrial-primary text-[10px] font-black tracking-[4px] mb-3 uppercase">
            Legal Interface
          </Text>
          <Text className="text-ventureroot-industrial-onSurface text-5xl font-black leading-[54px] tracking-tighter">
            THE ROOT{"\n"}CONTRACT
          </Text>
          <View className="w-16 h-1.5 bg-ventureroot-industrial-primary mt-8" />
        </View>

        {/* Contract Scroller */}
        <View className="flex-1 bg-ventureroot-industrial-surfaceLow mb-10 overflow-hidden">
          <ScrollView className="p-8" showsVerticalScrollIndicator={false}>
            <View className="flex-row items-center mb-10 pb-6 border-b border-ventureroot-industrial-surfaceHigh">
               <View className="w-12 h-12 bg-ventureroot-industrial-surfaceHigh items-center justify-center mr-5">
                 <Gavel size={22} color="#27AE60" />
               </View>
               <View>
                 <Text className="text-ventureroot-industrial-onSurface font-black text-sm uppercase tracking-tight">Master Agreement</Text>
                 <Text className="text-ventureroot-industrial-primary text-[9px] tracking-[2px] font-black uppercase mt-1">V2.4 INDUSTRIAL RELEASE</Text>
               </View>
            </View>

            {sections.map((section, index) => (
              <View key={index} className="mb-10">
                <Text className="text-ventureroot-industrial-onSurface font-black text-xs mb-3 tracking-widest">{section.title}</Text>
                <Text className="text-ventureroot-industrial-onSurface/50 text-[11px] leading-5 font-medium">
                  {section.content}
                </Text>
              </View>
            ))}
            
            <View className="h-10" />
          </ScrollView>

          {/* Consent Selection */}
          <TouchableOpacity 
            onPress={() => setAccepted(!accepted)}
            activeOpacity={0.9}
            className={`p-8 flex-row items-center ${accepted ? 'bg-ventureroot-industrial-surfaceHighest' : 'bg-ventureroot-industrial-surfaceHigh'}`}
          >
            <View className={`w-8 h-8 items-center justify-center border-4 ${
              accepted ? 'bg-ventureroot-industrial-primary border-ventureroot-industrial-primary' : 'border-ventureroot-industrial-surfaceHighest bg-ventureroot-industrial-background'
            }`}>
              {accepted && <CircleCheckBig size={18} color="#131313" />}
            </View>
            <Text className={`text-[10px] font-black tracking-[2px] ml-5 uppercase ${accepted ? 'text-ventureroot-industrial-onSurface' : 'text-ventureroot-industrial-onSurface opacity-30'}`}>
              Accept Master Protocol Terms
            </Text>
          </TouchableOpacity>
        </View>

        {/* Action Button */}
        <TouchableOpacity 
          onPress={handleContinue}
          disabled={!accepted}
          activeOpacity={0.8}
          className={`h-22 flex-row items-center justify-center px-10 ${
            accepted ? 'bg-ventureroot-industrial-primary' : 'bg-ventureroot-industrial-surfaceHigh'
          }`}
        >
          <Text className={`font-black text-lg mr-4 uppercase tracking-tighter ${
            accepted ? 'text-ventureroot-industrial-background' : 'text-ventureroot-industrial-onSurface opacity-20'
          }`}>
            Bind Agreement
          </Text>
          <ArrowRight size={26} color={accepted ? "#131313" : "#2A2A2A"} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default TermsScreen;
