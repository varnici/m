import React, { useState } from 'react';
import { View, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RootStackScreenProps } from '@/navigation/types';
import { Delete, ShieldCheck, FingerprintPattern, Lock, ArrowRight } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { IndustrialText } from '../../components/ui/IndustrialComponents';

const PINSetupScreen = ({ navigation }: RootStackScreenProps<'PINSetup'>) => {
  const [pin, setPin] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [firstPin, setFirstPin] = useState('');
  const [error, setError] = useState(false);

  const handlePress = (val: string) => {
    if (pin.length < 6) {
      const newPin = pin + val;
      setPin(newPin);
      setError(false);
      
      if (newPin.length === 6) {
        if (!confirming) {
          // Transition to confirmation mode
          setTimeout(() => {
            setFirstPin(newPin);
            setPin('');
            setConfirming(true);
          }, 300);
        } else {
          // Check if matches
          if (newPin === firstPin) {
             // Success - Proceed to Terms Gateway (Retail Flow)
             setTimeout(() => navigation.navigate('OnboardingTerms'), 500);
          } else {
             // Error - Reset confirmation
             setError(true);
             setTimeout(() => {
               setPin('');
             }, 800);
          }
        }
      }
    }
  };

  const handleDelete = () => {
    setPin(pin.slice(0, -1));
    setError(false);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#131313' }}>
      <StatusBar barStyle="light-content" />
      
      <View style={{ flex: 1, paddingHorizontal: 32, paddingTop: 60 }}>
        
        {/* Monolith Header */}
        <View style={{ alignItems: 'flex-start', marginBottom: 60 }}>
          <IndustrialText variant="label" style={{ color: colors.ventureroot.industrial.primary, letterSpacing: 4, marginBottom: 8 }}>
            SECURITY LAYER
          </IndustrialText>
          <IndustrialText variant="h1" style={{ fontSize: 42, lineHeight: 48 }}>
            {confirming ? 'CONFIRM\nPROTOCOL' : 'ACCESS\nIDENTIFIER'}
          </IndustrialText>
          <View style={{ width: 40, height: 4, backgroundColor: colors.ventureroot.industrial.primary, marginTop: 24 }} />
          
          <IndustrialText style={{ marginTop: 20, opacity: 0.4, fontSize: 13, lineHeight: 20 }}>
            Establish a 6-digit cryptographic PIN for institutional authorization and transaction signing.
          </IndustrialText>
        </View>

        {/* PIN Indicators - Industrial Style */}
        <View style={{ alignItems: 'center', marginBottom: 60 }}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <View 
                key={i} 
                style={{ 
                  width: 20, 
                  height: 20, 
                  borderWidth: 1,
                  borderColor: pin.length >= i ? colors.ventureroot.industrial.primary : 'rgba(255,255,255,0.1)',
                  backgroundColor: pin.length >= i 
                    ? colors.ventureroot.industrial.primary 
                    : 'transparent',
                  borderRadius: 0,
                  transform: [{ rotate: '45deg' }], // Diamond shape for more "Industrial" feel
                }} 
              />
            ))}
          </View>
          
          {confirming && !error && (
            <View style={{ marginTop: 32, backgroundColor: 'rgba(39, 174, 96, 0.1)', paddingVertical: 8, paddingHorizontal: 16 }}>
              <IndustrialText variant="label" style={{ color: colors.ventureroot.industrial.primary, fontSize: 9, letterSpacing: 2 }}>
                STATUS: WAITING_FOR_SYNC
              </IndustrialText>
            </View>
          )}
          
          {error && (
            <View style={{ marginTop: 32, backgroundColor: 'rgba(255, 75, 75, 0.1)', paddingVertical: 8, paddingHorizontal: 16 }}>
              <IndustrialText variant="label" style={{ color: '#FF4B4B', fontSize: 9, letterSpacing: 2 }}>
                ERROR: VERIFICATION_FAILED
              </IndustrialText>
            </View>
          )}
        </View>

        {/* Numeric Keypad - Tonal Shift Design */}
        <View style={{ flex: 1, justifyContent: 'flex-end', paddingBottom: 40 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'SKIP', '0'].map((v, i) => (
               v === 'SKIP' ? (
                <View key={i} style={{ width: '30%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center' }}>
                  <FingerprintPattern size={28} color="rgba(255,255,255,0.05)" />
                </View>
               ) : (
                <TouchableOpacity
                  key={v}
                  activeOpacity={0.7}
                  style={{ 
                    width: '30%', 
                    aspectRatio: 1, 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    marginBottom: 12, 
                    backgroundColor: 'rgba(255,255,255,0.03)'
                  }}
                  onPress={() => handlePress(v)}
                >
                  <IndustrialText style={{ fontSize: 28, fontWeight: '700' }}>{v}</IndustrialText>
                </TouchableOpacity>
               )
            ))}
            <TouchableOpacity 
              activeOpacity={0.7}
              style={{ 
                width: '30%', 
                aspectRatio: 1, 
                alignItems: 'center', 
                justifyContent: 'center', 
                marginBottom: 12, 
                backgroundColor: 'rgba(255,255,255,0.05)'
              }}
              onPress={handleDelete}
            >
              <Delete size={28} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Security Footer */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 20, opacity: 0.2 }}>
          <ShieldCheck size={12} color={colors.ventureroot.industrial.primary} />
          <IndustrialText variant="label" style={{ fontSize: 8, marginLeft: 8, letterSpacing: 1 }}>
            ENCRYPTION_PROTOCOL: AES_256_VRT
          </IndustrialText>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default PINSetupScreen;


