import React, { useState } from 'react';
import {
  Alert,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
import type { RootStackScreenProps } from '@/navigation/types';
import { passwordResetService } from '@/services/passwordResetService';
import { validatePhone, formatPhoneInput } from '@/utils/validation';
import {
  IndustrialPage,
  IndustrialText,
  IndustrialButton,
  IndustrialCard,
  useIndustrialTheme,
} from '@/components/ui/IndustrialComponents';
import { ArrowLeft, Smartphone } from 'lucide-react-native';
import { colors, spacing } from '@/theme/colors';

const buildE164 = (raw: string) => {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('234') && digits.length === 13) return `+${digits}`;
  const local = digits.startsWith('0') ? digits.slice(1) : digits;
  return `+234${local}`;
};

const ForgotPasswordScreen = ({ navigation }: RootStackScreenProps<'ForgotPassword'>) => {
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const theme = useIndustrialTheme();
  const isDark = useColorScheme() === 'dark';

  const phoneValidation = phone ? validatePhone(phone) : { valid: false };

  const handleSend = async () => {
    if (!phoneValidation.valid) {
      Alert.alert('Invalid phone number', 'Enter a valid Nigerian phone number.');
      return;
    }

    const e164Phone = buildE164(phone);
    setIsLoading(true);
    try {
      await passwordResetService.requestReset(e164Phone);
      // Always proceeds regardless of whether the number is registered —
      // the backend deliberately gives the same response either way so
      // this screen can't be used to check which phone numbers exist.
      navigation.navigate('ResetPassword', { phone: e164Phone });
    } catch (err: any) {
      Alert.alert('Could not send code', err.message || 'Please try again.');
    } finally {
      setIsLoading(false);
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
            ACCOUNT RECOVERY
          </IndustrialText>
          <IndustrialText variant="h1">
            FORGOT{'\n'}PASSWORD?
          </IndustrialText>
          <View style={{ width: 40, height: 4, backgroundColor: colors.ventureroot.industrial.primary, marginTop: 16 }} />
        </View>

        <IndustrialText style={{ opacity: 0.6, marginBottom: 32, lineHeight: 22 }}>
          Enter the phone number linked to your VentureRoot account and we'll text you a 6-digit code.
        </IndustrialText>

        <IndustrialCard variant="low" style={{ padding: 24 }}>
          <IndustrialText variant="label" style={{ marginBottom: 8, opacity: 0.6 }}>
            PHONE NUMBER
          </IndustrialText>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: theme.surfaceLow,
              borderWidth: 1,
              borderColor: theme.outline,
              borderRadius: 12,
              paddingHorizontal: 16,
              marginBottom: spacing.md,
            }}
          >
            <Smartphone size={18} color={colors.ventureroot.industrial.primary} style={{ marginRight: 12 }} />
            <IndustrialText style={{ marginRight: 8, fontWeight: '700' }}>+234</IndustrialText>
            <TextInput
              value={phone}
              onChangeText={(t) => setPhone(formatPhoneInput(t))}
              placeholder="801 234 5678"
              placeholderTextColor={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'}
              keyboardType="phone-pad"
              autoFocus
              returnKeyType="send"
              onSubmitEditing={handleSend}
              style={{ flex: 1, paddingVertical: 12, color: theme.onSurface, fontSize: 14 }}
            />
          </View>

          <IndustrialButton
            title={isLoading ? 'SENDING...' : 'SEND CODE'}
            onPress={handleSend}
            disabled={isLoading || !phoneValidation.valid}
          />
        </IndustrialCard>

        <TouchableOpacity
          onPress={() => navigation.navigate('Login')}
          style={{ marginTop: 24, padding: 16, alignItems: 'center' }}
        >
          <IndustrialText variant="label" style={{ opacity: 0.4 }}>
            REMEMBERED IT?{' '}
            <IndustrialText variant="label" style={{ color: colors.ventureroot.industrial.primary }}>
              SIGN IN
            </IndustrialText>
          </IndustrialText>
        </TouchableOpacity>
      </View>
    </IndustrialPage>
  );
};

export default ForgotPasswordScreen;
