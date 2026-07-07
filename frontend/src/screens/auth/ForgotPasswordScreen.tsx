import React, { useState } from 'react';
import {
  Alert,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
import type { RootStackScreenProps } from '@/navigation/types';
import { supabase } from '@/lib/supabase';
import {
  IndustrialPage,
  IndustrialText,
  IndustrialButton,
  IndustrialCard,
  useIndustrialTheme,
} from '@/components/ui/IndustrialComponents';
import { ArrowLeft, Mail, CheckCircle } from 'lucide-react-native';
import { colors, spacing } from '@/theme/colors';

const ForgotPasswordScreen = ({ navigation }: RootStackScreenProps<'ForgotPassword'>) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const theme = useIndustrialTheme();
  const isDark = useColorScheme() === 'dark';

  const handleSend = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      Alert.alert('Email required', 'Please enter your registered email address.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      Alert.alert('Invalid email', 'Please enter a valid email address.');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: 'ventureroot://reset-password',
      });
      if (error) throw error;
      setSent(true);
    } catch (err: any) {
      Alert.alert('Could not send reset link', err.message || 'Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (sent) {
    return (
      <IndustrialPage>
        <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 20 }}>
          <TouchableOpacity onPress={() => navigation.navigate('Login')} style={{ marginBottom: 32 }}>
            <ArrowLeft size={24} color={theme.onSurface} />
          </TouchableOpacity>

          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 80 }}>
            <View
              style={{
                width: 80, height: 80, borderRadius: 40,
                backgroundColor: '#F0FDF4',
                alignItems: 'center', justifyContent: 'center',
                marginBottom: 24,
              }}
            >
              <CheckCircle size={40} color={colors.ventureroot.green} />
            </View>

            <IndustrialText variant="h1" style={{ textAlign: 'center', marginBottom: 12 }}>
              CHECK YOUR{'\n'}EMAIL
            </IndustrialText>
            <View style={{ width: 40, height: 4, backgroundColor: colors.ventureroot.industrial.primary, marginBottom: 20 }} />

            <IndustrialText style={{ textAlign: 'center', opacity: 0.6, lineHeight: 22, paddingHorizontal: 16 }}>
              We sent a password reset link to{'\n'}
              <IndustrialText style={{ color: colors.ventureroot.industrial.primary, fontWeight: '700' }}>
                {email.trim().toLowerCase()}
              </IndustrialText>
              {'\n\n'}
              Open the link in your email to set a new password. Check your spam folder if you don't see it.
            </IndustrialText>

            <TouchableOpacity
              onPress={() => { setSent(false); setEmail(''); }}
              style={{ marginTop: 32 }}
            >
              <IndustrialText variant="label" style={{ color: colors.ventureroot.industrial.primary, opacity: 0.8 }}>
                Use a different email
              </IndustrialText>
            </TouchableOpacity>
          </View>

          <View style={{ paddingBottom: spacing.lg }}>
            <IndustrialButton
              title="Back to Sign In"
              onPress={() => navigation.navigate('Login')}
            />
          </View>
        </View>
      </IndustrialPage>
    );
  }

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
          Enter the email address linked to your VentureRoot account and we'll send you a secure reset link.
        </IndustrialText>

        <IndustrialCard variant="low" style={{ padding: 24 }}>
          <IndustrialText variant="label" style={{ marginBottom: 8, opacity: 0.6 }}>
            EMAIL ADDRESS
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
            <Mail size={18} color={colors.ventureroot.industrial.primary} style={{ marginRight: 12 }} />
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@domain.com"
              placeholderTextColor={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'}
              keyboardType="email-address"
              autoCapitalize="none"
              autoFocus
              returnKeyType="send"
              onSubmitEditing={handleSend}
              style={{ flex: 1, paddingVertical: 12, color: theme.onSurface, fontSize: 14 }}
            />
          </View>

          <IndustrialButton
            title={isLoading ? 'SENDING...' : 'SEND RESET LINK'}
            onPress={handleSend}
            disabled={isLoading || !email.trim()}
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
