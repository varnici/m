import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ShieldCheck, User, Store, Landmark, ChevronRight } from 'lucide-react-native';
import { useOnboarding } from '../../../context/OnboardingContext';
import { colors, spacing } from '../../../theme/colors';
import { IndustrialCard, IndustrialButton, IndustrialText } from '../../../components/ui/IndustrialComponents';

const OnboardingReviewScreen = () => {
  const navigation = useNavigation<any>();
  const { data } = useOnboarding();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    // Simulate API Submission
    setTimeout(() => {
      setIsSubmitting(false);
      navigation.navigate('OnboardingTerms');
    }, 2500);
  };

  const SummaryNode = ({ icon: Icon, title, dataPoints }: any) => (
    <View style={{ marginBottom: spacing.xl }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
        <Icon size={14} color={colors.ventureroot.industrial.primary} style={{ marginRight: spacing.xs }} />
        <IndustrialText variant="label" style={{ letterSpacing: 2 }}>{title}</IndustrialText>
      </View>
      <IndustrialCard variant="low" style={{ padding: 0 }}>
        {dataPoints.map((item: any, index: number) => (
          <View 
            key={index} 
            style={{ 
              flexDirection: 'row', 
              justifyContent: 'space-between', 
              paddingVertical: spacing.md, 
              paddingHorizontal: spacing.lg,
              borderBottomWidth: index !== dataPoints.length - 1 ? 1 : 0,
              borderBottomColor: colors.ventureroot.industrial.surfaceHigh
            }}
          >
            <IndustrialText style={{ fontSize: 12, opacity: 0.4 }}>{item.label}</IndustrialText>
            <IndustrialText style={{ fontSize: 12, fontWeight: '700', color: !item.value ? colors.ventureroot.industrial.primary : colors.ventureroot.industrial.onSurface }}>
              {item.value || 'COMPLETE_LATER'}
            </IndustrialText>
          </View>
        ))}
      </IndustrialCard>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.ventureroot.industrial.background }}>
      <StatusBar barStyle="light-content" />
      
      <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 40 }}>
        {/* Monolith Header */}
        <View style={{ marginBottom: 40 }}>
          <IndustrialText variant="label" style={{ color: colors.ventureroot.industrial.primary, marginBottom: 8 }}>
            PROTOCOL FINALIZATION
          </IndustrialText>
          <IndustrialText variant="h1">
            APPLICATION{"\n"}REVIEW
          </IndustrialText>
          <View style={{ width: 40, height: 4, backgroundColor: colors.ventureroot.industrial.primary, marginTop: 16 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
          <SummaryNode 
            icon={User} 
            title="INDIVIDUAL_IDENTITY" 
            dataPoints={[
              { label: 'LEGAL NAME', value: data.fullName },
              { label: 'PHONE / EMAIL', value: data.phoneOrEmail },
              { label: 'KYC STATUS', value: data.idNumber ? 'LEVEL_2_VERIFIED' : 'LEVEL_1_LITE' },
            ]} 
          />

          <SummaryNode 
            icon={Store} 
            title="COMMERCIAL_NODE" 
            dataPoints={[
              { label: 'ENTITY NAME', value: data.businessName },
              { label: 'MARKET SECTOR', value: data.primaryCategory },
              { label: 'OPERATION BASE', value: data.state },
            ]} 
          />

          <SummaryNode 
            icon={Landmark} 
            title="FINANCIAL_HANDSHAKE" 
            dataPoints={[
              { label: 'SETTLEMENT NODE', value: data.bankName },
              { label: 'DIRECT DEBIT', value: 'AUTHORIZED' },
              { label: 'TAX ID (TIN)', value: data.tin || 'PENDING_REG' },
            ]} 
          />

          {/* Integrity Alert */}
          <View style={{ 
            backgroundColor: colors.ventureroot.industrial.surfaceLow, 
            padding: 20, 
            flexDirection: 'row', 
            alignItems: 'center',
            marginBottom: 40
          }}>
             <ShieldCheck size={20} color={colors.ventureroot.industrial.primary} />
             <View style={{ marginLeft: 16 }}>
                <IndustrialText style={{ fontSize: 11, fontWeight: '900' }}>INTEGRITY SEAL ACTIVE</IndustrialText>
                <IndustrialText style={{ fontSize: 9, opacity: 0.4, marginTop: 2 }}>
                  SIGNED: {new Date().toLocaleTimeString()} • SHA-256 SYNC
                </IndustrialText>
             </View>
          </View>

          {isSubmitting ? (
            <View style={{ height: 64, alignItems: 'center', justifyContent: 'center' }}>
               <ActivityIndicator color={colors.ventureroot.industrial.primary} />
               <IndustrialText variant="label" style={{ marginTop: 16, fontSize: 9 }}>TRANSMITTING PROTOCOL...</IndustrialText>
            </View>
          ) : (
            <IndustrialButton 
              title="BIND PROFILE & FINISH" 
              onPress={handleSubmit}
            />
          )}
          
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            style={{ marginTop: 24, padding: 16, alignItems: 'center' }}
          >
            <IndustrialText variant="label" style={{ opacity: 0.3 }}>ADJUST_INFORMATION</IndustrialText>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

export default OnboardingReviewScreen;

