import React, { useState } from 'react';
import { Alert, TextInput, TouchableOpacity, View, ScrollView, useColorScheme } from 'react-native';
import type { RootStackScreenProps } from '@/navigation/types';
import { supabase } from '@/lib/supabase';
import { useUserProfileStore } from '@/store/userProfileStore';
import { useOnboardingStore } from '@/store/onboardingStore';
import { IndustrialPage, IndustrialText, IndustrialButton, IndustrialCard, useIndustrialTheme } from '@/components/ui/IndustrialComponents';
import { ArrowLeft, Mail, Lock, User, Phone } from 'lucide-react-native';
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

const RegisterScreen = ({ navigation }: RootStackScreenProps<'Register'>) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const theme = useIndustrialTheme();
  const isDark = useColorScheme() === 'dark';

  const getErrorMessage = (err: any) =>
    String(err?.message || err?.error_description || '').toLowerCase();

  const handleRegister = async () => {
    const normalizedName = fullName.trim();
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPhone = phone.trim();
    const normalizedPassword = password.trim();
    const normalizedConfirmPassword = confirmPassword.trim();

    if (!normalizedName || !normalizedEmail || !normalizedPassword || !normalizedConfirmPassword || !normalizedPhone) {
      Alert.alert('Missing fields', 'Fill all registration fields.');
      return;
    }
    if (normalizedPassword.length < 8) {
      Alert.alert('Weak password', 'Password must be at least 8 characters.');
      return;
    }
    if (!/[A-Z]/.test(normalizedPassword)) {
      Alert.alert('Weak password', 'Include at least one uppercase letter (A–Z).');
      return;
    }
    if (!/[0-9]/.test(normalizedPassword)) {
      Alert.alert('Weak password', 'Include at least one number (0–9).');
      return;
    }
    if (!/[^A-Za-z0-9]/.test(normalizedPassword)) {
      Alert.alert('Weak password', 'Include at least one special character (!, @, #, $ …).');
      return;
    }
    if (normalizedPassword !== normalizedConfirmPassword) {
      Alert.alert('Password mismatch', 'Confirm password does not match.');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password: normalizedPassword,
        options: {
          data: {
            full_name: normalizedName,
            phone: normalizedPhone,
          },
        },
      });

      if (error) {
        const signUpError = getErrorMessage(error);
        if (signUpError.includes('already registered')) {
          Alert.alert('Account exists', 'Email already registered. Please sign in.');
          navigation.replace('Login');
          return;
        }
        throw error;
      }

      if (!data.session) {
        Alert.alert('Account created', 'Please check your email for confirmation, then sign in.');
        navigation.replace('Login');
        return;
      }

      // Clear any stale persisted state from a previous user so
      // RootNavigator sees accountType=null and routes to RoleSelection.
      useUserProfileStore.getState().clear();
      useOnboardingStore.getState().resetOnboarding();
    } catch (error: any) {
      Alert.alert('Registration failed', error.message || 'Could not create account.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <IndustrialPage>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 40 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginBottom: 32 }}>
          <ArrowLeft size={24} color={theme.onSurface} />
        </TouchableOpacity>

        <View style={{ marginBottom: 40 }}>
          <IndustrialText variant="label" style={{ color: colors.ventureroot.industrial.primary, marginBottom: 8 }}>
            JOIN VENTUREROOT
          </IndustrialText>
          <IndustrialText variant="h1">
            CREATE{"\n"}ACCOUNT
          </IndustrialText>
          <View style={{ width: 40, height: 4, backgroundColor: colors.ventureroot.industrial.primary, marginTop: 16 }} />
        </View>

        <IndustrialCard variant="low" style={{ padding: 24 }}>
          <InputField 
            label="FULL NAME" 
            value={fullName} 
            onChangeText={setFullName} 
            placeholder="Legal Name" 
            icon={User} 
            theme={theme}
            isDark={isDark}
          />
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
          <InputField 
            label="PHONE NUMBER" 
            value={phone} 
            onChangeText={setPhone} 
            placeholder="+234 ..." 
            icon={Phone} 
            keyboardType="phone-pad"
            theme={theme}
            isDark={isDark}
          />
          <InputField
            label="PASSWORD"
            value={password}
            onChangeText={setPassword}
            placeholder="Min 8 chars, A-Z, 0-9, symbol"
            icon={Lock}
            secure={!showPassword}
            autoCapitalize="none"
            theme={theme}
            isDark={isDark}
          />
          <InputField
            label="CONFIRM PASSWORD" 
            value={confirmPassword} 
            onChangeText={setConfirmPassword} 
            placeholder="••••••••" 
            icon={Lock} 
            secure={!showPassword}
            autoCapitalize="none"
            theme={theme}
            isDark={isDark}
          />

          <View style={{ marginTop: 12 }}>
            <IndustrialButton 
              title={isLoading ? "REGISTERING..." : "REGISTER"} 
              onPress={handleRegister} 
              disabled={isLoading}
            />
          </View>
        </IndustrialCard>

        <TouchableOpacity 
          onPress={() => navigation.replace('Login')}
          style={{ marginTop: 24, padding: 16, alignItems: 'center' }}
        >
          <IndustrialText variant="label" style={{ opacity: 0.4 }}>
            ALREADY HAVE AN ACCOUNT? <IndustrialText variant="label" style={{ color: colors.ventureroot.industrial.primary }}>SIGN IN</IndustrialText>
          </IndustrialText>
        </TouchableOpacity>
      </ScrollView>
    </IndustrialPage>
  );
};

export default RegisterScreen;
