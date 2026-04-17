import "./src/styles/global.css";
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import SimpleNavigator from './src/navigation/SimpleNavigator';
import { AuthProvider } from './src/context/AuthContext';
import { OnboardingProvider } from './src/context/OnboardingContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppErrorBoundary from './src/components/AppErrorBoundary';
import { installGlobalErrorHandler } from './src/lib/errorLogger';

installGlobalErrorHandler();

export default function App() {
  return (
    <AppErrorBoundary>
      <SafeAreaProvider>
        <AuthProvider>
          <OnboardingProvider>
            <StatusBar style="auto" />
            <SimpleNavigator />
          </OnboardingProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </AppErrorBoundary>
  );
}
