import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, FlatList } from 'react-native';
import { Store, Smartphone } from 'lucide-react-native';
import OnboardingShell, { OnboardingButton, OnboardingInput } from '@/components/onboarding/OnboardingShell';
import { useOnboardingNav } from '@/hooks/useOnboardingNav';
import { NIGERIAN_STATES } from '@/utils/validation';
import { colors } from '@/theme/colors';

const LocationScreen = () => {
  const { goNext, goBack, step, total, data } = useOnboardingNav();

  const [isPhysicalStore, setIsPhysicalStore] = useState<boolean>(data.isPhysicalStore ?? true);
  const [state, setState] = useState(data.state || '');
  const [lga, setLga] = useState(data.lga || '');
  const [address, setAddress] = useState(data.address || '');
  const [landmark, setLandmark] = useState(data.landmark || '');
  const [serviceAreas, setServiceAreas] = useState(
    Array.isArray(data.serviceAreas) ? data.serviceAreas.join(', ') : data.serviceAreas || '',
  );
  const [showStateDropdown, setShowStateDropdown] = useState(false);

  const stateIsValid = NIGERIAN_STATES.includes(state as any);
  const addressIsValid = address.trim().length >= 5;
  const lgaIsValid = lga.trim().length > 0;
  const serviceAreasValid = !isPhysicalStore ? serviceAreas.trim().length > 0 : true;

  const isFormValid = stateIsValid && lgaIsValid && addressIsValid && serviceAreasValid;

  const stateError = state.length > 0 && !stateIsValid ? 'Select a valid Nigerian state' : undefined;
  const addressError = address.length > 0 && !addressIsValid ? 'Address must be at least 5 characters' : undefined;

  const filteredStates = useMemo(() => {
    if (!state) return [...NIGERIAN_STATES];
    const lower = state.toLowerCase();
    return NIGERIAN_STATES.filter((s) => s.toLowerCase().includes(lower));
  }, [state]);

  return (
    <OnboardingShell
      currentStep={step}
      totalSteps={total}
      title="Where do you operate?"
      subtitle="This helps us connect you to the nearest distribution cluster."
      onBack={goBack}
      footer={
        <OnboardingButton
          title="Continue"
          onPress={() =>
            goNext({
              isPhysicalStore,
              state: state.trim(),
              lga: lga.trim(),
              address: address.trim(),
              landmark: isPhysicalStore ? landmark.trim() : undefined,
              serviceAreas: isPhysicalStore
                ? undefined
                : serviceAreas.split(',').map((a: string) => a.trim()).filter(Boolean),
            })
          }
          disabled={!isFormValid}
        />
      }
    >
      {/* Physical / Mobile toggle */}
      <View
        style={{
          flexDirection: 'row',
          backgroundColor: '#F1F5F9',
          padding: 4,
          borderRadius: 14,
          marginBottom: 24,
        }}
      >
        <TouchableOpacity
          onPress={() => setIsPhysicalStore(true)}
          activeOpacity={0.7}
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 12,
            borderRadius: 10,
            backgroundColor: isPhysicalStore ? '#FFFFFF' : 'transparent',
            ...(isPhysicalStore ? { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2 } : {}),
          }}
        >
          <Store size={16} color={isPhysicalStore ? colors.ventureroot.green : '#94A3B8'} />
          <Text
            style={{
              marginLeft: 6,
              fontSize: 12,
              fontWeight: '700',
              color: isPhysicalStore ? colors.ventureroot.green : '#94A3B8',
            }}
          >
            Physical Store
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setIsPhysicalStore(false)}
          activeOpacity={0.7}
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 12,
            borderRadius: 10,
            backgroundColor: !isPhysicalStore ? '#FFFFFF' : 'transparent',
            ...(!isPhysicalStore ? { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2 } : {}),
          }}
        >
          <Smartphone size={16} color={!isPhysicalStore ? colors.ventureroot.green : '#94A3B8'} />
          <Text
            style={{
              marginLeft: 6,
              fontSize: 12,
              fontWeight: '700',
              color: !isPhysicalStore ? colors.ventureroot.green : '#94A3B8',
            }}
          >
            Online / Mobile
          </Text>
        </TouchableOpacity>
      </View>

      {/* State field with dropdown */}
      <View style={{ position: 'relative', zIndex: 10 }}>
        <OnboardingInput
          label="State"
          placeholder="e.g. Lagos"
          value={state}
          onChangeText={(text) => {
            setState(text);
            setShowStateDropdown(true);
          }}
          error={stateError}
        />
        {showStateDropdown && filteredStates.length > 0 && !stateIsValid && state.length > 0 && (
          <View
            style={{
              position: 'absolute',
              top: 78,
              left: 0,
              right: 0,
              backgroundColor: '#FFFFFF',
              borderWidth: 1,
              borderColor: '#E2E8F0',
              borderRadius: 10,
              maxHeight: 160,
              zIndex: 20,
              shadowColor: '#000',
              shadowOpacity: 0.08,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 4 },
              elevation: 4,
            }}
          >
            <FlatList
              data={filteredStates}
              keyExtractor={(item) => item}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => {
                    setState(item);
                    setShowStateDropdown(false);
                  }}
                  style={{ paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: '#F1F5F9' }}
                >
                  <Text style={{ fontSize: 14, color: '#1E293B' }}>{item}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        )}
      </View>

      <OnboardingInput
        label="LGA"
        placeholder="e.g. Ikeja"
        value={lga}
        onChangeText={setLga}
      />

      <OnboardingInput
        label={isPhysicalStore ? 'Full Street Address' : 'Warehouse / Office Address'}
        placeholder="e.g. 24, Allen Avenue"
        value={address}
        onChangeText={setAddress}
        error={addressError}
      />

      {isPhysicalStore ? (
        <OnboardingInput
          label="Nearest Landmark"
          placeholder="e.g. Opposite GTBank"
          value={landmark}
          onChangeText={setLandmark}
          helper="Optional but helps with delivery accuracy"
        />
      ) : (
        <OnboardingInput
          label="Service Areas"
          placeholder="e.g. Ikeja, Alimosho, Oshodi"
          value={serviceAreas}
          onChangeText={setServiceAreas}
          helper="Comma-separated list of areas you cover"
        />
      )}
    </OnboardingShell>
  );
};

export default LocationScreen;
