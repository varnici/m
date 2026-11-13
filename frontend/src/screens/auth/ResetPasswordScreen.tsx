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
import { passwordResetService } from '@/services/passwordResetService';
import {
  IndustrialPage,
  IndustrialText,
  IndustrialButton,
  IndustrialCard,
  useIndustrialTheme,
} from '@/components/ui/IndustrialComponents';
import { Lock, Eye, EyeOff, CheckCircle, RefreshCw } from 'lucide-react-native';
import { colors, spacing } from '@/theme/colors';

const ResetPasswordScreen = ({ navigation, route }: RootStackScreenProps<'ResetPassword'>) => {
  // Reached one of two ways: (a) the normal phone+SMS-OTP flow from
  // ForgotPasswordScreen, with route.params.phone set, or (b) the legacy
  // Supabase email-link deep-link path (RootNavigator's needsPasswordReset
  // gate) — that one arrives with no phone param but an active recovery
  // session already established by AuthContext, so it only needs a new
  // password, no code.
  const phone = route.params?.phone;
  const isOtpFlow = !!phone;

  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [done, setDone] = useState(false);
  const theme = useIndustrialTheme();
  const isDark = useColorScheme() === 'dark';

  const validate = (): string | null => {
    if (isOtpFlow && code.replace(/\s/g, '').length !== 6) return 'Enter the 6-digit code we texted you.';
    if (password.length < 8)      return 'Password must be at least 8 characters.';
    if (!/[A-Z]/.test(password))  return 'Include at least one uppercase letter (A–Z).';
    if (!/[0-9]/.test(password))  return 'Include at least one number (0–9).';
    if (!/[^A-Za-z0-9]/.test(password)) return 'Include at least one special character.';
    if (password !== confirmPassword) return 'Passwords do not match.';
    return null;
  };

  const handleReset = async () => {
    const err = validate();
    if (err) { Alert.alert('Invalid password', err); return; }

    setIsLoading(true);
    try {
      if (isOtpFlow) {
        await passwordResetService.confirmReset(phone!, code.replace(/\s/g, ''), password);
      } else {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
      }
      setDone(true);
    } catch (err: any) {
      Alert.alert('Reset failed', err.message || 'Could not update your password. The code may have expired.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!phone) return;
    setIsResending(true);
    try {
      await passwordResetService.requestReset(phone);
      Alert.alert('Code resent', `A new code has been texted to ${phone}.`);
    } catch (err: any) {
      Alert.alert('Could not resend code', err.message || 'Please try again shortly.');
    } finally {
      setIsResending(false);
    }
  };

  if (done) {
    return (
      <IndustrialPage>
        <View style={{ flex: 1, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center', paddingBottom: 80 }}>
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
            PASSWORD{'\n'}UPDATED
          </IndustrialText>
          <View style={{ width: 40, height: 4, backgroundColor: colors.ventureroot.industrial.primary, marginBottom: 20 }} />

          <IndustrialText style={{ textAlign: 'center', opacity: 0.6, lineHeight: 22 }}>
            Your password has been changed successfully.{'\n'}
            You can now sign in with your new password.
          </IndustrialText>

          <View style={{ marginTop: 40, width: '100%' }}>
            <IndustrialButton
              title="SIGN IN NOW"
              onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Login' }] })}
            />
          </View>
        </View>
      </IndustrialPage>
    );
  }

  const strengthItems = [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'One uppercase letter (A–Z)', met: /[A-Z]/.test(password) },
    { label: 'One number (0–9)', met: /[0-9]/.test(password) },
    { label: 'One special character', met: /[^A-Za-z0-9]/.test(password) },
  ];
  const strength = strengthItems.filter(i => i.met).length;
  const canSubmit = strength === 4 && !!confirmPassword && (!isOtpFlow || code.replace(/\s/g, '').length === 6);

  return (
    <IndustrialPage>
      <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 60 }}>
        <View style={{ marginBottom: 32 }}>
          <IndustrialText variant="label" style={{ color: colors.ventureroot.industrial.primary, marginBottom: 8 }}>
            ACCOUNT RECOVERY
          </IndustrialText>
          <IndustrialText variant="h1">
            SET NEW{'\n'}PASSWORD
          </IndustrialText>
          <View style={{ width: 40, height: 4, backgroundColor: colors.ventureroot.industrial.primary, marginTop: 16 }} />
          {isOtpFlow && (
            <IndustrialText style={{ opacity: 0.6, marginTop: 16, lineHeight: 20 }}>
              Enter the 6-digit code texted to {phone}, plus your new password.
            </IndustrialText>
          )}
        </View>

        <IndustrialCard variant="low" style={{ padding: 24 }}>
          {isOtpFlow && (
            <>
              <IndustrialText variant="label" style={{ marginBottom: 8, opacity: 0.6 }}>
                6-DIGIT CODE
              </IndustrialText>
              <View
                style={{
                  flexDirection: 'row', alignItems: 'center',
                  backgroundColor: theme.surfaceLow,
                  borderWidth: 1, borderColor: theme.outline,
                  borderRadius: 12, paddingHorizontal: 16, marginBottom: 8,
                }}
              >
                <TextInput
                  value={code}
                  onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  placeholderTextColor={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'}
                  keyboardType="number-pad"
                  maxLength={6}
                  style={{ flex: 1, paddingVertical: 12, color: theme.onSurface, fontSize: 20, letterSpacing: 6, fontWeight: '700' }}
                />
              </View>
              <TouchableOpacity
                onPress={handleResend}
                disabled={isResending}
                style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}
              >
                <RefreshCw size={12} color={colors.ventureroot.industrial.primary} style={{ marginRight: 6 }} />
                <IndustrialText style={{ fontSize: 12, color: colors.ventureroot.industrial.primary, fontWeight: '600' }}>
                  {isResending ? 'Resending…' : "Didn't get it? Resend code"}
                </IndustrialText>
              </TouchableOpacity>
            </>
          )}

          {/* New password */}
          <IndustrialText variant="label" style={{ marginBottom: 8, opacity: 0.6 }}>
            NEW PASSWORD
          </IndustrialText>
          <View
            style={{
              flexDirection: 'row', alignItems: 'center',
              backgroundColor: theme.surfaceLow,
              borderWidth: 1, borderColor: theme.outline,
              borderRadius: 12, paddingHorizontal: 16, marginBottom: 12,
            }}
          >
            <Lock size={18} color={colors.ventureroot.industrial.primary} style={{ marginRight: 12 }} />
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Min 8 chars, A-Z, 0-9, symbol"
              placeholderTextColor={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              style={{ flex: 1, paddingVertical: 12, color: theme.onSurface, fontSize: 14 }}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              {showPassword
                ? <EyeOff size={18} color={theme.onSurface} style={{ opacity: 0.4 }} />
                : <Eye size={18} color={theme.onSurface} style={{ opacity: 0.4 }} />}
            </TouchableOpacity>
          </View>

          {/* Strength checklist */}
          {password.length > 0 && (
            <View style={{ marginBottom: 16, gap: 6 }}>
              {strengthItems.map((item, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{
                    width: 16, height: 16, borderRadius: 8,
                    backgroundColor: item.met ? '#22C55E' : 'rgba(0,0,0,0.08)',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    {item.met && <IndustrialText style={{ fontSize: 10, color: '#fff', fontWeight: '800' }}>✓</IndustrialText>}
                  </View>
                  <IndustrialText style={{ fontSize: 12, opacity: item.met ? 1 : 0.4 }}>
                    {item.label}
                  </IndustrialText>
                </View>
              ))}
            </View>
          )}

          {/* Confirm password */}
          <IndustrialText variant="label" style={{ marginBottom: 8, opacity: 0.6 }}>
            CONFIRM PASSWORD
          </IndustrialText>
          <View
            style={{
              flexDirection: 'row', alignItems: 'center',
              backgroundColor: theme.surfaceLow,
              borderWidth: 1,
              borderColor: confirmPassword && confirmPassword !== password ? '#EF4444' : theme.outline,
              borderRadius: 12, paddingHorizontal: 16, marginBottom: spacing.md,
            }}
          >
            <Lock size={18} color={colors.ventureroot.industrial.primary} style={{ marginRight: 12 }} />
            <TextInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Repeat your password"
              placeholderTextColor={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              style={{ flex: 1, paddingVertical: 12, color: theme.onSurface, fontSize: 14 }}
            />
          </View>

          <IndustrialButton
            title={isLoading ? 'UPDATING...' : 'SET NEW PASSWORD'}
            onPress={handleReset}
            disabled={isLoading || !canSubmit}
          />
        </IndustrialCard>
      </View>
    </IndustrialPage>
  );
};

export default ResetPasswordScreen;
