import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import OnboardingShell, { OnboardingButton } from '@/components/onboarding/OnboardingShell';
import MaskedInput from '@/components/onboarding/MaskedInput';
import { useOnboardingNav } from '@/hooks/useOnboardingNav';
import { validateBVN, validateNIN } from '@/utils/validation';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { colors } from '@/theme/colors';

const WorkerIdentityScreen = () => {
  const { goNext, goBack, step, total, data } = useOnboardingNav();

  const [bvn, setBvn] = useState(data.bvn ?? '');
  const [nin, setNin] = useState(data.nin ?? '');
  const [showExplainer, setShowExplainer] = useState(false);

  const bvnValidation = validateBVN(bvn);
  const ninValidation = validateNIN(nin);
  const canContinue = bvnValidation.valid && ninValidation.valid;

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
        <MaskedInput
          label="BANK VERIFICATION NUMBER (BVN)"
          value={bvn}
          onChangeText={(t) => setBvn(t.replace(/\D/g, '').slice(0, 11))}
          placeholder="Enter 11-digit BVN"
          keyboardType="number-pad"
          maxLength={11}
          helper="Your BVN starts with '2'. Dial *565*0# on any registered line to retrieve it."
          error={bvn.length > 0 && !bvnValidation.valid ? bvnValidation.error : undefined}
        />
        <Text style={{ fontSize: 11, color: '#94A3B8', lineHeight: 16, marginTop: 2 }}>
          Your BVN is encrypted immediately and never stored in plain text.
        </Text>
      </View>

      <View style={{ marginBottom: 20 }}>
        <MaskedInput
          label="NATIONAL IDENTIFICATION NUMBER (NIN)"
          value={nin}
          onChangeText={(t) => setNin(t.replace(/\D/g, '').slice(0, 11))}
          placeholder="Enter 11-digit NIN"
          keyboardType="number-pad"
          maxLength={11}
          helper="Your NIN is printed on your National ID card or dial *346# on any network."
          error={nin.length > 0 && !ninValidation.valid ? ninValidation.error : undefined}
        />
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
