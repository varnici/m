import "./src/styles/global.css";
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import RootNavigator from './src/navigation/RootNavigator';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider } from './src/context/AuthContext';
import { OnboardingProvider } from './src/context/OnboardingContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function App() {
  console.log("App mounted");
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <OnboardingProvider>
          <NavigationContainer>
            <StatusBar style="auto" />
            <RootNavigator />
          </NavigationContainer>
        </OnboardingProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
