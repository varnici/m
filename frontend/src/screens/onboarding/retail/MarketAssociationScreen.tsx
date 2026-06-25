import React, { useState } from 'react';
import { View, Text, TouchableOpacity, useWindowDimensions } from 'react-native';
import OnboardingShell, { OnboardingButton, OnboardingInput } from '@/components/onboarding/OnboardingShell';
import { useOnboardingNav } from '@/hooks/useOnboardingNav';
import { ShieldCheck, Users, AlertCircle } from 'lucide-react-native';
import { colors } from '@/theme/colors';

type AssociationMethod = 'token' | 'endorsement' | 'not_registered';

const MarketAssociationScreen = () => {
  const { goNext, goBack, step, total } = useOnboardingNav();
  const [method, setMethod] = useState<AssociationMethod | null>(null);
  const [token, setToken] = useState('');
  const [endorsementId, setEndorsementId] = useState('');

  const canContinue =
    method === 'not_registered' ||
    (method === 'token' && token.trim().length >= 4) ||
    (method === 'endorsement' && endorsementId.trim().length === 12);

  const handleContinue = () => {
    goNext({
      marketAssociationMethod: method,
      marketAssociationToken: method === 'token' ? token.trim() : undefined,
      leaderEndorsementId: method === 'endorsement' ? endorsementId.trim() : undefined,
    });
  };

  const options: { id: AssociationMethod; icon: any; title: string; desc: string }[] = [
    {
      id: 'token',
      icon: ShieldCheck,
      title: 'Market Association Token',
      desc: 'I have a membership token/number from my market association.',
    },
    {
      id: 'endorsement',
      icon: Users,
      title: 'Leader Endorsement ID',
      desc: 'My market leader has given me a 12-character VentureRoot endorsement ID.',
    },
    {
      id: 'not_registered',
      icon: AlertCircle,
      title: 'My market is not yet registered',
      desc: 'I\'ll be placed on a waitlist for future partnership outreach.',
    },
  ];

  return (
    <OnboardingShell
      currentStep={step}
      totalSteps={total}
      title="Market Association"
      subtitle="Select how your market association verifies your membership."
      onBack={goBack}
      footer={
        <OnboardingButton title="Continue" onPress={handleContinue} disabled={!canContinue} />
      }
    >
      <View style={{ gap: 10, marginBottom: 20 }}>
        {options.map((opt) => {
          const isSelected = method === opt.id;
          const Icon = opt.icon;
          return (
            <TouchableOpacity
              key={opt.id}
              onPress={() => setMethod(opt.id)}
              activeOpacity={0.7}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                padding: 16,
                borderRadius: 14,
                backgroundColor: isSelected ? '#F0FDF4' : '#FFFFFF',
                borderWidth: 1.5,
                borderColor: isSelected ? colors.ventureroot.green : '#E2E8F0',
                gap: 14,
              }}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  backgroundColor: isSelected ? colors.ventureroot.green : '#F1F5F9',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon size={20} color={isSelected ? '#FFF' : '#64748B'} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#0F172A', marginBottom: 2 }}>
                  {opt.title}
                </Text>
                <Text style={{ fontSize: 12, color: '#64748B', lineHeight: 17 }}>{opt.desc}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {method === 'token' && (
        <OnboardingInput
          label="ASSOCIATION TOKEN NUMBER"
          value={token}
          onChangeText={setToken}
          placeholder="Enter your membership token"
          helper="Not sure of your token? Contact your association's secretary or check your membership card."
        />
      )}

      {method === 'endorsement' && (
        <OnboardingInput
          label="LEADER ENDORSEMENT ID"
          value={endorsementId}
          onChangeText={setEndorsementId}
          placeholder="12-character code"
          maxLength={12}
          helper="This is a 12-character code given to you by your market association leader."
        />
      )}

      {method === 'not_registered' && (
        <View
          style={{
            backgroundColor: '#FEF3C7',
            borderRadius: 12,
            padding: 16,
          }}
        >
          <Text style={{ fontSize: 13, color: '#92400E', lineHeight: 20 }}>
            Your onboarding will continue, but marketplace listing requires market
            association registration. A VentureRoot agent will contact you.
          </Text>
        </View>
      )}
    </OnboardingShell>
  );
};

export default MarketAssociationScreen;
