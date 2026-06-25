import React, { useState } from 'react';
import { Alert, TextInput, TouchableOpacity, View, useColorScheme } from 'react-native';
import type { RootStackScreenProps } from '@/navigation/types';
import { supabase } from '@/lib/supabase';
import { resolveAuthSnapshot } from '@/lib/authRouting';
import { IndustrialPage, IndustrialText, IndustrialButton, IndustrialCard, useIndustrialTheme } from '@/components/ui/IndustrialComponents';
import { ArrowLeft, Mail, Lock } from 'lucide-react-native';
import { colors, spacing } from '@/theme/colors';

const InputField = ({ label, value, onChangeText, placeholder, icon: Icon, secure, keyboardType, autoCapitalize, theme, isDark }: any) => (
  <View style={{ marginBottom: spacing.md }}>
    <IndustrialText variant="label" style={{ marginBottom: 8, opacity: 0.6 }}>{label}</IndustrialText>
    <View style={{ 
      flexDirection: 'row', 
      alignItems: 'center', 
      backgroundColor: theme.surfaceLow,
      borderWidth: 1,
      borderColor: theme.outline,
      borderRadius: 12,
      paddingHorizontal: 16
    }}>
      <Icon size={18} color={colors.ventureroot.industrial.primary} style={{ marginRight: 12 }} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'}
        secureTextEntry={secure}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        style={{ flex: 1, paddingVertical: 12, color: theme.onSurface, fontSize: 14 }}
      />
    </View>
  </View>
);

const LoginScreen = ({ navigation }: RootStackScreenProps<'Login'>) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const theme = useIndustrialTheme();
  const isDark = useColorScheme() === 'dark';

  const handleLogin = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPassword = password.trim();

    if (!normalizedEmail || !normalizedPassword) {
      Alert.alert('Missing fields', 'Enter your email and password.');
      return;
    }

    setIsLoading(true);
    try {
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: normalizedPassword,
      });

      if (loginError) throw loginError;

      // Session is now active — RootNavigator will auto-switch to the
      // correct branch (RoleSelection if no accountType, Main if returning user).
      // Restore accountType from DB for returning users.
      const snapshot = await resolveAuthSnapshot();
    } catch (error: any) {
      Alert.alert('Login failed', error.message || 'Could not sign in.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert('Email required', 'Please enter your email address first.');
      return;
    }
    
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: 'https://ventureroot.com/reset-password',
      });
      if (error) throw error;
      Alert.alert('Recovery Sent', 'Check your email for the password reset link.');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Could not send recovery email.');
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
            SECURE ACCESS
          </IndustrialText>
          <IndustrialText variant="h1">
            WELCOME{"\n"}BACK
          </IndustrialText>
          <View style={{ width: 40, height: 4, backgroundColor: colors.ventureroot.industrial.primary, marginTop: 16 }} />
        </View>

        <IndustrialCard variant="low" style={{ padding: 24 }}>
          <InputField 
            label="EMAIL ADDRESS" 
            value={email} 
            onChangeText={setEmail} 
            placeholder="you@domain.com" 
            icon={Mail} 
            keyboardType="email-address"
            autoCapitalize="none"
            theme={theme}
            isDark={isDark}
          />
          <View>
            <InputField 
              label="PASSWORD" 
              value={password} 
              onChangeText={setPassword} 
              placeholder="••••••••" 
              icon={Lock} 
              secure={!showPassword}
              autoCapitalize="none"
              theme={theme}
              isDark={isDark}
            />
            <TouchableOpacity 
              onPress={handleForgotPassword}
              style={{ alignSelf: 'flex-end', marginTop: -spacing.sm, marginBottom: spacing.md }}
            >
              <IndustrialText variant="label" style={{ fontSize: 10, color: colors.ventureroot.industrial.primary }}>
                FORGOT PASSWORD?
              </IndustrialText>
            </TouchableOpacity>
          </View>

          <View style={{ marginTop: 12 }}>
            <IndustrialButton 
              title={isLoading ? "SIGNING IN..." : "SIGN IN"} 
              onPress={handleLogin} 
              disabled={isLoading}
            />
          </View>
        </IndustrialCard>

        <TouchableOpacity 
          onPress={() => navigation.navigate('Register')}
          style={{ marginTop: 24, padding: 16, alignItems: 'center' }}
        >
          <IndustrialText variant="label" style={{ opacity: 0.4 }}>
            NEW TO VENTUREROOT? <IndustrialText variant="label" style={{ color: colors.ventureroot.industrial.primary }}>CREATE ACCOUNT</IndustrialText>
          </IndustrialText>
        </TouchableOpacity>
      </View>
    </IndustrialPage>
  );
};

export default LoginScreen;
