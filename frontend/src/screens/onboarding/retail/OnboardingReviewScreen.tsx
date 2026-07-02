import React from 'react';
import { View, Text } from 'react-native';
import OnboardingShell, { OnboardingButton } from '@/components/onboarding/OnboardingShell';
import { useOnboardingNav } from '@/hooks/useOnboardingNav';

interface SummaryCardProps {
  title: string;
  items: { label: string; value: string | undefined }[];
}

const SummaryCard = ({ title, items }: SummaryCardProps) => (
  <View style={{ marginBottom: 20 }}>
    <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 8, letterSpacing: 0.5 }}>
      {title}
    </Text>
    <View style={{ backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden' }}>
      {items.map((item, index) => (
        <View
          key={index}
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingVertical: 14,
            paddingHorizontal: 16,
            borderBottomWidth: index < items.length - 1 ? 1 : 0,
            borderBottomColor: '#F1F5F9',
          }}
        >
          <Text style={{ fontSize: 13, color: '#64748B' }}>{item.label}</Text>
          <Text style={{ fontSize: 13, fontWeight: '600', color: item.value ? '#0F172A' : '#94A3B8' }}>
            {item.value || 'Not provided'}
          </Text>
        </View>
      ))}
    </View>
  </View>
);

const OnboardingReviewScreen = () => {
  const { goNext, goBack, step, total, data } = useOnboardingNav();

  return (
    <OnboardingShell
      currentStep={step}
      totalSteps={total}
      title="Review Your Information"
      subtitle="Please review all the details you have provided before proceeding."
      onBack={goBack}
      footer={
        <OnboardingButton
          title="Continue"
          onPress={() => goNext()}
        />
      }
    >
      <SummaryCard
        title="Personal Information"
        items={[
          { label: 'Full Name', value: data.fullName },
          { label: 'Phone / Email', value: data.phoneOrEmail || data.email },
          { label: 'ID Status', value: data.idNumber ? 'Verified' : 'Pending' },
        ]}
      />

      <SummaryCard
        title="Business Details"
        items={[
          { label: 'Business Name', value: data.businessName },
          { label: 'Category', value: data.primaryCategory },
          { label: 'State', value: data.state },
          { label: 'Address', value: data.address },
        ]}
      />

      <SummaryCard
        title="Financial Information"
        items={[
          { label: 'Bank', value: data.bankName },
          { label: 'Sales Tier', value: data.salesTier },
          { label: 'TIN', value: data.tin || 'Not provided' },
          { label: 'VAT Registered', value: data.vatRegistered ? 'Yes' : 'No' },
        ]}
      />

      <SummaryCard
        title="Verification"
        items={[
          { label: 'Store Verified', value: data.shopFrontPhotoUri ? 'Yes' : 'No' },
          { label: 'POS Option', value: data.posOption || 'Not selected' },
          { label: 'Market Association', value: data.marketAssociationToken ? 'Linked' : 'Not linked' },
        ]}
      />
    </OnboardingShell>
  );
};

export default OnboardingReviewScreen;
