import React, { useState } from 'react';
import { View, ScrollView, StatusBar, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RootStackScreenProps } from '@/navigation/types';
import { Camera, Mic, ArrowRight, History, Lightbulb, Sparkles, Database, AudioLines } from 'lucide-react-native';
import { useOnboarding } from '../../../context/OnboardingContext';
import { colors } from '../../../theme/colors';
import { IndustrialCard, IndustrialText } from '../../../components/ui/IndustrialComponents';

const InventorySnapshotScreen = ({
  navigation,
}: RootStackScreenProps<'OnboardingInventory'>) => {
  const { data, updateData } = useOnboarding();
  const [isScanning, setIsScanning] = useState(false);
  const [valuing, setValuing] = useState(false);
  const [value, setValue] = useState(data.estimatedInventoryValue?.toString() || '0');

  const voiceLogs = [
    { id: 1, text: "Industrial Filter Hubs", sub: "Warehouse A-12", value: "+120 units", status: "VERIFIED" },
    { id: 2, text: "Hydraulic Fluid (Synthetic)", sub: "Zone B", value: "+45 cases", status: "SYNCED" }
  ];

  const handleScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      setValue("842,500");
    }, 2000);
  };

  const handleSkip = () => {
    navigation.navigate('OnboardingTaxCompliance');
  };

  const handleContinue = () => {
    updateData({ estimatedInventoryValue: parseFloat(value.replace(/,/g, '')) || 0 });
    navigation.navigate('OnboardingTaxCompliance');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#131313' }}>
      <StatusBar barStyle="light-content" />
      
      <ScrollView contentContainerStyle={{ paddingHorizontal: 32, paddingTop: 60, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        {/* Header Section */}
        <View style={{ marginBottom: 48 }}>
          <IndustrialText variant="label" style={{ color: colors.ventureroot.industrial.primary, letterSpacing: 4, marginBottom: 12 }}>
            REAL-TIME_ASSET_SYNC
          </IndustrialText>
          <IndustrialText variant="h1" style={{ fontSize: 42, lineHeight: 48 }}>
            INVENTORY{"\n"}QUANTUM
          </IndustrialText>
          <View style={{ width: 40, height: 4, backgroundColor: colors.ventureroot.industrial.primary, marginTop: 24, marginBottom: 24 }} />
          <IndustrialText style={{ opacity: 0.4, fontSize: 13, lineHeight: 20 }}>
            Initialize neural vision or voice-to-text protocols to synchronize your physical assets with the Root Engine.
          </IndustrialText>
        </View>

        {/* AI Entry Points Selection */}
        <View style={{ gap: 16, marginBottom: 48 }}>
          
          {/* AI Shelf Scan (RAG Inspired) */}
          <TouchableOpacity 
            onPress={handleScan}
            disabled={isScanning}
            activeOpacity={0.8}
            style={{ 
              backgroundColor: isScanning ? 'rgba(39, 174, 96, 0.1)' : 'rgba(255,255,255,0.03)',
              padding: 24,
              borderWidth: 1,
              borderColor: isScanning ? colors.ventureroot.industrial.primary : 'rgba(255,255,255,0.05)'
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
               <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                 <Database size={18} color={colors.ventureroot.industrial.primary} />
                 <IndustrialText style={{ fontWeight: '900', fontSize: 14, marginLeft: 12, letterSpacing: 1 }}>AI_SHELF_SCAN (RAG)</IndustrialText>
               </View>
               {isScanning ? <ActivityIndicator size="small" color={colors.ventureroot.industrial.primary} /> : <Camera size={20} color="rgba(255,255,255,0.2)" />}
            </View>
            <IndustrialText style={{ opacity: 0.3, fontSize: 11, lineHeight: 16 }}>
              Point camera at shelving units. AI models will identify SKUs, volumes, and shelf health in real-time.
            </IndustrialText>
          </TouchableOpacity>

          {/* Talk & Stock (Voice-to-Text) */}
          <TouchableOpacity 
            activeOpacity={0.8}
            style={{ 
              backgroundColor: 'rgba(255,255,255,0.03)',
              padding: 24,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.05)'
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
               <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                 <AudioLines size={18} color={colors.ventureroot.industrial.primary} />
                 <IndustrialText style={{ fontWeight: '900', fontSize: 14, marginLeft: 12, letterSpacing: 1 }}>TALK & STOCK</IndustrialText>
               </View>
               <Mic size={20} color="rgba(255,255,255,0.2)" />
            </View>
            <IndustrialText style={{ opacity: 0.3, fontSize: 11, lineHeight: 16 }}>
              Voice-to-Text protocol. Speak item names and quantities for rapid sequential logging.
            </IndustrialText>
          </TouchableOpacity>
        </View>

        {/* Real-time Result Hub */}
        <View style={{ marginBottom: 48 }}>
           <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
             <Sparkles size={14} color={colors.ventureroot.industrial.primary} style={{ marginRight: 12 }} />
             <IndustrialText variant="label" style={{ letterSpacing: 2 }}>NEURAL_OUTPUT_STREAM</IndustrialText>
           </View>

           <View style={{ backgroundColor: 'rgba(255,255,255,0.02)', padding: 32, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' }}>
              <IndustrialText style={{ opacity: 0.3, fontSize: 10, marginBottom: 8, letterSpacing: 1 }}>VALUATION_ESTIMATE (₦)</IndustrialText>
              <IndustrialText style={{ fontSize: 48, fontWeight: '900', letterSpacing: -2 }}>
                {value === '0' ? '---,---' : value}
              </IndustrialText>
              <View style={{ height: 1, width: '100%', backgroundColor: 'rgba(255,255,255,0.05)', marginVertical: 20 }} />
              <IndustrialText style={{ color: colors.ventureroot.industrial.primary, fontSize: 10, fontWeight: '900', letterSpacing: 1 }}>
                CONFIDENCE_LEVEL: 98.4%
              </IndustrialText>
           </View>
        </View>

        {/* Final Action */}
        <TouchableOpacity 
          onPress={handleContinue}
          activeOpacity={0.8}
          style={{ 
            height: 72, 
            backgroundColor: value !== '0' ? colors.ventureroot.industrial.primary : 'rgba(255,255,255,0.05)',
            flexDirection: 'row', 
            alignItems: 'center', 
            justifyContent: 'center'
          }}
        >
          <IndustrialText style={{ 
            color: value !== '0' ? '#131313' : 'rgba(255,255,255,0.2)', 
            fontWeight: '900', 
            letterSpacing: -0.5,
            fontSize: 18,
            marginRight: 10
          }}>
            AUTHORIZE ASSET LOG
          </IndustrialText>
          <ArrowRight size={22} color={value !== '0' ? "#131313" : "rgba(255,255,255,0.1)"} />
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={handleSkip}
          activeOpacity={0.7}
          style={{ 
            marginTop: 24,
            height: 56,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.05)',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <IndustrialText style={{ color: 'rgba(255,255,255,0.3)', fontWeight: '900', fontSize: 10, letterSpacing: 3 }}>
            SKIP_SNAPSHOT_FOR_NOW
          </IndustrialText>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
};

export default InventorySnapshotScreen;
