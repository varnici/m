import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import OnboardingShell, { OnboardingButton } from '@/components/onboarding/OnboardingShell';
import { useOnboardingNav } from '@/hooks/useOnboardingNav';
import { colors } from '@/theme/colors';

const TIERS = [
  { id: 'TIER_1', title: 'Standard Growth', range: '₦50k - ₦250k', desc: 'Baseline commercial velocity' },
  { id: 'TIER_2', title: 'Industrial Scaling', range: '₦250k - ₦1M', desc: 'Accelerated trade volume' },
  { id: 'TIER_3', title: 'Institutional Flow', range: '₦1M+', desc: 'Maximum deployment capacity' },
];

const SalesEstimationScreen = () => {
  const { goNext, goBack, step, total, data } = useOnboardingNav();
  const [selectedTier, setSelectedTier] = useState<string | null>(data.salesTier || null);

  return (
    <OnboardingShell
      currentStep={step}
      totalSteps={total}
      title="Sales Estimation"
      subtitle="Select your projected monthly commercial turnover for limit calibration."
      onBack={goBack}
      footer={
        <OnboardingButton
          title="Continue"
          onPress={() => goNext({ salesTier: selectedTier })}
          disabled={!selectedTier}
        />
      }
    >
      {TIERS.map((tier) => {
        const isSelected = selectedTier === tier.id;
        return (
          <TouchableOpacity
            key={tier.id}
            onPress={() => setSelectedTier(tier.id)}
            activeOpacity={0.7}
            style={{
              backgroundColor: isSelected ? '#F0FDF4' : '#FFFFFF',
              borderWidth: 1.5,
              borderColor: isSelected ? colors.ventureroot.green : '#E2E8F0',
              borderRadius: 12,
              padding: 20,
              marginBottom: 12,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#0F172A' }}>{tier.title}</Text>
              {isSelected && (
                <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: colors.ventureroot.green, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>{'✓'}</Text>
                </View>
              )}
            </View>
            <Text style={{ fontSize: 18, fontWeight: '800', color: colors.ventureroot.green, marginBottom: 4 }}>
              {tier.range}
            </Text>
            <Text style={{ fontSize: 13, color: '#64748B' }}>{tier.desc}</Text>
          </TouchableOpacity>
        );
      })}

      <View style={{ backgroundColor: '#F8FAFC', borderRadius: 10, padding: 16, marginTop: 8, flexDirection: 'row', alignItems: 'center' }}>
        <Text style={{ fontSize: 13, color: '#64748B', flex: 1 }}>
          Selected tier will initialize your baseline credit line. You can update this later.
        </Text>
      </View>
    </OnboardingShell>
  );
};

export default SalesEstimationScreen;
