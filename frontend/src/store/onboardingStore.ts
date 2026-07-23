import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AccountTypeId } from '@/config/accountTypes';
import type { RootStackParamList } from '@/navigation/types';

type RouteName = keyof RootStackParamList;

const STEP_SEQUENCES: Record<string, RouteName[]> = {
  nine_to_five: [
    'WorkerEmail',
    'WorkerPhone',
    'WorkerPassword',
    'WorkerOTP',
    'WorkerProfile',
    'WorkerEmployment',
    'WorkerIdentity',
    'WorkerVerificationPending',
    'WorkerRiskAssessment',
    'WorkerPINSetup',
    'WorkerCompletion',
  ],
  retail: [
    'OnboardingPhone',
    'OnboardingBasicInfo',
    'OnboardingShopInfo',
    'OnboardingCategory',
    'OnboardingMarketAssociation',
    'OnboardingLocation',
    'OnboardingStoreVerification',
    'OnboardingKYC',
    'OnboardingFaceVerification',
    'OnboardingPOSRegistration',
    'OnboardingBankLink',
    'OnboardingInventory',
    'OnboardingSalesEstimation',
    'OnboardingTaxCompliance',
    'OnboardingTerms',
    'OnboardingActivation',
    'OnboardingReview',
  ],
  distributor: [
    'OnboardingPhone',
    'DistributorCompany',
    'DistributorOperations',
    'DistributorDirector',
    'DistributorBank',
    'DistributorTerms',
  ],
  logistics: [
    'OnboardingPhone',
    'LogisticsCompany',
    'LogisticsFleet',
    'LogisticsDriver',
    'LogisticsInsurance',
    'LogisticsTerms',
  ],
};

interface OnboardingData {
  [key: string]: any;
}

interface OnboardingState {
  accountType: AccountTypeId | null;
  currentStepIndex: number;
  isComplete: boolean;
  data: OnboardingData;

  steps: () => RouteName[];
  totalSteps: () => number;
  currentRoute: () => RouteName | null;
  stepNumber: () => number;
  progress: () => number;

  startOnboarding: (type: AccountTypeId) => void;
  nextStep: () => RouteName | null;
  prevStep: () => RouteName | null;
  goToStep: (index: number) => RouteName | null;
  updateData: (patch: Partial<OnboardingData>) => void;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set, get) => ({
      accountType: null,
      currentStepIndex: 0,
      isComplete: false,
      data: {},

      steps: () => {
        const type = get().accountType;
        return type ? STEP_SEQUENCES[type] ?? [] : [];
      },

      totalSteps: () => get().steps().length,

      currentRoute: () => {
        const seq = get().steps();
        const idx = get().currentStepIndex;
        return seq[idx] ?? null;
      },

      stepNumber: () => get().currentStepIndex + 1,

      progress: () => {
        const total = get().totalSteps();
        if (total === 0) return 0;
        return Math.round(((get().currentStepIndex + 1) / total) * 100);
      },

      startOnboarding: (type) =>
        set({ accountType: type, currentStepIndex: 0, isComplete: false, data: {} }),

      nextStep: () => {
        const seq = get().steps();
        const nextIdx = get().currentStepIndex + 1;
        if (nextIdx >= seq.length) {
          return null;
        }
        set({ currentStepIndex: nextIdx });
        return seq[nextIdx];
      },

      prevStep: () => {
        const seq = get().steps();
        const prevIdx = get().currentStepIndex - 1;
        if (prevIdx < 0) return null;
        set({ currentStepIndex: prevIdx });
        return seq[prevIdx];
      },

      goToStep: (index) => {
        const seq = get().steps();
        if (index < 0 || index >= seq.length) return null;
        set({ currentStepIndex: index });
        return seq[index];
      },

      updateData: (patch) =>
        set((state) => ({ data: { ...state.data, ...patch } })),

      completeOnboarding: () => set({ isComplete: true }),

      resetOnboarding: () =>
        set({ accountType: null, currentStepIndex: 0, isComplete: false, data: {} }),
    }),
    {
      name: 'ventureroot-onboarding',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        accountType: state.accountType,
        currentStepIndex: state.currentStepIndex,
        isComplete: state.isComplete,
        data: state.data,
      }),
    },
  ),
);

export { STEP_SEQUENCES };
