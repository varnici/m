import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import OnboardingShell, { OnboardingButton, OnboardingInput } from '@/components/onboarding/OnboardingShell';
import { useOnboardingNav } from '@/hooks/useOnboardingNav';
import { colors } from '@/theme/colors';

const SALARY_RANGES = [
  { id: 'range1', label: '₦100,000 – ₦250,000' },
  { id: 'range2', label: '₦250,000 – ₦500,000' },
  { id: 'range3', label: '₦500,000 – ₦1,000,000' },
  { id: 'range4', label: 'Above ₦1,000,000' },
];

const WorkerEmploymentScreen = () => {
  const { goNext, goBack, step, total, data } = useOnboardingNav();

  const [employer, setEmployer] = useState(data.employer ?? '');
  const [salaryRange, setSalaryRange] = useState(data.salaryRange ?? '');
  const [payDate, setPayDate] = useState(data.payDate ?? '');
  const [dreamBusiness, setDreamBusiness] = useState(data.dreamBusiness ?? '');

  const payDateNum = parseInt(payDate, 10);
  const isPayDateValid = payDate.length > 0 && payDateNum >= 1 && payDateNum <= 31;
  const canContinue = employer.trim().length >= 2 && salaryRange.length > 0 && isPayDateValid;

  return (
    <OnboardingShell
      currentStep={step}
      totalSteps={total}
      title="Employment & Income"
      subtitle="This helps us personalise your savings automation. We don't contact your employer."
      onBack={goBack}
      footer={
        <OnboardingButton
          title="Continue"
          onPress={() => goNext({ employer, salaryRange, payDate, dreamBusiness })}
          disabled={!canContinue}
        />
      }
    >
      <OnboardingInput
        label="EMPLOYER / WORKPLACE NAME"
        value={employer}
        onChangeText={setEmployer}
        placeholder="Where do you work?"
        helper="We don't contact your employer. This helps us personalise your experience."
      />

      <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 8, letterSpacing: 0.5 }}>
        MONTHLY SALARY RANGE
      </Text>
      <View style={{ gap: 8, marginBottom: 16 }}>
        {SALARY_RANGES.map((range) => {
          const isSelected = salaryRange === range.id;
          return (
            <TouchableOpacity
              key={range.id}
              onPress={() => setSalaryRange(range.id)}
              activeOpacity={0.7}
              style={{
                paddingVertical: 14,
                paddingHorizontal: 16,
                borderRadius: 12,
                backgroundColor: isSelected ? '#F0FDF4' : '#FFFFFF',
                borderWidth: 1.5,
                borderColor: isSelected ? colors.ventureroot.green : '#E2E8F0',
              }}
            >
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: isSelected ? '700' : '500',
                  color: isSelected ? colors.ventureroot.green : '#334155',
                }}
              >
                {range.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <OnboardingInput
        label="SALARY PAY DATE"
        value={payDate}
        onChangeText={(t) => setPayDate(t.replace(/\D/g, '').slice(0, 2))}
        placeholder="Day of month (1-31)"
        keyboardType="number-pad"
        maxLength={2}
        helper="We schedule your automated savings sweep the day after your salary arrives."
        error={
          payDate.length > 0 && !isPayDateValid
            ? 'Enter a number between 1 and 31.'
            : undefined
        }
      />

      {isPayDateValid && payDateNum >= 29 && (
        <View style={{ backgroundColor: '#EFF6FF', borderRadius: 10, padding: 12, marginBottom: 16 }}>
          <Text style={{ fontSize: 12, color: '#1E40AF', lineHeight: 17 }}>
            For months with fewer days, your sweep will run on the last day of that month.
          </Text>
        </View>
      )}

      <OnboardingInput
        label="BUSINESS DREAM (OPTIONAL)"
        value={dreamBusiness}
        onChangeText={setDreamBusiness}
        placeholder="A suya spot near Lekki Phase 1..."
        multiline
        helper="This becomes the name of your first savings goal. Leave blank for 'My First Business Fund'."
      />
    </OnboardingShell>
  );
};

export default WorkerEmploymentScreen;
