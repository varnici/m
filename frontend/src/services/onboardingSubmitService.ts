import { supabase } from '@/lib/supabase';
import { useUserProfileStore } from '@/store/userProfileStore';
import { onboardingApi } from './onboardingApiService';
import type { AccountTypeId } from '@/config/accountTypes';

interface SubmitResult {
  success: boolean;
  error?: string;
  kycVerified?: boolean;
  kycMessage?: string;
}

export async function submitWorkerOnboarding(
  data: Record<string, any>,
  userId: string,
): Promise<SubmitResult> {
  try {
    // profiles table only has: id, full_name, bvn_verified, virtual_account_number, virtual_account_bank, created_at
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        full_name: `${data.firstName ?? ''} ${data.lastName ?? ''}`.trim() || undefined,
      })
      .eq('id', userId);

    if (profileError) throw profileError;

    useUserProfileStore.getState().setAccountType('nine_to_five' as AccountTypeId);

    const now = new Date().toISOString();

    const workerPayload = {
      user_id: userId,
      full_name: `${data.firstName ?? ''} ${data.lastName ?? ''}`.trim(),
      first_name: data.firstName,
      last_name: data.lastName,
      date_of_birth: data.dob,
      gender: data.gender,
      email: data.email,
      phone: data.phone,
      street_address: data.street,
      city: data.city,
      state: data.state,
      employer: data.employer,
      salary_range: data.salaryRange,
      pay_date: data.payDate ? parseInt(data.payDate, 10) : null,
      dream_business: data.dreamBusiness || 'My First Business Fund',
      bvn_hash: data.bvn ? '***SUBMITTED***' : null,
      nin_hash: data.nin ? '***SUBMITTED***' : null,
      risk_profile: data.riskProfile,
      risk_score: data.riskScore,
      pin_set: data.pinSet ?? false,
      otp_verified: data.otpVerified ?? false,
      onboarding_completed_at: now,
    };

    const { data: existingWorker, error: existingError } = await supabase
      .from('worker_profiles')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (existingError) throw existingError;

    if (existingWorker?.id) {
      const { error: updateError } = await supabase
        .from('worker_profiles')
        .update(workerPayload)
        .eq('id', existingWorker.id);
      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await supabase
        .from('worker_profiles')
        .insert(workerPayload);
      if (insertError) throw insertError;
    }

    // Seed a starting savings target so the dashboard has something real to
    // show on first login, instead of a permanently empty state. Non-fatal:
    // a worker can always create one later if this fails.
    const { data: existingPlan } = await supabase
      .from('savings_plans')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (!existingPlan) {
      const { error: planError } = await supabase.from('savings_plans').insert({
        user_id: userId,
        target_name: workerPayload.dream_business,
        target_amount: 500000,
      });
      if (planError) console.error('Failed to seed starting savings plan:', planError);
    }

    return { success: true };
  } catch (err: any) {
    console.error('Worker onboarding submission error:', err);
    return { success: false, error: err.message };
  }
}

