import React, { useState } from 'react';
import { Alert, View, TouchableOpacity, StatusBar, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RootStackScreenProps } from '@/navigation/types';
import { Delete, ShieldCheck, FingerprintPattern, Lock, ArrowRight } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { IndustrialPage, IndustrialText, useIndustrialTheme } from '../../components/ui/IndustrialComponents';
import { useSecurityStore } from '@/store/securityStore';
import { NumericKeypad } from '@/components/security/NumericKeypad';
import { userService } from '@/services/userService';

const PINSetupScreen = ({ navigation }: RootStackScreenProps<'PINSetup'>) => {
  const { setSecurityType, setIsLocked } = useSecurityStore();
  const [pin, setPin] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [firstPin, setFirstPin] = useState('');
  const [error, setError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const theme = useIndustrialTheme();
  const isDark = useColorScheme() === 'dark';

  const persistPin = async (nextPin: string) => {
    try {
      setIsSaving(true);
      await userService.updateSecurity({
        new_pin: nextPin,
        security_type: 'pin',
      });
      setSecurityType('pin');
      setIsLocked(false);
      setTimeout(() => navigation.navigate('OnboardingTerms'), 500);
    } catch {
      setError(true);
      setPin('');
      setConfirming(false);
      setFirstPin('');
      Alert.alert('Security setup failed', 'Unable to save PIN right now. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePress = (val: string) => {
    if (isSaving) {
      return;
    }
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
             // Save hashed PIN on backend and proceed
             void persistPin(newPin);
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
    if (isSaving) {
      return;
    }
    setPin(pin.slice(0, -1));
    setError(false);
  };

  return (
    <IndustrialPage>
      <View style={{ flex: 1, paddingHorizontal: 32, paddingTop: 60 }}>
        
        {/* Header */}
        <View style={{ alignItems: 'flex-start', marginBottom: 60 }}>
          <IndustrialText variant="label" style={{ color: colors.ventureroot.industrial.primary, letterSpacing: 4, marginBottom: 8 }}>
            SECURITY SETUP
          </IndustrialText>
          <IndustrialText variant="h1" style={{ fontSize: 42, lineHeight: 48 }}>
            {confirming ? 'CONFIRM\nYOUR PIN' : 'CREATE\nACCESS PIN'}
          </IndustrialText>
          <View style={{ width: 40, height: 4, backgroundColor: colors.ventureroot.industrial.primary, marginTop: 24 }} />
          
          <IndustrialText style={{ marginTop: 20, opacity: 0.4, fontSize: 13, lineHeight: 20 }}>
            Create a 6-digit PIN to secure your account and authorize transactions.
          </IndustrialText>
        </View>

        {/* PIN Indicators */}
        <View style={{ alignItems: 'center', marginBottom: 60 }}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <View 
                key={i} 
                style={{ 
                  width: 20, 
                  height: 20, 
                  borderWidth: 1,
                  borderColor: pin.length >= i ? colors.ventureroot.industrial.primary : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'),
                  backgroundColor: pin.length >= i 
                    ? colors.ventureroot.industrial.primary 
                    : 'transparent',
                  borderRadius: 4,
                }} 
              />
            ))}
          </View>
          
          {confirming && !error && (
            <View style={{ marginTop: 32, backgroundColor: 'rgba(39, 174, 96, 0.1)', paddingVertical: 8, paddingHorizontal: 16 }}>
              <IndustrialText variant="label" style={{ color: colors.ventureroot.industrial.primary, fontSize: 9, letterSpacing: 2 }}>
                PLEASE RE-ENTER YOUR PIN
              </IndustrialText>
            </View>
          )}
          
          {error && (
            <View style={{ marginTop: 32, backgroundColor: 'rgba(255, 75, 75, 0.1)', paddingVertical: 8, paddingHorizontal: 16 }}>
              <IndustrialText variant="label" style={{ color: '#FF4B4B', fontSize: 9, letterSpacing: 2 }}>
                PINS DO NOT MATCH. TRY AGAIN.
              </IndustrialText>
            </View>
          )}

          {isSaving && (
            <View style={{ marginTop: 32, backgroundColor: 'rgba(39, 174, 96, 0.1)', paddingVertical: 8, paddingHorizontal: 16 }}>
              <IndustrialText variant="label" style={{ color: colors.ventureroot.industrial.primary, fontSize: 9, letterSpacing: 2 }}>
                SAVING SECURITY SETTINGS...
              </IndustrialText>
            </View>
          )}
        </View>

        {/* Numeric Keypad */}
        <View style={{ flex: 1, justifyContent: 'flex-end', paddingBottom: 40 }}>
          <NumericKeypad onPress={handlePress} onDelete={handleDelete} />
        </View>

        {/* Footer */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 20, opacity: 0.3 }}>
          <ShieldCheck size={12} color={colors.ventureroot.industrial.primary} />
          <IndustrialText variant="label" style={{ fontSize: 8, marginLeft: 8, letterSpacing: 1 }}>
            SECURED BY VENTUREROOT
          </IndustrialText>
        </View>
      </View>
    </IndustrialPage>
  );
};

export default PINSetupScreen;


