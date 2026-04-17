import React, { useState } from 'react';
import { Alert, StatusBar, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RootStackScreenProps } from '@/navigation/types';
import { supabase } from '@/lib/supabase';
import { getPostAuthRoute } from '@/lib/authRouting';

const RegisterScreen = ({ navigation }: RootStackScreenProps<'Register'>) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const getErrorMessage = (err: any) =>
    String(err?.message || err?.error_description || '').toLowerCase();

  const handleRegister = async () => {
    const normalizedName = fullName.trim();
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPassword = password.trim();
    const normalizedConfirmPassword = confirmPassword.trim();

    if (!normalizedName || !normalizedEmail || !normalizedPassword || !normalizedConfirmPassword) {
      Alert.alert('Missing fields', 'Fill all registration fields.');
      return;
    }
    if (normalizedPassword.length < 6) {
      Alert.alert('Weak password', 'Password should be at least 6 characters.');
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
          },
        },
      });

      if (error) {
        const signUpError = getErrorMessage(error);

        if (signUpError.includes('already registered')) {
          Alert.alert(
            'Account already exists',
            'This email is already registered. Please sign in.',
          );
          navigation.replace('Login');
          return;
        }

        if (signUpError.includes('rate limit')) {
          Alert.alert(
            'Email rate limit',
            'Too many signup attempts. Please wait, then use Login.',
          );
          navigation.replace('Login');
          return;
        }

        throw error;
      }

      if (!data.session) {
        Alert.alert(
          'Account created',
          'Please sign in with your email and password.',
        );
        navigation.replace('Login');
        return;
      }

      const nextRoute = await getPostAuthRoute();
      navigation.replace(nextRoute);
    } catch (error: any) {
      Alert.alert('Registration failed', error.message || 'Could not create account.');
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
        <Text className="text-white text-3xl font-bold mb-2">Create Account</Text>
        <Text className="text-emerald-100 mb-8">Register and continue onboarding.</Text>

        <View className="bg-white rounded-2xl p-5">
          <Text className="text-slate-700 font-semibold mb-2">Full Name</Text>
          <TextInput
            value={fullName}
            onChangeText={setFullName}
            placeholder="Your full name"
            className="border border-slate-300 rounded-xl px-4 py-3 mb-4"
          />

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
          <View className="border border-slate-300 rounded-xl px-4 py-3 mb-4 flex-row items-center">
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Create password"
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

          <Text className="text-slate-700 font-semibold mb-2">Confirm Password</Text>
          <View className="border border-slate-300 rounded-xl px-4 py-3 mb-5 flex-row items-center">
            <TextInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm password"
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
              className="flex-1"
            />
            <TouchableOpacity onPress={() => setShowConfirmPassword((prev) => !prev)}>
              <Text className="text-ventureroot-green font-semibold">
                {showConfirmPassword ? 'Hide' : 'Show'}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={handleRegister}
            disabled={isLoading}
            className={`rounded-xl py-4 items-center ${isLoading ? 'bg-slate-400' : 'bg-ventureroot-green'}`}
          >
            <Text className="text-white font-bold text-base">
              {isLoading ? 'Creating account...' : 'Create Account'}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => navigation.replace('Login')} className="mt-6">
          <Text className="text-white text-center">
            Already registered? <Text className="font-bold">Sign in</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default RegisterScreen;
