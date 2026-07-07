import React, { useState, useEffect } from 'react';
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

const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_COOLDOWN_MS = 60_000; // 1 minute

const LoginScreen = ({ navigation }: RootStackScreenProps<'Login'>) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const theme = useIndustrialTheme();
  const isDark = useColorScheme() === 'dark';

  // Countdown tick for login cooldown
  useEffect(() => {
    if (!cooldownUntil) return;
    const tick = () => {
      const remaining = Math.ceil((cooldownUntil - Date.now()) / 1000);
      if (remaining <= 0) {
        setCooldownSeconds(0);
        setCooldownUntil(null);
        setLoginAttempts(0);
      } else {
        setCooldownSeconds(remaining);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [cooldownUntil]);

  const isCoolingDown = cooldownSeconds > 0;

  const handleLogin = async () => {
    if (isCoolingDown) {
      Alert.alert('Too many attempts', `Wait ${cooldownSeconds}s before trying again.`);
      return;
    }

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

      if (loginError) {
        const next = loginAttempts + 1;
        setLoginAttempts(next);
        if (next >= MAX_LOGIN_ATTEMPTS) {
          setCooldownUntil(Date.now() + LOGIN_COOLDOWN_MS);
          Alert.alert(
            'Account temporarily locked',
            `Too many failed attempts. Wait 60 seconds before trying again.`
          );
        } else {
          const left = MAX_LOGIN_ATTEMPTS - next;
          Alert.alert(
            'Login failed',
            `${loginError.message || 'Could not sign in.'}\n${left} attempt${left === 1 ? '' : 's'} remaining.`
          );
        }
        return;
      }

      setLoginAttempts(0);
      setCooldownUntil(null);
      await resolveAuthSnapshot();
    } catch (error: any) {
      Alert.alert('Login failed', error.message || 'Could not sign in.');
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
              onPress={() => navigation.navigate('ForgotPassword')}
              style={{ alignSelf: 'flex-end', marginTop: -spacing.sm, marginBottom: spacing.md }}
            >
              <IndustrialText variant="label" style={{ fontSize: 10, color: colors.ventureroot.industrial.primary }}>
                FORGOT PASSWORD?
              </IndustrialText>
            </TouchableOpacity>
          </View>

          <View style={{ marginTop: 12 }}>
            <IndustrialButton
              title={isLoading ? "SIGNING IN..." : isCoolingDown ? `WAIT ${cooldownSeconds}s` : "SIGN IN"}
              onPress={handleLogin}
              disabled={isLoading || isCoolingDown}
            />
          </View>
        </IndustrialCard>

        <TouchableOpacity
          onPress={() => navigation.navigate('EmailEntry')}
          style={{ marginTop: 16, padding: 12, alignItems: 'center' }}
        >
          <IndustrialText variant="label" style={{ opacity: 0.5, fontSize: 11 }}>
            FORGOT PASSWORD? <IndustrialText variant="label" style={{ color: colors.ventureroot.industrial.primary, fontSize: 11 }}>SIGN IN WITH EMAIL CODE</IndustrialText>
          </IndustrialText>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate('Register')}
          style={{ marginTop: 8, padding: 16, alignItems: 'center' }}
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
