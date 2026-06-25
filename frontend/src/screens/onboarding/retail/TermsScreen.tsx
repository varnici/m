import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, useColorScheme, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RootStackScreenProps } from '@/navigation/types';
import { ShieldCheck, CheckCircle2, ArrowRight, Gavel, FileText } from 'lucide-react-native';
import { useOnboarding } from '../../../context/OnboardingContext';
import { colors, spacing } from '../../../theme/colors';
import { IndustrialText, IndustrialButton, useIndustrialTheme, IndustrialCard } from '../../../components/ui/IndustrialComponents';
import AppHeader from '@/components/ui/AppHeader';

const TermsScreen = ({
  navigation,
}: RootStackScreenProps<'OnboardingTerms'>) => {
  const { data, updateData } = useOnboarding();
  const [accepted, setAccepted] = useState(data.termsAccepted || false);
  const theme = useIndustrialTheme();
  const isDark = useColorScheme() === 'dark';

  const handleContinue = () => {
    updateData({ termsAccepted: accepted, timestamp: new Date().toISOString() });
    navigation.navigate('OnboardingActivation');
  };

  const sections = [
    {
      title: "1. DATA PRIVACY",
      content: "By accepting these terms, you grant VentureRoot access to your business data, banking information (via secure providers), and store metadata. Your data is protected and never sold to third parties."
    },
    {
      title: "2. CREDIT TERMS",
      content: "Credit limits are dynamic and based on your real-time inventory and sales turnover. Maintaining accurate records ensures you stay eligible for the best rates."
    },
    {
      title: "3. COMPLIANCE",
      content: "You certify that all provided documents (NIN, Bank ID, Shop Photos) are authentic. Providing false information will result in immediate account suspension."
    },
    {
      title: "4. REPAYMENT",
      content: "VentureRoot is authorized to initiate repayments for overdue balances from your linked bank account after the standard 48-hour grace period."
    }
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={['bottom', 'left', 'right']}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <AppHeader title="Terms & Conditions" variant="transparent" />
      <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 20, paddingBottom: 20 }}>
        {/* Header */}
        <View style={{ marginBottom: 40 }}>
          <IndustrialText variant="label" style={{ color: colors.ventureroot.industrial.primary, marginBottom: 8 }}>
            TERMS OF SERVICE
          </IndustrialText>
          <IndustrialText variant="h1">
            MASTER{"\n"}AGREEMENT
          </IndustrialText>
          <View style={{ width: 40, height: 4, backgroundColor: colors.ventureroot.industrial.primary, marginTop: 16 }} />
        </View>

        {/* Agreement Scroller */}
        <View style={{ flex: 1, backgroundColor: theme.surfaceLow, marginBottom: 32, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: theme.outline }}>
          <ScrollView style={{ padding: 24 }} showsVerticalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 32, paddingBottom: 24, borderBottomWidth: 1, borderBottomColor: theme.surfaceHigh }}>
               <View style={{ width: 48, height: 48, backgroundColor: theme.surfaceHigh, alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
                 <Gavel size={22} color={colors.ventureroot.industrial.primary} />
               </View>
               <View>
                 <IndustrialText style={{ fontWeight: '900', fontSize: 14 }}>TERMS AND CONDITIONS</IndustrialText>
                 <IndustrialText variant="label" style={{ fontSize: 9, marginTop: 4 }}>VERSION 2.4 - LATEST</IndustrialText>
               </View>
            </View>

            {sections.map((section, index) => (
              <View key={index} style={{ marginBottom: 32 }}>
                <IndustrialText style={{ fontWeight: '900', fontSize: 12, marginBottom: 8, letterSpacing: 1 }}>{section.title}</IndustrialText>
                <IndustrialText style={{ fontSize: 11, lineHeight: 20, opacity: 0.6 }}>
                  {section.content}
                </IndustrialText>
              </View>
            ))}
            
            <View style={{ height: 40 }} />
          </ScrollView>

          {/* Consent Selection */}
          <TouchableOpacity 
            onPress={() => setAccepted(!accepted)}
            activeOpacity={0.9}
            style={{ 
              padding: 24, 
              flexDirection: 'row', 
              alignItems: 'center', 
              backgroundColor: accepted ? theme.surfaceHighest : theme.surfaceHigh 
            }}
          >
            <View style={{ 
              width: 32, 
              height: 32, 
              alignItems: 'center', 
              justifyContent: 'center', 
              borderWidth: 2,
              borderColor: accepted ? colors.ventureroot.industrial.primary : theme.outline,
              backgroundColor: accepted ? colors.ventureroot.industrial.primary : 'transparent',
              borderRadius: 4
            }}>
              {accepted && <CheckCircle2 size={18} color="#131313" />}
            </View>
            <IndustrialText variant="label" style={{ marginLeft: 16, color: theme.onSurface, opacity: accepted ? 1 : 0.3 }}>
              I AGREE TO THE MASTER TERMS
            </IndustrialText>
          </TouchableOpacity>
        </View>

        {/* Action Button */}
        <IndustrialButton 
          title="CONTINUE" 
          onPress={handleContinue}
          disabled={!accepted}
        />
      </View>
    </SafeAreaView>
  );
};

export default TermsScreen;