export async function submitRetailOnboarding(
  data: Record<string, any>,
  userId: string,
): Promise<SubmitResult> {
  try {
    // profiles table only has: id, full_name, bvn_verified, virtual_account_number, virtual_account_bank, created_at
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        full_name: data.fullName || undefined,
      })
      .eq('id', userId);

    if (profileError) throw profileError;

    if (data.accountType) {
      useUserProfileStore.getState().setAccountType(data.accountType as AccountTypeId);
    }

    const now = new Date().toISOString();

    const businessPayload = {
      owner_id: userId,
      account_type: data.accountType,
      business_name: data.businessName,
      trading_name: data.tradingName,
      years_in_operation: data.yearsInOperation,
      ownership_type: data.ownershipType,
      employee_count: data.employee_count,
      registration_status: data.registrationStatus,
      category: data.primaryCategory,
      is_physical_store: data.isPhysicalStore,
      state: data.state,
      lga: data.lga,
      address: data.address,
      landmark: data.landmark,
      latitude: data.gpsLat ?? data.gpsPin?.latitude,
      longitude: data.gpsLng ?? data.gpsPin?.longitude,
      shop_front_photo_uri: data.isPhysicalStore ? data.shopFrontPhotoUri : null,
      service_areas: !data.isPhysicalStore ? data.serviceAreas : null,
      stock_photo_uri: !data.isPhysicalStore ? data.stockPhotoUri : null,
      tin: data.tin,
      cac_certificate_uri: data.cacCertificateUri,
      id_type: data.idType,
      id_number: data.idNumber,
      id_expiry: data.idExpiry,
      full_name: data.fullName,
      date_of_birth: data.dateOfBirth,
      gender: data.gender,
      nationality: data.nationality,
      email: data.email,
      phone: data.phone,
      nin: data.idType === 'NIN' ? data.idNumber : null,
      estimated_inventory_value: data.estimatedInventoryValue,
      sales_tier: data.salesTier,
      terms_accepted: data.termsAccepted,
      market_association_token: data.marketAssociationToken,
      leader_endorsement_id: data.leaderEndorsementId,
      pos_option: data.posOption,
      pos_terminal_id: data.posTerminalId,
      onboarding_completed_at: now,
    };

    const { data: existingBusiness, error: existingBusinessError } = await supabase
      .from('businesses')
      .select('id')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingBusinessError) throw existingBusinessError;

    if (existingBusiness?.id) {
      const { error: updateError } = await supabase
        .from('businesses')
        .update(businessPayload)
        .eq('id', existingBusiness.id);
      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await supabase
        .from('businesses')
        .insert(businessPayload);
      if (insertError) throw insertError;
    }

    let kycVerified: boolean | undefined;
    let kycMessage: string | undefined;
    try {
      const stepResults = await onboardingApi.submitAllSteps('merchant_sme', [
        { name: 'basic_info', data: { full_name: data.fullName, email: data.email, phone: data.phone } },
        { name: 'business_info', data: { business_name: data.businessName, inventory_category: data.primaryCategory } },
        { name: 'gps_location', data: { latitude: data.gpsLat ?? data.gpsPin?.latitude, longitude: data.gpsLng ?? data.gpsPin?.longitude } },
        { name: 'store_photos', data: { store_front_photo_url: data.shopFrontPhotoUri, face_id_photo_url: data.selfiePhotoUri } },
        {
          name: 'bvn_verify',
          data: {
            id_type: data.idType,
            id_number: data.idNumber,
            dob: data.dateOfBirth,
            selfie_base64: data.facePhotoBase64,
          },
        },
      ]);
      const kycStep = stepResults.find((r) => r.step_completed === 'bvn_verify');
      kycVerified = kycStep?.kyc_verified ?? undefined;
      kycMessage = kycStep?.kyc_message ?? undefined;
    } catch (apiErr) {
      console.warn('Backend onboarding sync error (non-fatal):', apiErr);
    }

    return { success: true, kycVerified, kycMessage };
  } catch (err: any) {
    console.error('Onboarding submission error:', err);
    return { success: false, error: err.message };
  }
}

