import React, { useState } from 'react';
import { Alert, StatusBar, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RootStackScreenProps } from '@/navigation/types';
import { supabase } from '@/lib/supabase';
import { fetchPostLoginData, getPostAuthRoute } from '@/lib/authRouting';

const LoginScreen = ({ navigation }: RootStackScreenProps<'Login'>) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPassword = password.trim();

    if (!normalizedEmail || !normalizedPassword) {
      Alert.alert('Missing fields', 'Enter your email and password.');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: normalizedPassword,
      });

      if (error) throw error;
      const snapshot = await fetchPostLoginData();
      console.log('[AuthCheck] post-login data:', {
        userId: snapshot.user?.id ?? null,
        hasProfile: !!snapshot.profile,
        hasBusiness: !!snapshot.business,
        onboardingCompletedAt: snapshot.business?.onboarding_completed_at ?? null,
        error: snapshot.error,
      });
      const nextRoute = await getPostAuthRoute();
      navigation.replace(nextRoute as any);
    } catch (error: any) {
      Alert.alert('Login failed', error.message || 'Could not sign in.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-ventureroot-green">
      <StatusBar barStyle="light-content" />

      <View className="px-6 pt-10">
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text className="text-white font-semibold">Back</Text>
        </TouchableOpacity>
      </View>

      <View className="flex-1 justify-center px-6">
        <Text className="text-white text-3xl font-bold mb-2">Welcome Back</Text>
        <Text className="text-emerald-100 mb-8">Sign in to continue to your account.</Text>

        <View className="bg-white rounded-2xl p-5">
          <Text className="text-slate-700 font-semibold mb-2">Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            className="border border-slate-300 rounded-xl px-4 py-3 mb-4"
          />

          <Text className="text-slate-700 font-semibold mb-2">Password</Text>
          <View className="border border-slate-300 rounded-xl px-4 py-3 mb-5 flex-row items-center">
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Your password"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              className="flex-1"
            />
            <TouchableOpacity onPress={() => setShowPassword((prev) => !prev)}>
              <Text className="text-ventureroot-green font-semibold">
                {showPassword ? 'Hide' : 'Show'}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={handleLogin}
            disabled={isLoading}
            className={`rounded-xl py-4 items-center ${isLoading ? 'bg-slate-400' : 'bg-ventureroot-green'}`}
          >
            <Text className="text-white font-bold text-base">
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => navigation.navigate('Register')} className="mt-6">
          <Text className="text-white text-center">
            No account yet? <Text className="font-bold">Create one</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default LoginScreen;
