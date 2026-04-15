import "./src/styles/global.css";
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import RootNavigator from './src/navigation/RootNavigator';
import { AuthProvider } from './src/context/AuthContext';
import { OnboardingProvider } from './src/context/OnboardingContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function App() {
  return (
    <NavigationContainer>
      <SafeAreaProvider>
        <AuthProvider>
          <OnboardingProvider>
            <StatusBar style="auto" />
            <RootNavigator />
          </OnboardingProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </NavigationContainer>
  );
}
