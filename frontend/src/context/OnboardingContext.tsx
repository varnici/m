import React, { createContext, useContext, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

export type RetailOnboardingData = {
  // Screen 1: User Type
  accountType?: string;
  // Screen 2: Identity Anchor
  phoneOrEmail?: string;
  otp?: string;
  // Screen 3: Basic Info
  fullName?: string;
  dateOfBirth?: string;
  gender?: string;
  nationality?: string;
  email?: string;
  // Screen 4: Shop Info
  businessName?: string;
  tradingName?: string;
  yearsInOperation?: number;
  ownershipType?: string;
  employee_count?: number;
  registrationStatus?: string;
  cacCertificateUri?: string;
  // Screen 5: Business Category
  primaryCategory?: string;

  // Screen 6: Location & Verification (Dynamic)
  isPhysicalStore?: boolean;
  state?: string;
  lga?: string;
  address?: string;
  landmark?: string;
  gpsPin?: { latitude: number; longitude: number };
  shopFrontPhotoUri?: string;
  serviceAreas?: string[]; // For mobile traders
  stockPhotoUri?: string; // For mobile traders

  // Screen 7-8: KYC
  idType?: string;
  idNumber?: string;
  idExpiry?: string;
  faceMatchConfidence?: number;
  // Screen 9: Bank Link
  bankLinked?: boolean;
  bankName?: string;
  // Screen 10-11: Inventory/Sales (AI based)
  estimatedInventoryValue?: number;
  // Note: monthlySalesRange and avgDailySales removed from manual entry

  // Screen 12: Tax/Compliance
  tin?: string;
  vatRegistered?: boolean;
  willingToRegister?: boolean;
  // Screen 13: Consent
  termsAccepted?: boolean;
  timestamp?: string;
};

type OnboardingContextType = {
  data: RetailOnboardingData;
  updateData: (updates: Partial<RetailOnboardingData>) => void;
  resetOnboarding: () => void;
  submitOnboarding: () => Promise<{ success: boolean; error?: string }>;
};

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export const OnboardingProvider = ({ children }: { children: ReactNode }) => {
  const [data, setData] = useState<RetailOnboardingData>({
    isPhysicalStore: true, // Default to physical store
  });
  const { user } = useAuth();

  const updateData = (updates: Partial<RetailOnboardingData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  };

  const resetOnboarding = () => setData({ isPhysicalStore: true });

  const submitOnboarding = async () => {
    if (!user) return { success: false, error: 'No authenticated user found' };

    try {
      // 1. Update Profile (KYC Level 1)
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: data.fullName,
          date_of_birth: data.dateOfBirth,
          gender: data.gender,
          nationality: data.nationality,
          email: data.email,
          nin: data.idType === 'NIN' ? data.idNumber : null,
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // 2. Insert/Update Business
      const { error: businessError } = await supabase
        .from('businesses')
        .upsert({
          owner_id: user.id,
          name: data.businessName,
          trading_name: data.tradingName,
          years_in_operation: data.yearsInOperation,
          ownership_type: data.ownershipType,
          employee_count: data.employee_count,
          registration_status: data.registrationStatus,
          primary_category: data.primaryCategory,
          
          // Location Logic
          is_physical_store: data.isPhysicalStore,
          state: data.state,
          lga: data.lga,
          address: data.address,
          landmark: data.landmark,
          latitude: data.gpsPin?.latitude,
          longitude: data.gpsPin?.longitude,
          shop_front_photo_uri: data.isPhysicalStore ? data.shopFrontPhotoUri : null,
          service_areas: !data.isPhysicalStore ? data.serviceAreas : null,
          stock_photo_uri: !data.isPhysicalStore ? data.stockPhotoUri : null,

          tin: data.tin,
          cac_certificate_uri: data.cacCertificateUri,
          id_type: data.idType,
          id_number: data.idNumber,
          id_expiry: data.idExpiry,
          estimated_inventory_value: data.estimatedInventoryValue,
          
          terms_accepted: data.termsAccepted,
          onboarding_completed_at: new Date().toISOString(),
        }, { onConflict: 'owner_id' });

      if (businessError) throw businessError;

      return { success: true };
    } catch (err: any) {
      console.error('Error submitting onboarding:', err);
      return { success: false, error: err.message };
    }
  };

  return (
    <OnboardingContext.Provider value={{ data, updateData, resetOnboarding, submitOnboarding }}>
      {children}
    </OnboardingContext.Provider>
  );
};

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
};
