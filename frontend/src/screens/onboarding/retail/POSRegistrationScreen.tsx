import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import OnboardingShell, { OnboardingButton, OnboardingInput } from '@/components/onboarding/OnboardingShell';
import { useOnboardingNav } from '@/hooks/useOnboardingNav';
import { Smartphone, Plus, Clock } from 'lucide-react-native';
import { colors } from '@/theme/colors';

type POSOption = 'registered' | 'register_now' | 'no_pos';

const POSRegistrationScreen = () => {
  const { goNext, goBack, step, total } = useOnboardingNav();
  const [option, setOption] = useState<POSOption | null>(null);
  const [terminalId, setTerminalId] = useState('');

  const canContinue =
    option === 'no_pos' ||
    option === 'register_now' ||
    (option === 'registered' && terminalId.trim().length >= 6);

  const handleContinue = () => {
    goNext({ posOption: option, posTerminalId: option === 'registered' ? terminalId : undefined });
  };

  const options: { id: POSOption; icon: any; title: string; desc: string }[] = [
    {
      id: 'registered',
      icon: Smartphone,
      title: 'Already registered',
      desc: 'I have a VentureRoot Layer 2 terminal or POS.',
    },
    {
      id: 'register_now',
      icon: Plus,
      title: 'Register now',
      desc: 'I want to register my POS with VentureRoot.',
    },
    {
      id: 'no_pos',
      icon: Clock,
      title: 'I don\'t have a registered POS',
      desc: 'I\'ll be placed on a waitlist. My account will be in "Pending" state.',
    },
  ];

  return (
    <OnboardingShell
      currentStep={step}
      totalSteps={total}
      title="POS System Linkage"
      subtitle="To appear on the VentureRoot investment marketplace, your business needs an active POS or inventory tracking system."
      onBack={goBack}
      footer={
        <OnboardingButton title="Continue" onPress={handleContinue} disabled={!canContinue} />
      }
    >
      <View style={{ gap: 10, marginBottom: 20 }}>
        {options.map((opt) => {
          const isSelected = option === opt.id;
          const Icon = opt.icon;
          return (
            <TouchableOpacity
              key={opt.id}
              onPress={() => setOption(opt.id)}
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

      {option === 'registered' && (
        <OnboardingInput
          label="TERMINAL SERIAL NUMBER"
          value={terminalId}
          onChangeText={setTerminalId}
          placeholder="Enter your terminal serial number"
          helper="Your terminal serial number is printed on the back of your POS device."
        />
      )}

      {option === 'register_now' && (
        <View style={{ backgroundColor: '#EFF6FF', borderRadius: 12, padding: 16 }}>
          <Text style={{ fontSize: 13, color: '#1E40AF', lineHeight: 20, fontWeight: '500' }}>
            A VentureRoot field agent will be dispatched within 3 business days to complete
            your POS registration. You can continue setting up your account in the meantime.
          </Text>
        </View>
      )}

      {option === 'no_pos' && (
        <View style={{ backgroundColor: '#FEF3C7', borderRadius: 12, padding: 16 }}>
          <Text style={{ fontSize: 13, color: '#92400E', lineHeight: 20 }}>
            Your account will be created in "Pending" state. You cannot appear on the
            marketplace until Layer 2 registration is complete. You can track your
            registration status from the app.
          </Text>
        </View>
      )}
    </OnboardingShell>
  );
};

export default POSRegistrationScreen;
