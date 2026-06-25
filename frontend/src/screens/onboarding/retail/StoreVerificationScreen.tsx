import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, useWindowDimensions } from 'react-native';
import OnboardingShell, { OnboardingButton } from '@/components/onboarding/OnboardingShell';
import { useOnboardingNav } from '@/hooks/useOnboardingNav';
import { MapPin, Camera, User, CheckCircle, Image as ImageIcon } from 'lucide-react-native';
import { colors } from '@/theme/colors';

const StoreVerificationScreen = () => {
  const { goNext, goBack, step, total, updateData } = useOnboardingNav();
  const [gpsCapture, setGpsCapture] = useState<{ lat: number; lng: number } | null>(null);
  const [storeFrontPhoto, setStoreFrontPhoto] = useState(false);
  const [selfiePhoto, setSelfiePhoto] = useState(false);
  const [additionalPhotos, setAdditionalPhotos] = useState(0);

  const canContinue = gpsCapture !== null && storeFrontPhoto && selfiePhoto;

  const handleCaptureGPS = () => {
    setGpsCapture({ lat: 6.4281, lng: 3.4219 });
    updateData({ gpsLat: 6.4281, gpsLng: 3.4219 });
    Alert.alert('Location Captured', 'Your store GPS coordinates have been recorded.');
  };

  const handleStoreFrontPhoto = () => {
    setStoreFrontPhoto(true);
    Alert.alert('Photo Captured', 'Store front photo saved successfully.');
  };

  const handleSelfie = () => {
    setSelfiePhoto(true);
    Alert.alert('Selfie Captured', 'Face ID photo saved successfully.');
  };

  const handleAdditionalPhoto = () => {
    if (additionalPhotos < 4) {
      setAdditionalPhotos((prev) => prev + 1);
    }
  };

  const handleContinue = () => {
    goNext({ storeFrontPhoto: storeFrontPhoto, selfiePhoto: selfiePhoto });
  };

  const steps = [
    {
      icon: MapPin,
      title: 'Capture Store Location',
      desc: 'We need to confirm the physical location of your store.',
      done: gpsCapture !== null,
      action: handleCaptureGPS,
      actionLabel: gpsCapture ? 'Location Captured' : 'Capture my store location',
    },
    {
      icon: Camera,
      title: 'Store Front Photo',
      desc: 'Take a clear photo showing your shop name, signage, and entrance.',
      done: storeFrontPhoto,
      action: handleStoreFrontPhoto,
      actionLabel: storeFrontPhoto ? 'Photo Saved' : 'Take store front photo',
    },
    {
      icon: User,
      title: 'Owner Face ID',
      desc: 'Take a clear selfie. Remove glasses, hats, or anything covering your face.',
      done: selfiePhoto,
      action: handleSelfie,
      actionLabel: selfiePhoto ? 'Selfie Saved' : 'Take selfie',
    },
  ];

  return (
    <OnboardingShell
      currentStep={step}
      totalSteps={total}
      title="Store Verification"
      subtitle="We need to verify your store location and identity. Please be at your shop."
      onBack={goBack}
      footer={
        <OnboardingButton title="Continue to KYC" onPress={handleContinue} disabled={!canContinue} />
      }
    >
      <View style={{ gap: 14 }}>
        {steps.map((step, idx) => {
          const Icon = step.icon;
          return (
            <View
              key={idx}
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 16,
                padding: 18,
                borderWidth: 1,
                borderColor: step.done ? '#D1FAE5' : '#E2E8F0',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 12 }}>
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    backgroundColor: step.done ? '#D1FAE5' : '#F1F5F9',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {step.done ? (
                    <CheckCircle size={22} color={colors.ventureroot.green} />
                  ) : (
                    <Icon size={22} color="#64748B" />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: '#0F172A' }}>{step.title}</Text>
                  <Text style={{ fontSize: 12, color: '#64748B', lineHeight: 17, marginTop: 2 }}>
                    {step.desc}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={step.action}
                disabled={step.done}
                activeOpacity={0.7}
                style={{
                  backgroundColor: step.done ? '#F0FDF4' : colors.ventureroot.green,
                  borderRadius: 10,
                  paddingVertical: 12,
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '700',
                    color: step.done ? colors.ventureroot.green : '#FFFFFF',
                  }}
                >
                  {step.actionLabel}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}

        <View
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 16,
            padding: 18,
            borderWidth: 1,
            borderColor: '#E2E8F0',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 12 }}>
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                backgroundColor: '#F1F5F9',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ImageIcon size={22} color="#64748B" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#0F172A' }}>
                Additional Photos (Optional)
              </Text>
              <Text style={{ fontSize: 12, color: '#64748B', lineHeight: 17, marginTop: 2 }}>
                Shelves, stock, price tags, association certificate ({additionalPhotos}/4)
              </Text>
            </View>
          </View>

          {additionalPhotos < 4 && (
            <TouchableOpacity
              onPress={handleAdditionalPhoto}
              activeOpacity={0.7}
              style={{
                backgroundColor: '#F1F5F9',
                borderRadius: 10,
                paddingVertical: 12,
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#475569' }}>
                Add photo ({additionalPhotos}/4)
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </OnboardingShell>
  );
};

export default StoreVerificationScreen;
