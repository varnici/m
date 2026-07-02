import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import OnboardingShell, { OnboardingButton } from '@/components/onboarding/OnboardingShell';
import { useOnboardingNav } from '@/hooks/useOnboardingNav';
import { getEnabledTypes } from '@/config/accountTypes';
import { ChevronRight } from 'lucide-react-native';
import { colors } from '@/theme/colors';

const AccountTypeScreen = () => {
  const { goNext, goBack, step, total, data } = useOnboardingNav();
  const [selected, setSelected] = useState<string>(data.accountType || '');

  const enabledTypes = getEnabledTypes();

  return (
    <OnboardingShell
      currentStep={step}
      totalSteps={total}
      title="Account Type"
      subtitle="Select your operational mode to get started."
      onBack={goBack}
      footer={
        <OnboardingButton
          title="Continue"
          onPress={() => goNext({ accountType: selected })}
          disabled={!selected}
        />
      }
    >
      <Text
        style={{
          fontSize: 12,
          fontWeight: '700',
          color: '#475569',
          letterSpacing: 0.5,
          marginBottom: 16,
        }}
      >
        SELECT OPERATIONAL MODE
      </Text>

      <View style={{ gap: 12 }}>
        {enabledTypes.map((item) => {
          const isActive = selected === item.id;
          return (
            <TouchableOpacity
              key={item.id}
              onPress={() => setSelected(item.id)}
              activeOpacity={0.8}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                padding: 20,
                borderRadius: 14,
                backgroundColor: '#FFFFFF',
                borderWidth: isActive ? 2 : 1.5,
                borderColor: isActive ? colors.ventureroot.green : '#E2E8F0',
              }}
            >
              <View
                style={{
                  width: 52,
                  height: 52,
                  backgroundColor: isActive ? colors.ventureroot.green : '#F1F5F9',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 16,
                  borderRadius: 12,
                }}
              >
                <item.icon
                  size={24}
                  color={isActive ? '#FFFFFF' : colors.ventureroot.green}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontWeight: '800',
                    fontSize: 14,
                    marginBottom: 4,
                    color: '#0F172A',
                  }}
                >
                  {item.tagline}
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    color: '#64748B',
                    lineHeight: 16,
                  }}
                >
                  {item.description}
                </Text>
              </View>

              <ChevronRight size={18} color="#94A3B8" />
            </TouchableOpacity>
          );
        })}
      </View>
    </OnboardingShell>
  );
};

export default AccountTypeScreen;
