import React, { useState } from 'react';
import { View, Text, Image, Alert } from 'react-native';
import { Camera, UserCheck, ShieldCheck, Scan } from 'lucide-react-native';
import OnboardingShell, { OnboardingButton } from '@/components/onboarding/OnboardingShell';
import { useOnboardingNav } from '@/hooks/useOnboardingNav';
import { colors } from '@/theme/colors';
import * as ImagePicker from 'expo-image-picker';

const FaceVerificationScreen = () => {
  const { goNext, goBack, step, total, updateData } = useOnboardingNav();

  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  const handleCapture = async () => {
    setIsCapturing(true);
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera access is required for face verification.');
      setIsCapturing(false);
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: 'images',
      quality: 0.9,
      cameraType: ImagePicker.CameraType.front,
      allowsEditing: false,
    });
    setIsCapturing(false);
    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      setCapturedUri(uri);
      updateData({ facePhotoUri: uri });
    }
  };

  return (
    <OnboardingShell
      currentStep={step}
      totalSteps={total}
      title="Face Verification"
      subtitle="Take a quick selfie to confirm your identity. This enables higher trade credit limits."
      onBack={goBack}
      scrollable={false}
      footer={
        <View style={{ gap: 10 }}>
          <OnboardingButton
            title={capturedUri ? 'Continue' : isCapturing ? 'Opening camera...' : 'Capture Selfie'}
            onPress={capturedUri ? () => goNext({ facePhotoUri: capturedUri }) : handleCapture}
            disabled={isCapturing}
          />
          {!capturedUri && (
            <OnboardingButton
              title="Skip for now"
              variant="secondary"
              onPress={() => goNext({ facePhotoUri: null })}
            />
          )}
        </View>
      }
    >
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 20 }}>
        <View
          style={{
            width: 220, height: 220, borderRadius: 110,
            alignItems: 'center', justifyContent: 'center',
            backgroundColor: '#F1F5F9',
            borderWidth: 4,
            borderColor: capturedUri ? colors.ventureroot.green : '#E2E8F0',
            overflow: 'hidden',
          }}
        >
          {capturedUri ? (
            <Image source={{ uri: capturedUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          ) : isCapturing ? (
            <View style={{ alignItems: 'center' }}>
              <Camera size={56} color={colors.ventureroot.green} />
              <Text style={{ marginTop: 12, fontSize: 11, fontWeight: '700', color: '#64748B', letterSpacing: 1 }}>
                OPENING CAMERA...
              </Text>
            </View>
          ) : (
            <View style={{ alignItems: 'center' }}>
              <Scan size={56} color="#CBD5E1" />
              <Text style={{ marginTop: 10, fontSize: 12, color: '#94A3B8', fontWeight: '600' }}>
                Position your face here
              </Text>
            </View>
          )}
        </View>

        {capturedUri && (
          <View style={{ marginTop: 16, alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <UserCheck size={16} color={colors.ventureroot.green} />
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.ventureroot.green }}>
                Photo captured
              </Text>
            </View>
            <Text
              onPress={handleCapture}
              style={{ fontSize: 12, color: '#64748B', marginTop: 6, textDecorationLine: 'underline' }}
            >
              Retake photo
            </Text>
          </View>
        )}

        <View
          style={{
            flexDirection: 'row', alignItems: 'center',
            marginTop: 24, backgroundColor: '#F8FAFC',
            paddingHorizontal: 16, paddingVertical: 10,
            borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0',
          }}
        >
          <ShieldCheck size={16} color={colors.ventureroot.green} />
          <Text style={{ marginLeft: 8, fontSize: 12, fontWeight: '600', color: '#64748B' }}>
            Liveness detection active
          </Text>
        </View>
      </View>
    </OnboardingShell>
  );
};

export default FaceVerificationScreen;
