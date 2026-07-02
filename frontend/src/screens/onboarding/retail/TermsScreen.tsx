import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import OnboardingShell, { OnboardingButton } from '@/components/onboarding/OnboardingShell';
import { useOnboardingNav } from '@/hooks/useOnboardingNav';
import { colors } from '@/theme/colors';

const TERMS_SECTIONS = [
  {
    title: '1. Data Privacy',
    content:
      'By accepting these terms, you grant VentureRoot access to your business data, banking information (via secure providers), and store metadata. Your data is protected and never sold to third parties.',
  },
  {
    title: '2. Credit Terms',
    content:
      'Credit limits are dynamic and based on your real-time inventory and sales turnover. Maintaining accurate records ensures you stay eligible for the best rates.',
  },
  {
    title: '3. Compliance',
    content:
      'You certify that all provided documents (NIN, Bank ID, Shop Photos) are authentic. Providing false information will result in immediate account suspension.',
  },
  {
    title: '4. Repayment',
    content:
      'VentureRoot is authorized to initiate repayments for overdue balances from your linked bank account after the standard 48-hour grace period.',
  },
];

const TermsScreen = () => {
  const { goNext, goBack, step, total, data } = useOnboardingNav();
  const [accepted, setAccepted] = useState(data.termsAccepted || false);

  return (
    <OnboardingShell
      currentStep={step}
      totalSteps={total}
      title="Terms & Conditions"
      subtitle="Please read and accept the terms to continue."
      onBack={goBack}
      scrollable={false}
      footer={
        <OnboardingButton
          title="Continue"
          onPress={() => goNext({ termsAccepted: true, timestamp: new Date().toISOString() })}
          disabled={!accepted}
        />
      }
    >
      <View
        style={{
          flex: 1,
          backgroundColor: '#FFFFFF',
          borderRadius: 12,
          borderWidth: 1,
          borderColor: '#E2E8F0',
          overflow: 'hidden',
          marginBottom: 16,
        }}
      >
        <ScrollView style={{ padding: 20 }} showsVerticalScrollIndicator={false}>
          <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A', marginBottom: 20 }}>
            Terms and Conditions
          </Text>

          {TERMS_SECTIONS.map((section, index) => (
            <View key={index} style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#0F172A', marginBottom: 6 }}>
                {section.title}
              </Text>
              <Text style={{ fontSize: 13, color: '#64748B', lineHeight: 20 }}>
                {section.content}
              </Text>
            </View>
          ))}

          <View style={{ height: 20 }} />
        </ScrollView>

        <TouchableOpacity
          onPress={() => setAccepted(!accepted)}
          activeOpacity={0.7}
          style={{
            padding: 16,
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: accepted ? '#F0FDF4' : '#F8FAFC',
            borderTopWidth: 1,
            borderTopColor: '#E2E8F0',
          }}
        >
          <View
            style={{
              width: 24,
              height: 24,
              borderRadius: 4,
              borderWidth: 2,
              borderColor: accepted ? colors.ventureroot.green : '#CBD5E1',
              backgroundColor: accepted ? colors.ventureroot.green : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 12,
            }}
          >
            {accepted && <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>{'✓'}</Text>}
          </View>
          <Text style={{ fontSize: 14, fontWeight: '600', color: accepted ? '#0F172A' : '#64748B' }}>
            I have read and agree to the terms
          </Text>
        </TouchableOpacity>
      </View>
    </OnboardingShell>
  );
};

export default TermsScreen;
