/* eslint-disable no-undef */
// Jest setup for React Native testing
import '@testing-library/jest-native/extend-expect';

// Mock Expo modules
jest.mock('expo-location', () => ({
  getCurrentPositionAsync: jest.fn(),
  requestForegroundPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  Accuracy: { Highest: 6 },
}));

jest.mock('expo-asset', () => ({
  Asset: { fromModule: jest.fn(() => ({ downloadAsync: jest.fn() })) },
}));

jest.mock('lottie-react-native', () => 'LottieView');

// Mock Mapbox
jest.mock('@rnmapbox/maps', () => ({
  MapView: 'MapView',
  Camera: 'Camera',
  PointAnnotation: 'PointAnnotation',
  UserLocation: 'UserLocation',
  setAccessToken: jest.fn(),
  setWellKnownTileServer: jest.fn(),
  setTelemetryEnabled: jest.fn(),
  StyleURL: { Street: 'mapbox://styles/mapbox/streets-v12' },
}));

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

// Mock lucide-react-native icons
jest.mock('lucide-react-native', () => ({
  ChevronLeft: () => null,
  MapPin: () => null,
  Users: () => null,
  ShieldCheck: () => null,
}));

// Suppress console warnings
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (typeof args[0] === 'string' && args[0].includes('RCTRootViewControllerProvider')) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});
