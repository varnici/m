import React, { useState } from 'react';
import { Alert, TextInput, TouchableOpacity, View, useColorScheme } from 'react-native';
import type { RootStackScreenProps } from '@/navigation/types';
import { sendEmailOtp } from '@/lib/emailOtp';
import {
  IndustrialPage,
  IndustrialText,
  IndustrialButton,
  IndustrialCard,
  useIndustrialTheme,
} from '@/components/ui/IndustrialComponents';
import { ArrowLeft, Mail } from 'lucide-react-native';
import { colors, spacing } from '@/theme/colors';

export default function EmailEntryScreen({ navigation }: RootStackScreenProps<'EmailEntry'>) {
  const [email, setEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const theme = useIndustrialTheme();
  const isDark = useColorScheme() === 'dark';

  const handleSend = async () => {
    const normalized = email.trim().toLowerCase();
    if (!normalized || !normalized.includes('@')) {
      Alert.alert('Invalid email', 'Enter a valid email address.');
      return;
    }
    setIsSending(true);
    try {
      await sendEmailOtp(normalized);
      navigation.navigate('OtpEntry', {
        channel: 'email',
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
          <IndustrialText variant="label" style={{ color: colors.ventureroot.industrial.primary, marginBottom: 8 }}>
            EMAIL VERIFICATION
          </IndustrialText>
          <IndustrialText variant="h1">VERIFY{'\n'}YOUR EMAIL</IndustrialText>
          <View style={{ width: 40, height: 4, backgroundColor: colors.ventureroot.industrial.primary, marginTop: 16 }} />
          <IndustrialText variant="body" style={{ marginTop: 12, opacity: 0.6 }}>
            We'll send a 6-digit code to your email address.
          </IndustrialText>
        </View>

        <IndustrialCard variant="low" style={{ padding: 24 }}>
          <IndustrialText variant="label" style={{ marginBottom: 8, opacity: 0.6 }}>
            EMAIL ADDRESS
          </IndustrialText>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: theme.surfaceLow,
            borderWidth: 1,
            borderColor: theme.outline,
            borderRadius: 12,
            paddingHorizontal: 16,
            marginBottom: 24,
          }}>
            <Mail size={18} color={colors.ventureroot.industrial.primary} style={{ marginRight: 12 }} />
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@domain.com"
              placeholderTextColor={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              style={{ flex: 1, paddingVertical: 12, color: theme.onSurface, fontSize: 14 }}
            />
          </View>

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