export async function submitDistributorOnboarding(
  data: Record<string, any>,
  userId: string,
): Promise<SubmitResult> {
  try {
    // profiles table only has: id, full_name, bvn_verified, virtual_account_number, virtual_account_bank, created_at
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        full_name: data.directorFullName ?? data.fullName ?? undefined,
      })
      .eq('id', userId);

    if (profileError) throw profileError;

    useUserProfileStore.getState().setAccountType('distributor' as AccountTypeId);

    const now = new Date().toISOString();

    const distributorPayload = {
      owner_id: userId,
      account_type: 'distributor',
      business_name: data.companyName,
      cac_reg_number: data.rcNumber,
      tin: data.tin,
      director_name: data.directorFullName,
      director_bvn_hash: data.bvn ? '***SUBMITTED***' : null,
      director_nin_hash: data.nin ? '***SUBMITTED***' : null,
      bank_name: data.bankName,
      account_number: data.accountNumber,
      account_type_bank: data.accountTypeDist,
      state: data.state,
      lga: data.lga,
      address: `${data.street ?? ''}, ${data.city ?? ''}, ${data.state ?? ''}`.trim(),
      latitude: data.gpsLat,
      longitude: data.gpsLng,
      product_categories: data.selectedCategories ?? [],
      terms_accepted: data.termsAccepted ?? true,
      onboarding_completed_at: now,
    };

    const { data: existingBusiness, error: existingError } = await supabase
      .from('businesses')
      .select('id')
      .eq('owner_id', userId)
      .maybeSingle();

    if (existingError) throw existingError;

    if (existingBusiness?.id) {
      const { error: updateError } = await supabase
        .from('businesses')
        .update(distributorPayload)
        .eq('id', existingBusiness.id);
      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await supabase
        .from('businesses')
        .insert(distributorPayload);
      if (insertError) throw insertError;
    }

    try {
      await onboardingApi.submitAllSteps('distributor', [
        { name: 'basic_info', data: { full_name: data.directorFullName } },
        { name: 'company_info', data: { company_name: data.companyName, cac_reg_number: data.rcNumber, tin: data.tin } },
        { name: 'cac_verify', data: {} },
        { name: 'warehouse_location', data: { address: distributorPayload.address, latitude: data.gpsLat, longitude: data.gpsLng } },
        { name: 'bank_details', data: { bank_name: data.bankName, account_number: data.accountNumber } },
      ]);
    } catch (apiErr) {
      console.warn('Backend distributor sync error (non-fatal):', apiErr);
    }

    return { success: true };
  } catch (err: any) {
    console.error('Distributor onboarding submission error:', err);
    return { success: false, error: err.message };
  }
}

export async function submitLogisticsOnboarding(
  data: Record<string, any>,
  userId: string,
): Promise<SubmitResult> {
  try {
    // profiles table only has: id, full_name, bvn_verified, virtual_account_number, virtual_account_bank, created_at
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        full_name: data.fullName || undefined,
      })
      .eq('id', userId);

    if (profileError) throw profileError;

    useUserProfileStore.getState().setAccountType('logistics' as AccountTypeId);

    const now = new Date().toISOString();

    const logisticsPayload = {
      owner_id: userId,
      account_type: 'logistics',
      business_name: data.companyName,
      company_type: data.companyType,
      cac_reg_number: data.rcNumber,
      fleet_size: data.fleetSize,
      vehicle_types: data.vehicleTypes ?? [],
      coverage_areas: data.coverageAreas ?? [],
      driver_count: data.driverCount,
      insurance_provider: data.insuranceProvider,
      insurance_policy_number: data.insurancePolicyNumber,
      terms_accepted: true,
      onboarding_completed_at: now,
    };

    const { data: existing, error: existingError } = await supabase
      .from('businesses')
      .select('id')
      .eq('owner_id', userId)
      .maybeSingle();

    if (existingError) throw existingError;

    if (existing?.id) {
      const { error } = await supabase.from('businesses').update(logisticsPayload).eq('id', existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('businesses').insert(logisticsPayload);
      if (error) throw error;
    }

    try {
      await onboardingApi.submitAllSteps('logistics', [
        { name: 'basic_info', data: { full_name: data.fullName } },
        { name: 'company_info', data: { company_name: data.companyName } },
        { name: 'fleet_info', data: { fleet_size: data.fleetSize, vehicle_registration_numbers: data.vehicleRegNumbers, driver_license_number: data.driverLicenseNumber } },
        { name: 'insurance_verify', data: { insurance_provider: data.insuranceProvider, insurance_policy_number: data.insurancePolicyNumber } },
        { name: 'vehicle_docs', data: {} },
      ]);
    } catch (apiErr) {
      console.warn('Backend logistics sync error (non-fatal):', apiErr);
    }

    return { success: true };
  } catch (err: any) {
    console.error('Logistics onboarding submission error:', err);
    return { success: false, error: err.message };
  }
}
