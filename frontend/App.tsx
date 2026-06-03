import "./src/styles/global.css";
import 'react-native-gesture-handler';
import React from 'react';
import { LogBox } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import RootNavigator from './src/navigation/RootNavigator';
import { AuthProvider } from './src/context/AuthContext';
import { OnboardingProvider } from './src/context/OnboardingContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppErrorBoundary from './src/components/AppErrorBoundary';
import { installGlobalErrorHandler } from './src/lib/errorLogger';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

installGlobalErrorHandler();

// Bypass React Native 0.81 Fabric DevTools context proxy noise during startup.
LogBox.ignoreLogs([
  "Couldn't find a navigation context",
]);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppErrorBoundary>
        <GestureHandlerRootView style={{ flex: 1 }}>
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
        </GestureHandlerRootView>
      </AppErrorBoundary>
    </QueryClientProvider>
  );
}
