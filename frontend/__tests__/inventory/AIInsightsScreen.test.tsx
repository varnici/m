import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AIInsightsScreen from '../../src/screens/inventory/AIInsightsScreen';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
  useRoute: () => ({ params: {} }),
}));

describe('AIInsightsScreen', () => {
  it('renders intelligence metrics correctly', async () => {
    const { getByText } = render(<AIInsightsScreen />, { wrapper });
    
    // Check for core sections
    await waitFor(() => {
      expect(getByText(/AI Insights/i)).toBeTruthy();
      expect(getByText(/Restock Recommendations/i)).toBeTruthy();
      expect(getByText(/Demand Forecast/i)).toBeTruthy();
    });
  });
});
