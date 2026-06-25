import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { RootStackNavigation } from '@/navigation/types';
import { useOnboardingStore } from '@/store/onboardingStore';
import { useUserProfileStore } from '@/store/userProfileStore';

export function useOnboardingNav() {
  const navigation = useNavigation<RootStackNavigation>();
  const {
    nextStep,
    prevStep,
    stepNumber,
    totalSteps,
    progress,
    updateData,
    completeOnboarding,
    accountType,
    data,
  } = useOnboardingStore();

  const goNext = useCallback(
    (dataPatch?: Record<string, any>) => {
      if (dataPatch) updateData(dataPatch);

      const nextRoute = nextStep();
      if (nextRoute) {
        navigation.navigate(nextRoute as any);
      } else {
        if (accountType) {
          useUserProfileStore.getState().setAccountType(accountType);
        }
        completeOnboarding();
        navigation.reset({ index: 0, routes: [{ name: 'Main' as any }] });
      }
    },
    [nextStep, updateData, completeOnboarding, accountType, navigation],
  );

  const goBack = useCallback(() => {
    const prevRoute = prevStep();
    if (prevRoute) {
      navigation.goBack();
    } else {
      navigation.goBack();
    }
  }, [prevStep, navigation]);

  return {
    goNext,
    goBack,
    step: stepNumber(),
    total: totalSteps(),
    progressPct: progress(),
    data,
    updateData,
    accountType,
  };
}
