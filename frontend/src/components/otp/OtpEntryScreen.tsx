/**
 * Reusable OTP entry screen — handles both email and phone verification.
 *
 * Props (via route.params):
 *   channel  — 'email' | 'phone'
 *   target   — the email address or phone number the code was sent to
 *   display? — optional label shown in the "sent to" subtitle (defaults to target)
 *
 * On success the Supabase session is set; AuthContext picks it up and routes
 * the user automatically — no explicit navigation needed from here.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
import type { RootStackScreenProps } from '@/navigation/types';
import { verifyEmailOtp } from '@/lib/emailOtp';
import { verifyPhoneOtp } from '@/lib/phoneOtp';
import { sendEmailOtp } from '@/lib/emailOtp';
import { sendPhoneOtp } from '@/lib/phoneOtp';
import {
  IndustrialPage,
  IndustrialText,
  IndustrialButton,
  IndustrialCard,
  useIndustrialTheme,
} from '@/components/ui/IndustrialComponents';
import { ArrowLeft, Mail, Phone } from 'lucide-react-native';
import { colors, spacing } from '@/theme/colors';

const CODE_LENGTH = 6;
const RESEND_COOLDOWN = 60;

export default function OtpEntryScreen({ navigation, route }: RootStackScreenProps<'OtpEntry'>) {
  const { channel, target, display } = route.params;
  const label = display ?? target;

  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const theme = useIndustrialTheme();
  const isDark = useColorScheme() === 'dark';

  // Countdown for resend
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown(s => (s <= 1 ? 0 : s - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const code = digits.join('');

  const handleDigit = (text: string, index: number) => {
    const char = text.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[index] = char;
    setDigits(next);
    if (char && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    if (code.length < CODE_LENGTH) {
      Alert.alert('Incomplete code', 'Enter all 6 digits.');
      return;
    }
    setIsVerifying(true);
    try {
      if (channel === 'email') {
        await verifyEmailOtp(target, code);
      } else {
        await verifyPhoneOtp(target, code);
      }
      // Session is now set — AuthContext + RootNavigator handle routing
    } catch (err: any) {
      Alert.alert('Verification failed', err.message || 'Please check the code and try again.');
      setDigits(Array(CODE_LENGTH).fill(''));
      setTimeout(() => inputRefs.current[0]?.focus(), 50);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setIsResending(true);
    try {
      if (channel === 'email') {
        await sendEmailOtp(target);
      } else {
        await sendPhoneOtp(target);
      }
      setCooldown(RESEND_COOLDOWN);
      setDigits(Array(CODE_LENGTH).fill(''));
      setTimeout(() => inputRefs.current[0]?.focus(), 50);
      Alert.alert('Code sent', `A new code was sent to ${label}.`);
    } catch (err: any) {
      Alert.alert('Resend failed', err.message || 'Could not resend code.');
    } finally {
      setIsResending(false);
    }
  };

  const ChannelIcon = channel === 'email' ? Mail : Phone;
  const channelColor = channel === 'email'
    ? colors.ventureroot.industrial.primary
    : '#16a34a';

  return (
    <IndustrialPage>
      <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 20 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginBottom: 32 }}>
          <ArrowLeft size={24} color={theme.onSurface} />
        </TouchableOpacity>

        <View style={{ marginBottom: 32 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <ChannelIcon size={16} color={channelColor} style={{ marginRight: 6 }} />
            <IndustrialText variant="label" style={{ color: channelColor }}>
              {channel === 'email' ? 'EMAIL' : 'PHONE'} VERIFICATION
            </IndustrialText>
          </View>
          <IndustrialText variant="h1">ENTER{'\n'}YOUR CODE</IndustrialText>
          <View style={{ width: 40, height: 4, backgroundColor: channelColor, marginTop: 16 }} />
          <IndustrialText variant="body" style={{ marginTop: 12, opacity: 0.6 }}>
            We sent a 6-digit code to {label}
          </IndustrialText>
        </View>

        <IndustrialCard variant="low" style={{ padding: 24 }}>
          {/* Digit boxes */}
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 28 }}>
            {digits.map((d, i) => (
              <TextInput
                key={i}
                ref={r => { inputRefs.current[i] = r; }}
                value={d}
                onChangeText={t => handleDigit(t, i)}
                onKeyPress={({ nativeEvent: { key } }) => handleKeyPress(key, i)}
                keyboardType="number-pad"
                maxLength={1}
                selectTextOnFocus
                style={{
                  width: 44,
                  height: 52,
                  borderWidth: 2,
                  borderColor: d ? channelColor : theme.outline,
                  borderRadius: 10,
                  textAlign: 'center',
                  fontSize: 22,
                  fontWeight: '700',
                  color: theme.onSurface,
                  backgroundColor: theme.surfaceLow,
                }}
              />
            ))}
          </View>

          <IndustrialButton
            title={isVerifying ? 'VERIFYING...' : 'VERIFY CODE'}
            onPress={handleVerify}
            disabled={isVerifying || code.length < CODE_LENGTH}
          />

          <TouchableOpacity
            onPress={handleResend}
            disabled={isResending || cooldown > 0}
            style={{ marginTop: 20, alignItems: 'center', paddingVertical: 8 }}
          >
            <IndustrialText
              variant="label"
              style={{
                fontSize: 11,
                color: cooldown > 0 ? theme.onSurface : channelColor,
                opacity: cooldown > 0 ? 0.4 : 1,
              }}
            >
              {cooldown > 0
                ? `RESEND CODE IN ${cooldown}s`
                : isResending
                  ? 'SENDING...'
                  : 'RESEND CODE'}
            </IndustrialText>
          </TouchableOpacity>
        </IndustrialCard>
      </View>
    </IndustrialPage>
  );
}
