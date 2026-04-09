import React, { useState } from 'react';
import { View, ScrollView, SafeAreaView, StatusBar, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { TrendingUp, BarChart3, Target, Zap } from 'lucide-react-native';
import { useOnboarding } from '../../../context/OnboardingContext';
import { colors, spacing } from '../../../theme/colors';
import { IndustrialCard, IndustrialButton, IndustrialText } from '../../../components/ui/IndustrialComponents';

const SalesEstimationScreen = () => {
  const navigation = useNavigation<any>();
  const { data, updateData } = useOnboarding();
  const [selectedTier, setSelectedTier] = useState<string | null>(null);

  const tiers = [
    { id: 'TIER_1', title: 'Standard Growth', range: '₦50k - ₦250k', desc: 'Baseline commercial velocity' },
    { id: 'TIER_2', title: 'Industrial Scaling', range: '₦250k - ₦1M', desc: 'Accelerated trade volume' },
    { id: 'TIER_3', title: 'Institutional Flow', range: '₦1M+', desc: 'Maximum deployment capacity' }
  ];

  const handleContinue = () => {
    if (selectedTier) {
      updateData({ salesTier: selectedTier });
      navigation.navigate('OnboardingTaxCompliance');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.ventureroot.industrial.background }}>
      <StatusBar barStyle="light-content" />
      
      <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 40 }}>
        {/* Monolith Header */}
        <View style={{ marginBottom: 40 }}>
          <IndustrialText variant="label" style={{ color: colors.ventureroot.industrial.primary, marginBottom: 8 }}>
            REVENUE_PROJECTION_ENGINE
          </IndustrialText>
          <IndustrialText variant="h1">
            SALES{"\n"}ESTIMATION
          </IndustrialText>
          <IndustrialText style={{ marginTop: 12, opacity: 0.4, fontSize: 13 }}>
            Select your projected monthly commercial turnover for limit calibration.
          </IndustrialText>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
          {tiers.map((tier) => (
            <TouchableOpacity 
              key={tier.id}
              onPress={() => setSelectedTier(tier.id)}
              activeOpacity={0.9}
            >
              <IndustrialCard 
                variant={selectedTier === tier.id ? "high" : "low"} 
                style={{ 
                  marginBottom: spacing.md, 
                  borderLeftWidth: 4, 
                  borderLeftColor: selectedTier === tier.id ? colors.ventureroot.industrial.primary : 'transparent',
                  padding: 24
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <IndustrialText variant="h3">{tier.title}</IndustrialText>
                  {selectedTier === tier.id && <Zap size={14} color={colors.ventureroot.industrial.primary} />}
                </View>
                <IndustrialText style={{ fontSize: 18, fontWeight: '900', color: colors.ventureroot.industrial.primary, marginBottom: 4 }}>
                  {tier.range}
                </IndustrialText>
                <IndustrialText style={{ fontSize: 11, opacity: 0.4 }}>{tier.desc}</IndustrialText>
              </IndustrialCard>
            </TouchableOpacity>
          ))}

          {/* AI Intelligence Alert */}
          <View style={{ 
            backgroundColor: colors.ventureroot.industrial.surfaceLow, 
            padding: 20, 
            flexDirection: 'row', 
            alignItems: 'center',
            marginTop: 20,
            marginBottom: 40
          }}>
             <Target size={20} color={colors.ventureroot.industrial.primary} />
             <View style={{ marginLeft: 16 }}>
                <IndustrialText style={{ fontSize: 11, fontWeight: '900' }}>AI LIMIT CALIBRATION</IndustrialText>
                <IndustrialText style={{ fontSize: 9, opacity: 0.4, marginTop: 2 }}>
                  Selected tier will initialize your baseline Root Credit Line.
                </IndustrialText>
             </View>
          </View>

          <IndustrialButton 
            title="SAVE PROJECTION" 
            onPress={handleContinue}
            disabled={!selectedTier}
            style={{ height: 64 }}
          />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

export default SalesEstimationScreen;
