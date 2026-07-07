import React, { useState } from 'react';
import { Alert, TextInput, TouchableOpacity, View, useColorScheme } from 'react-native';
import type { RootStackScreenProps } from '@/navigation/types';
import { sendPhoneOtp } from '@/lib/phoneOtp';
import {
  IndustrialPage,
  IndustrialText,
  IndustrialButton,
  IndustrialCard,
  useIndustrialTheme,
} from '@/components/ui/IndustrialComponents';
import { ArrowLeft, Phone } from 'lucide-react-native';
import { colors } from '@/theme/colors';

export default function PhoneEntryScreen({ navigation }: RootStackScreenProps<'PhoneEntry'>) {
  const [phone, setPhone] = useState('');
  const [isSending, setIsSending] = useState(false);
  const theme = useIndustrialTheme();
  const isDark = useColorScheme() === 'dark';

  const handleSend = async () => {
    const normalized = phone.trim();
    if (!normalized.startsWith('+') || normalized.length < 8) {
      Alert.alert('Invalid phone', 'Enter a phone number in international format, e.g. +2348012345678');
      return;
    }
    setIsSending(true);
    try {
      await sendPhoneOtp(normalized);
      navigation.navigate('OtpEntry', {
        channel: 'phone',
        target: normalized,
        display: normalized,
      });
    } catch (err: any) {
      Alert.alert('Could not send code', err.message || 'Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <IndustrialPage>
      <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 20 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginBottom: 32 }}>
          <ArrowLeft size={24} color={theme.onSurface} />
        </TouchableOpacity>

        <View style={{ marginBottom: 40 }}>
          <IndustrialText variant="label" style={{ color: '#16a34a', marginBottom: 8 }}>
            PHONE VERIFICATION
          </IndustrialText>
          <IndustrialText variant="h1">VERIFY{'\n'}YOUR PHONE</IndustrialText>
          <View style={{ width: 40, height: 4, backgroundColor: '#16a34a', marginTop: 16 }} />
          <IndustrialText variant="body" style={{ marginTop: 12, opacity: 0.6 }}>
            We'll send a 6-digit SMS code to your phone number.
          </IndustrialText>
        </View>

        <IndustrialCard variant="low" style={{ padding: 24 }}>
          <IndustrialText variant="label" style={{ marginBottom: 8, opacity: 0.6 }}>
            PHONE NUMBER (INTERNATIONAL FORMAT)
          </IndustrialText>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: theme.surfaceLow,
            borderWidth: 1,
            borderColor: theme.outline,
            borderRadius: 12,
            paddingHorizontal: 16,
            marginBottom: 8,
          }}>
            <Phone size={18} color="#16a34a" style={{ marginRight: 12 }} />
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder="+2348012345678"
              placeholderTextColor={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'}
              keyboardType="phone-pad"
              autoComplete="tel"
              style={{ flex: 1, paddingVertical: 12, color: theme.onSurface, fontSize: 14 }}
            />
          </View>
          <IndustrialText variant="label" style={{ fontSize: 10, opacity: 0.4, marginBottom: 24 }}>
            INCLUDE COUNTRY CODE, E.G. +234 FOR NIGERIA
          </IndustrialText>

          <IndustrialButton
            title={isSending ? 'SENDING...' : 'SEND CODE'}
            onPress={handleSend}
            disabled={isSending}
          />
        </IndustrialCard>
      </View>
    </IndustrialPage>
  );
}
