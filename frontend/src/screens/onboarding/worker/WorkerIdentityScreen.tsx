import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import OnboardingShell, { OnboardingButton, OnboardingInput } from '@/components/onboarding/OnboardingShell';
import { useOnboardingNav } from '@/hooks/useOnboardingNav';
import { Eye, EyeOff, ChevronDown, ChevronUp } from 'lucide-react-native';
import { colors } from '@/theme/colors';

const WorkerIdentityScreen = () => {
  const { goNext, goBack, step, total } = useOnboardingNav();
  const [bvn, setBvn] = useState('');
  const [nin, setNin] = useState('');
  const [showBvn, setShowBvn] = useState(false);
  const [showNin, setShowNin] = useState(false);
  const [showExplainer, setShowExplainer] = useState(false);

  const isBvnValid = /^\d{11}$/.test(bvn);
  const isNinValid = /^\d{11}$/.test(nin);
  const canContinue = isBvnValid && isNinValid;

  return (
    <OnboardingShell
      currentStep={step}
      totalSteps={total}
      title="Identity Verification"
      subtitle="Your government-issued identifiers are required for CBN KYC compliance."
      onBack={goBack}
      footer={
        <OnboardingButton
          title="Submit & Continue"
          onPress={() => goNext({ bvn, nin })}
          disabled={!canContinue}
        />
      }
    >
      <View style={{ marginBottom: 20 }}>
        <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 6, letterSpacing: 0.5 }}>
          BANK VERIFICATION NUMBER (BVN)
        </Text>
        <View style={{ position: 'relative' }}>
          <OnboardingInput
            label=""
            value={bvn}
            onChangeText={(t) => setBvn(t.replace(/\D/g, '').slice(0, 11))}
            placeholder="Enter 11-digit BVN"
            keyboardType="number-pad"
            maxLength={11}
            secureTextEntry={!showBvn}
            helper="Your BVN starts with '2'. Dial *565*0# on any registered line to retrieve it."
          />
          <TouchableOpacity
            onPress={() => setShowBvn(!showBvn)}
            style={{ position: 'absolute', right: 16, top: 14, padding: 4 }}
          >
            {showBvn ? <EyeOff size={18} color="#94A3B8" /> : <Eye size={18} color="#94A3B8" />}
          </TouchableOpacity>
        </View>
        <Text style={{ fontSize: 11, color: '#94A3B8', lineHeight: 16, marginTop: 2 }}>
          Your BVN is encrypted immediately and never stored in plain text.
        </Text>
      </View>

      <View style={{ marginBottom: 20 }}>
        <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 6, letterSpacing: 0.5 }}>
          NATIONAL IDENTIFICATION NUMBER (NIN)
        </Text>
        <View style={{ position: 'relative' }}>
          <OnboardingInput
            label=""
            value={nin}
            onChangeText={(t) => setNin(t.replace(/\D/g, '').slice(0, 11))}
            placeholder="Enter 11-digit NIN"
            keyboardType="number-pad"
            maxLength={11}
            secureTextEntry={!showNin}
            helper="Your NIN is printed on your National ID card or dial *346# on any network."
          />
          <TouchableOpacity
            onPress={() => setShowNin(!showNin)}
            style={{ position: 'absolute', right: 16, top: 14, padding: 4 }}
          >
            {showNin ? <EyeOff size={18} color="#94A3B8" /> : <Eye size={18} color="#94A3B8" />}
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity
        onPress={() => setShowExplainer(!showExplainer)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 12,
          gap: 6,
        }}
      >
        <Text style={{ fontSize: 13, color: colors.ventureroot.green, fontWeight: '600' }}>
          Why do we need this?
        </Text>
        {showExplainer ? (
          <ChevronUp size={16} color={colors.ventureroot.green} />
        ) : (
          <ChevronDown size={16} color={colors.ventureroot.green} />
        )}
      </TouchableOpacity>

      {showExplainer && (
        <View
          style={{
            backgroundColor: '#F0FDF4',
            borderRadius: 12,
            padding: 16,
            marginTop: 4,
          }}
        >
          <Text style={{ fontSize: 13, color: '#166534', lineHeight: 20 }}>
            The Central Bank of Nigeria (CBN) requires all financial service providers
            to verify the identity of their customers before enabling financial transactions.
            This is called Know Your Customer (KYC) and protects both you and the platform
            from fraud. Your BVN and NIN are used once to confirm your identity and are
            never shared with third parties.
          </Text>
        </View>
      )}
    </OnboardingShell>
  );
};

export default WorkerIdentityScreen;
