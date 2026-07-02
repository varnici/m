import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, useWindowDimensions, Image } from 'react-native';
import OnboardingShell, { OnboardingButton } from '@/components/onboarding/OnboardingShell';
import { useOnboardingNav } from '@/hooks/useOnboardingNav';
import { MapPin, Camera, User, CheckCircle, Image as ImageIcon } from 'lucide-react-native';
import { colors } from '@/theme/colors';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';

const StoreVerificationScreen = () => {
  const { goNext, goBack, step, total, updateData } = useOnboardingNav();
  const [gpsCapture, setGpsCapture] = useState<{ lat: number; lng: number } | null>(null);
  const [storeFrontUri, setStoreFrontUri] = useState<string | null>(null);
  const [selfieUri, setSelfieUri] = useState<string | null>(null);
  const [additionalUris, setAdditionalUris] = useState<string[]>([]);
  const [capturing, setCapturing] = useState<string | null>(null);

  const canContinue = gpsCapture !== null && storeFrontUri !== null && selfieUri !== null;

  const handleCaptureGPS = async () => {
    setCapturing('gps');
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Location access is required to verify your store location.');
      setCapturing(null);
      return;
    }
    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const { latitude, longitude } = loc.coords;
      setGpsCapture({ lat: latitude, lng: longitude });
      updateData({ gpsLat: latitude, gpsLng: longitude });
      Alert.alert('Location Captured', `Coordinates recorded (${latitude.toFixed(5)}, ${longitude.toFixed(5)})`);
    } catch {
      Alert.alert('Error', 'Could not capture location. Please try again.');
    }
    setCapturing(null);
  };

  const handleStoreFrontPhoto = async () => {
    setCapturing('front');
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera access is required for store verification.');
      setCapturing(null);
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: 'images',
      quality: 0.8,
      allowsEditing: false,
    });
    setCapturing(null);
    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      setStoreFrontUri(uri);
      updateData({ shopFrontPhotoUri: uri });
    }
  };

  const handleSelfie = async () => {
    setCapturing('selfie');
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera access is required for identity verification.');
      setCapturing(null);
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: 'images',
      quality: 0.8,
      cameraType: ImagePicker.CameraType.front,
      allowsEditing: false,
    });
    setCapturing(null);
    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      setSelfieUri(uri);
      updateData({ selfiePhotoUri: uri });
    }
  };

  const handleAdditionalPhoto = async () => {
    if (additionalUris.length >= 4) return;
    setCapturing('extra');
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      quality: 0.7,
      allowsMultipleSelection: false,
    });
    setCapturing(null);
    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      const next = [...additionalUris, uri];
      setAdditionalUris(next);
      updateData({ additionalPhotoUris: next });
    }
  };

  const handleContinue = () => {
    goNext({ shopFrontPhotoUri: storeFrontUri, selfiePhotoUri: selfieUri });
  };

  const steps = [
    {
      icon: MapPin,
      title: 'Capture Store Location',
      desc: 'We need to confirm the physical location of your store.',
      done: gpsCapture !== null,
      loading: capturing === 'gps',
      action: handleCaptureGPS,
      actionLabel: gpsCapture
        ? `Location captured (${gpsCapture.lat.toFixed(4)}, ${gpsCapture.lng.toFixed(4)})`
        : 'Capture my store location',
      preview: null,
    },
    {
      icon: Camera,
      title: 'Store Front Photo',
      desc: 'Take a clear photo showing your shop name, signage, and entrance.',
      done: storeFrontUri !== null,
      loading: capturing === 'front',
      action: handleStoreFrontPhoto,
      actionLabel: storeFrontUri ? 'Photo saved — tap to retake' : 'Take store front photo',
      preview: storeFrontUri,
    },
    {
      icon: User,
      title: 'Owner Face ID',
      desc: 'Take a clear selfie. Remove glasses, hats, or anything covering your face.',
      done: selfieUri !== null,
      loading: capturing === 'selfie',
      action: handleSelfie,
      actionLabel: selfieUri ? 'Selfie saved — tap to retake' : 'Take selfie',
      preview: selfieUri,
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
        {steps.map((item, idx) => {
          const Icon = item.icon;
          return (
            <View
              key={idx}
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 16,
                padding: 18,
                borderWidth: 1,
                borderColor: item.done ? '#D1FAE5' : '#E2E8F0',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: item.preview ? 10 : 10, gap: 12 }}>
                <View
                  style={{
                    width: 44, height: 44, borderRadius: 12,
                    backgroundColor: item.done ? '#D1FAE5' : '#F1F5F9',
                    alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  {item.done ? <CheckCircle size={22} color={colors.ventureroot.green} /> : <Icon size={22} color="#64748B" />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: '#0F172A' }}>{item.title}</Text>
                  <Text style={{ fontSize: 12, color: '#64748B', lineHeight: 17, marginTop: 2 }}>{item.desc}</Text>
                </View>
              </View>

              {item.preview && (
                <Image
                  source={{ uri: item.preview }}
                  style={{ width: '100%', height: 100, borderRadius: 10, marginBottom: 10 }}
                  resizeMode="cover"
                />
              )}

              <TouchableOpacity
                onPress={item.action}
                disabled={item.loading}
                activeOpacity={0.7}
                style={{
                  backgroundColor: item.done ? '#F0FDF4' : colors.ventureroot.green,
                  borderRadius: 10, paddingVertical: 12, alignItems: 'center',
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: item.done ? colors.ventureroot.green : '#FFFFFF' }}>
                  {item.loading ? 'Please wait...' : item.actionLabel}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}

        {/* Additional photos */}
        <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 18, borderWidth: 1, borderColor: '#E2E8F0' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 12 }}>
            <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' }}>
              <ImageIcon size={22} color="#64748B" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#0F172A' }}>Additional Photos (Optional)</Text>
              <Text style={{ fontSize: 12, color: '#64748B', lineHeight: 17, marginTop: 2 }}>
                Shelves, stock, price tags, association certificate ({additionalUris.length}/4)
              </Text>
            </View>
          </View>

          {additionalUris.length > 0 && (
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
              {additionalUris.map((uri, i) => (
                <Image key={i} source={{ uri }} style={{ width: 64, height: 64, borderRadius: 8 }} resizeMode="cover" />
              ))}
            </View>
          )}

          {additionalUris.length < 4 && (
            <TouchableOpacity
              onPress={handleAdditionalPhoto}
              disabled={capturing === 'extra'}
              activeOpacity={0.7}
              style={{ backgroundColor: '#F1F5F9', borderRadius: 10, paddingVertical: 12, alignItems: 'center' }}
            >
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#475569' }}>
                {capturing === 'extra' ? 'Opening gallery...' : `Add photo (${additionalUris.length}/4)`}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </OnboardingShell>
  );
};

export default StoreVerificationScreen;
